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
  // Rotation is less pronounced for the geometric look
  const rotate = useTransform(x, [-200, 200], [-5, 5]);

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
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: "grabbing" }}
    >
      {/* Container with sharp edges and thick white border */}
      <div className="relative w-full max-w-sm h-[70vh] parallelogram-shape bg-black border-4 border-white overflow-hidden shadow-[10px_10px_0px_rgba(255,255,255,0.2)]">
        {/* Main Image */}
        <div
          className="absolute inset-0 bg-cover bg-center pointer-events-none grayscale contrast-125 brightness-75"
          style={{ backgroundImage: `url(${imageUrl})` }}
        >
          {/* Stark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />
        </div>

        {/* Swipe Overlays */}
        <motion.div
          className="absolute inset-0 bg-black/60 pointer-events-none flex items-center justify-center"
          style={{ opacity: opacityLeft }}
        >
          <span className="text-white text-5xl font-bold border-4 border-white parallelogram-shape px-6 py-3 tracking-widest bg-black">
            NOPE
          </span>
        </motion.div>
        <motion.div
          className="absolute inset-0 bg-white/30 pointer-events-none flex items-center justify-center"
          style={{ opacity: opacityRight }}
        >
          <span className="text-black text-5xl font-bold border-4 border-black parallelogram-shape px-6 py-3 tracking-widest bg-white">
            LIKE
          </span>
        </motion.div>

        {/* Card Info (Stark Monochrome Bottom Section) */}
        <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col gap-4 pointer-events-none">
          <div>
            <h2 className="text-4xl font-bold text-white uppercase tracking-wider">{name}</h2>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 parallelogram-shape bg-white text-black w-fit">
            <span className="text-black font-bold uppercase tracking-widest text-sm">{status}</span>
          </div>

          <div className="bg-black border-2 border-white p-3 flex items-center gap-3">
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-8 h-8 parallelogram-shape border border-white overflow-hidden bg-black">
                  <img src={`https://rickandmortyapi.com/api/character/avatar/${i + 10}.jpeg`} alt="friend" className="w-full h-full object-cover grayscale" />
                </div>
              ))}
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold text-xs uppercase flex items-center gap-1 tracking-wider">
                <Users size={14} /> ОБЩИХ ДРУЗЕЙ: {commonFriendsCount}
              </span>
              <span className="text-white/70 text-[10px] uppercase tracking-widest">ВЕРОЯТНО ЗНАКОМЫ</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
