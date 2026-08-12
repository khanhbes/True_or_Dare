import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Heart, Flame, Sparkles, Volume2, VolumeX, BookOpen, Play, HelpCircle, UserRound, Code2 } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface IntroScreenProps {
  mode: 'player' | 'developer';
  onModeChange: (mode: 'player' | 'developer') => void;
  onStart: () => void;
  onOpenCollection: () => void;
  onOpenRules: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ mode, onModeChange, onStart, onOpenCollection, onOpenRules }) => {
  const [isMusicOn, setIsMusicOn] = useState(soundEngine.isMusicOn());

  const handleToggleMusic = () => {
    const newState = soundEngine.toggleBackgroundMusic();
    setIsMusicOn(newState);
  };

  return (
    <div className="relative z-10 flex flex-col items-center justify-between min-h-[90vh] px-4 py-8 max-w-4xl mx-auto text-center">
      {/* Top Header Bar with Music & Collection controls */}
      <div className="w-full px-2 py-1">
        <div className="flex items-center justify-between gap-2">
          <button
          onClick={handleToggleMusic}
          className="flex min-h-11 items-center gap-2 rounded-full border border-rose-500/30 bg-rose-950/40 px-3 text-xs text-rose-200 transition-all duration-300 hover:border-rose-400 md:text-sm"
        >
          {isMusicOn ? <Volume2 className="w-4 h-4 text-amber-400 animate-pulse" /> : <VolumeX className="w-4 h-4 text-neutral-400" />}
          <span>{isMusicOn ? 'Nhạc lãng mạn: Bật' : 'Nhạc nền: Tắt'}</span>
          </button>

          <button
          onClick={onOpenCollection}
          className="flex min-h-11 items-center gap-2 rounded-full border border-amber-500/30 bg-amber-950/40 px-3 text-xs text-amber-200 transition-all duration-300 hover:border-amber-400 md:text-sm"
        >
          <BookOpen className="w-4 h-4 text-amber-400" />
            <span className="hidden min-[370px]:inline">Bộ sưu tập thẻ</span>
          </button>
        </div>

        <div className="mx-auto mt-3 grid w-full max-w-xs grid-cols-2 rounded-full border border-white/10 bg-black/25 p-1" role="group" aria-label="Chọn chế độ ứng dụng">
          {([
            { id: 'player' as const, label: 'Player', icon: UserRound },
            { id: 'developer' as const, label: 'Developer', icon: Code2 },
          ]).map(({ id, label, icon: ModeIcon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={mode === id}
              onClick={() => onModeChange(id)}
              className={`flex min-h-10 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold transition ${mode === id ? 'bg-rose-500/18 text-rose-100 shadow-[0_0_0_1px_rgba(251,113,133,.4)]' : 'text-neutral-500 hover:text-white'}`}
            >
              <ModeIcon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Center Intro Section */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.92, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center my-auto py-8"
      >
        {/* Animated Candle Flame Icon */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-b from-amber-500/20 via-rose-500/10 to-transparent flex items-center justify-center animate-candle-glow">
            <Flame className="w-10 h-10 text-amber-400 drop-shadow-[0_0_12px_rgba(212,175,55,0.8)]" />
          </div>
          <Sparkles className="w-5 h-5 text-rose-300 absolute -top-1 -right-1 animate-pulse" />
        </div>

        {/* Title */}
        <h1 className="serif-title text-5xl sm:text-7xl md:text-8xl font-bold tracking-widest text-[#D4AF37] uppercase mb-3 drop-shadow-[0_0_15px_rgba(212,175,55,0.4)]">
          Truth or Dare
        </h1>
        <p className="serif-title text-xl sm:text-2xl text-[#FF6B9D] pink-glow italic font-medium mb-4">
          Dành Cho Cặp Đôi • Sự Thật Hay Thách
        </p>

        <p className="text-neutral-300 max-w-lg text-sm sm:text-base leading-relaxed font-light mb-8">
          {mode === 'player'
            ? 'Khám phá từng lá bài qua những câu hỏi gắn kết và thử thách dành riêng cho hai người.'
            : 'Quản lý toàn bộ nội dung, xem trước thẻ khóa và chỉnh sửa bộ bài dành cho người chơi.'}
        </p>

        {/* Level Badges Preview */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-10">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs sm:text-sm">
            <span>🌸</span>
            <span>Nhẹ nhàng</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-950/50 border border-amber-500/30 text-amber-300 text-xs sm:text-sm">
            <span>🔥</span>
            <span>Thân mật</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-950/50 border border-red-500/40 text-red-300 text-xs sm:text-sm">
            <span>💋</span>
            <span>Nồng nhiệt</span>
          </div>
        </div>

        {/* Big Action Play Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            soundEngine.playCardFlip();
            onStart();
          }}
          className="relative group px-10 py-4 rounded-full font-medium text-base sm:text-lg text-neutral-900 bg-gold-gradient shadow-[0_0_25px_rgba(212,175,55,0.4)] hover:shadow-[0_0_35px_rgba(255,107,157,0.6)] transition-all duration-300 flex items-center gap-3 cursor-pointer"
        >
          {mode === 'player' ? <Play className="w-5 h-5 fill-neutral-900" /> : <Code2 className="h-5 w-5" />}
          <span className="font-semibold tracking-wide">{mode === 'player' ? 'Bắt Đầu Chơi' : 'Mở Trình Quản Lý'}</span>
          <Heart className="w-5 h-5 text-rose-900 fill-rose-900 group-hover:scale-125 transition-transform" />
        </motion.button>

        <button
          type="button"
          onClick={() => {
            soundEngine.playTick();
            onOpenRules();
          }}
          className="mt-4 flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium text-neutral-300 transition-all hover:bg-white/[0.04] hover:text-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
        >
          <HelpCircle className="h-4 w-4 text-rose-300" />
          <span>Cách chơi & luật phạt</span>
        </button>
      </motion.div>

      {/* Footer tagline */}
      <div className="text-xs text-neutral-500 font-light flex items-center gap-1">
        <span>Thiết kế dành riêng cho 2 người</span>
        <span className="text-rose-500">♥</span>
        <span>Giữ trọn cảm xúc ngọt ngào</span>
      </div>
    </div>
  );
};
