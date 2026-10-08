import { useState, useEffect, useRef, useCallback } from "react";
import { ref, set, push, onValue, off, update, get, onChildAdded } from "firebase/database";
import { auth, db } from "../firebase";
import { getAvatarColor, getInitials, formatCallDuration, playRingSound, stopRingSound, ICE_SERVERS } from "../types";

interface CallModalProps {
  otherUserId: string;
  otherUserName: string;
  otherUserPhoto: string;
  isOutgoing: boolean;
  callType: "voice" | "video";
  onEnd: (duration: number) => void;
}

export default function CallModal({ otherUserId, otherUserName, otherUserPhoto, isOutgoing, callType, onEnd }: CallModalProps) {
  const [callState, setCallState] = useState<"ringing" | "connecting" | "connected" | "ended">("ringing");
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callIdRef = useRef<string | null>(null);
  const durationRef = useRef(0);
  const ringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unsubFns = useRef<(() => void)[]>([]);
  const endedRef = useRef(false);
  const currentUser = auth.currentUser;

  const cleanup = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    stopRingSound();
    if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    unsubFns.current.forEach((fn) => fn());
    unsubFns.current = [];
    // Update call status
    if (callIdRef.current) {
      update(ref(db, `calls/${callIdRef.current}`), { status: "ended", endedAt: Date.now() }).catch(() => {});
    }
    onEnd(durationRef.current);
  }, [onEnd]);

  const endCall = () => {
    setCallState("ended");
    setTimeout(() => cleanup(), 300);
  };

  const declineCall = () => {
    if (callIdRef.current) {
      update(ref(db, `calls/${callIdRef.current}`), { status: "declined" }).catch(() => {});
    }
    cleanup();
  };

  // Timer
  useEffect(() => {
    if (callState === "connected") {
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setDuration(durationRef.current);
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callState]);

  // Ring sound loop for outgoing
  useEffect(() => {
    if (isOutgoing && callState === "ringing") {
      playRingSound();
      ringIntervalRef.current = setInterval(() => playRingSound(), 4000);
    }
    return () => { if (ringIntervalRef.current) clearInterval(ringIntervalRef.current); };
  }, [isOutgoing, callState]);

  // Main WebRTC setup
  useEffect(() => {
    if (!otherUserId || !currentUser) return;
    let cancelled = false;

    const setup = async () => {
      try {
        // Get local media
        const constraints: MediaStreamConstraints = callType === "video"
          ? { audio: true, video: { width: 640, height: 480, facingMode: "user" } }
          : { audio: true, video: false };

        const localStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) { localStream.getTracks().forEach(t => t.stop()); return; }
        localStreamRef.current = localStream;
        if (localVideoRef.current && callType === "video") {
          localVideoRef.current.srcObject = localStream;
        }

        // Create peer connection
        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;

        const remoteStream = new MediaStream();
        remoteStreamRef.current = remoteStream;
        if (remoteVideoRef.current && callType === "video") {
          remoteVideoRef.current.srcObject = remoteStream;
        }

        // Add local tracks to peer
        localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

        // When remote track arrives
        pc.ontrack = (event) => {
          event.streams[0].getTracks().forEach((track) => remoteStream.addTrack(track));
          setCallState("connected");
          stopRingSound();
        };

        // ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate && callIdRef.current && !endedRef.current) {
            push(ref(db, `calls/${callIdRef.current}/${isOutgoing ? "callerCandidates" : "calleeCandidates"}`), event.candidate.toJSON());
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
            setCallState("connected");
            stopRingSound();
          }
          if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed" || pc.iceConnectionState === "closed") {
            if (!endedRef.current) {
              setCallState("ended");
              setTimeout(() => cleanup(), 1000);
            }
          }
        };

        if (isOutgoing) {
          await handleOutgoingCall(pc, localStream);
        } else {
          await handleIncomingCall(pc, localStream);
        }
      } catch (err: any) {
        console.error("Call setup error:", err);
        setCallState("ended");
        setTimeout(() => cleanup(), 1500);
      }
    };

    setup();
    return () => { cancelled = true; };
  }, [otherUserId, currentUser, isOutgoing, callType]);

  const handleOutgoingCall = async (pc: RTCPeerConnection, _stream: MediaStream) => {
    if (!currentUser) return;

    // Create call document
    const callRef = push(ref(db, "calls"));
    const callId = callRef.key!;
    callIdRef.current = callId;

    await set(callRef, {
      callerId: currentUser.uid,
      callerName: currentUser.displayName || "Пользователь",
      calleeId: otherUserId,
      callType,
      status: "ringing",
      createdAt: Date.now(),
    });

    // Create and set offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await update(ref(db, `calls/${callId}`), {
      offerSdp: pc.localDescription!.sdp,
      offerType: pc.localDescription!.type,
    });

    // Listen for answer
    const answerRef = ref(db, `calls/${callId}/answerSdp`);
    onValue(answerRef, (snap) => {
      const sdp = snap.val();
      if (sdp && pc.signalingState === "have-local-offer" && !endedRef.current) {
        pc.setRemoteDescription(new RTCSessionDescription({ sdp, type: "answer" }));
        setCallState("connecting");
      }
    });
    unsubFns.current.push(() => off(answerRef));

    // Listen for callee ICE candidates
    onChildAdded(ref(db, `calls/${callId}/calleeCandidates`), (snap) => {
      const c = snap.val();
      if (c && !endedRef.current) {
        pc.addIceCandidate(new RTCIceCandidate(c));
      }
    });
    unsubFns.current.push(() => off(ref(db, `calls/${callId}/calleeCandidates`)));

    // Listen for status changes (declined/ended)
    onValue(ref(db, `calls/${callId}/status`), (snap) => {
      const status = snap.val();
      if ((status === "declined" || status === "ended") && !endedRef.current) {
        setCallState("ended");
        stopRingSound();
        setTimeout(() => cleanup(), 1500);
      }
      if (status === "answered") {
        setCallState("connecting");
        stopRingSound();
      }
    });
    unsubFns.current.push(() => off(ref(db, `calls/${callId}/status`)));
  };

  const handleIncomingCall = async (pc: RTCPeerConnection, _stream: MediaStream) => {
    if (!currentUser) return;

    // Find the ringing call for this user
    const callsSnap = await get(ref(db, "calls"));
    const calls = callsSnap.val();
    if (!calls) return;

    let foundCallId: string | null = null;
    let offerSdp: string | null = null;
    let offerType: string | null = null;

    for (const [cid, call] of Object.entries(calls) as [string, any][]) {
      if (call.calleeId === currentUser.uid && call.status === "ringing") {
        foundCallId = cid;
        offerSdp = call.offerSdp;
        offerType = call.offerType || "offer";
        break;
      }
    }

    if (!foundCallId || !offerSdp) return;
    callIdRef.current = foundCallId;

    // Set remote description (offer)
    await pc.setRemoteDescription(new RTCSessionDescription({ sdp: offerSdp, type: offerType as RTCSdpType }));

    // Create and set answer
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await update(ref(db, `calls/${foundCallId}`), {
      answerSdp: pc.localDescription!.sdp,
      status: "answered",
    });

    setCallState("connecting");

    // Listen for caller ICE candidates
    onChildAdded(ref(db, `calls/${foundCallId}/callerCandidates`), (snap) => {
      const c = snap.val();
      if (c && !endedRef.current) {
        pc.addIceCandidate(new RTCIceCandidate(c));
      }
    });
    unsubFns.current.push(() => off(ref(db, `calls/${foundCallId}/callerCandidates`)));

    // Listen for call end
    onValue(ref(db, `calls/${foundCallId}/status`), (snap) => {
      const status = snap.val();
      if (status === "ended" && !endedRef.current) {
        setCallState("ended");
        setTimeout(() => cleanup(), 1500);
      }
    });
    unsubFns.current.push(() => off(ref(db, `calls/${foundCallId}/status`)));
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
      setIsVideoOff(!isVideoOff);
    }
  };

  const isVideo = callType === "video";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95">
      <div className="relative w-full h-full flex flex-col">
        {/* Remote video full screen */}
        {isVideo && <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover bg-black" />}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/80 pointer-events-none" />

        {/* Local video PIP */}
        {isVideo && (
          <div className="absolute top-16 right-4 w-[140px] h-[200px] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 z-10 bg-black">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
          </div>
        )}

        {/* Call info */}
        <div className="relative z-10 flex flex-col items-center pt-16 sm:pt-24">
          <div className="mb-4 animate-pulse">
            {otherUserPhoto ? (
              <img src={otherUserPhoto} className={`rounded-full object-cover shadow-2xl ${isVideo ? "w-28 h-28" : "w-36 h-36"}`} />
            ) : (
              <div className={`rounded-full flex items-center justify-center text-white font-bold shadow-2xl ${isVideo ? "w-28 h-28 text-4xl" : "w-36 h-36 text-5xl"}`} style={{ backgroundColor: getAvatarColor(otherUserId) }}>
                {getInitials(otherUserName)}
              </div>
            )}
          </div>

          <h2 className="text-white text-2xl font-semibold mb-2 drop-shadow-lg">{otherUserName}</h2>

          <p className="text-white/70 text-base">
            {callState === "ringing" && (isOutgoing ? "Вызов..." : callType === "video" ? "📹 Видеозвонок" : "🎤 Голосовой звонок")}
            {callState === "connecting" && "Подключение..."}
            {callState === "connected" && formatCallDuration(duration)}
            {callState === "ended" && "Звонок завершён"}
          </p>
        </div>

        {/* Controls */}
        <div className="relative z-10 mt-auto pb-12 flex flex-col items-center gap-8">
          {callState !== "ended" && (
            <div className="flex items-center gap-6">
              <button onClick={toggleMute} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMuted ? "bg-white text-red-500 scale-110" : "bg-white/20 text-white hover:bg-white/30"}`}>
                {isMuted ? (
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/></svg>
                ) : (
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
                )}
              </button>

              {isVideo && (
                <button onClick={toggleVideo} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isVideoOff ? "bg-white text-red-500 scale-110" : "bg-white/20 text-white hover:bg-white/30"}`}>
                  {isVideoOff ? (
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5z"/><path d="M3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/></svg>
                  ) : (
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                  )}
                </button>
              )}

              <button onClick={() => setIsSpeaker(!isSpeaker)} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isSpeaker ? "bg-white/40 text-white scale-110" : "bg-white/20 text-white hover:bg-white/30"}`}>
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  {isSpeaker ? (
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                  ) : (
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                  )}
                </svg>
              </button>
            </div>
          )}

          <div className="flex items-center gap-8">
            {/* Accept (incoming ringing) */}
            {!isOutgoing && callState === "ringing" && (
              <button onClick={() => setCallState("connecting")} className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/30 hover:bg-green-400 transition-all active:scale-95">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>
              </button>
            )}

            {/* End / Decline */}
            <button onClick={isOutgoing || callState !== "ringing" ? endCall : declineCall} className={`w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/30 hover:bg-red-400 transition-all active:scale-95 ${callState === "ringing" ? "animate-pulse" : ""}`}>
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor" style={{ transform: "rotate(135deg)" }}>
                <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
