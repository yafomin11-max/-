import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Users } from "lucide-react";

export interface SwipeCardProps {
  id: string;
  name: string;
  status: string;
  commonFriendsCount: number;
  imageUrl: string;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export default function SwipeCard({
  name,
  status,
  commonFriendsCount,
  imageUrl,
  onSwipeLeft,
  onSwipeRight,
}: SwipeCardProps) {
  const x = useMotionValue(0);

  // Opacity for the overlays indicating swipe action
  const opacityLeft = useTransform(x, [-100, -20], [1, 0]);
  const opacityRight = useTransform(x, [20, 100], [0, 1]);
  // Slight rotation based on swipe position
  const rotate = useTransform(x, [-200, 200], [-15, 15]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      onSwipeRight?.();
    } else if (info.offset.x < -threshold) {
      onSwipeLeft?.();
    }
  };

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center p-4 touch-none"
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9} // Provides the springy feel beyond constraints
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: "grabbing" }}
    >
      <div className="relative w-full max-w-sm h-[70vh] rounded-3xl overflow-hidden shadow-2xl glass-dark">
        {/* Main Image */}
        <div
          className="absolute inset-0 bg-cover bg-center pointer-events-none"
          style={{ backgroundImage: `url(${imageUrl})` }}
        >
          {/* Subtle gradient overlay to make text readable */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e1621] via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Swipe Overlays */}
        <motion.div
          className="absolute inset-0 bg-red-500/20 pointer-events-none flex items-center justify-center"
          style={{ opacity: opacityLeft }}
        >
          <span className="text-red-500 text-4xl font-bold border-4 border-red-500 rounded-xl px-4 py-2 rotate-[-15deg]">
            NOPE
          </span>
        </motion.div>
        <motion.div
          className="absolute inset-0 bg-green-500/20 pointer-events-none flex items-center justify-center"
          style={{ opacity: opacityRight }}
        >
          <span className="text-green-500 text-4xl font-bold border-4 border-green-500 rounded-xl px-4 py-2 rotate-[15deg]">
            LIKE
          </span>
        </motion.div>

        {/* Card Info (Glassmorphism Bottom Section) */}
        <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col gap-3 pointer-events-none">
          <div className="flex items-end gap-3">
            <h2 className="text-3xl font-bold text-white drop-shadow-md">{name}</h2>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 w-fit">
            <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
            <span className="text-green-400 text-sm font-medium">{status}</span>
          </div>

          <div className="glass mt-2 rounded-2xl p-3 flex items-center gap-3">
            <div className="flex -space-x-2">
              {/* Mock mini avatars */}
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0e1621] bg-gray-600 overflow-hidden">
                  <img src={`https://rickandmortyapi.com/api/character/avatar/${i + 10}.jpeg`} alt="friend" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <div className="flex flex-col">
              <span className="text-white/90 text-sm font-medium flex items-center gap-1">
                <Users size={14} /> У вас {commonFriendsCount} общих друга
              </span>
              <span className="text-white/50 text-xs">Вероятно знакомы</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
