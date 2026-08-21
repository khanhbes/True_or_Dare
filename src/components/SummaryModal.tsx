import React, { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Trophy, Heart, RotateCcw, X, CheckCircle2, Layers3, Star, Shuffle, TrendingUp } from 'lucide-react';
import { ClothingRemovalEvent, GameEndReason, IntimacyEvent, JourneyPhase, OutfitState, Player, PlayerRewardState, RewardEvent } from '../types';
import { getPresentGarmentSlots } from '../utils/wardrobe';

interface SummaryModalProps {
  player1: Player;
  player2: Player;
  totalRounds: number;
  favoritesCount: number;
  outfitStates?: [OutfitState, OutfitState];
  removalEvents?: ClothingRemovalEvent[];
  intimacyPercent?: number;
  luxuryIntimacyPercent?: number;
  intimacyEvents?: IntimacyEvent[];
  positionCardsRevealed?: number;
  journeyPhase?: JourneyPhase;
  playerRewards?: [PlayerRewardState, PlayerRewardState];
  rewardEvents?: RewardEvent[];
  onRestart: () => void;
  onClose: () => void;
  onHome?: () => void;
  terminal?: boolean;
  endReason?: GameEndReason | null;
}

const getInitialGarmentCount = (outfitState: OutfitState) =>
  Object.values(outfitState.initial.garments).filter(Boolean).length;

const getRemovalCount = (
  events: ClothingRemovalEvent[] | undefined,
  targetPlayerIndex: 0 | 1,
  source: ClothingRemovalEvent['source']
) => events?.filter(
  (event) => event.targetPlayerIndex === targetPlayerIndex && event.source === source && event.action !== 'transferred'
).length ?? 0;

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export const SummaryModal: React.FC<SummaryModalProps> = ({
  player1,
  player2,
  totalRounds,
  favoritesCount,
  outfitStates,
  removalEvents,
  intimacyPercent,
  luxuryIntimacyPercent = 0,
  intimacyEvents,
  positionCardsRevealed = 0,
  journeyPhase,
  playerRewards,
  rewardEvents,
  onRestart,
  onClose,
  onHome,
  terminal = false,
  endReason,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const totalCompleted = player1.completedCount + player2.completedCount;
  const legacyIntimacyScore = Math.min(100, Math.round((totalCompleted / Math.max(1, totalRounds)) * 100));
  const intimacyScore = intimacyPercent ?? legacyIntimacyScore;
  const cardGain = intimacyEvents
    ?.filter((event) => event.source === 'completed_card' && event.track !== 'luxury')
    .reduce((total, event) => total + event.amount, 0) ?? 0;
  const clothingGain = intimacyEvents
    ?.filter((event) => event.source === 'card_clothing_removal')
    .reduce((total, event) => total + event.amount, 0) ?? 0;
  const luxuryGain = intimacyEvents
    ?.filter((event) => event.source === 'completed_card' && event.track === 'luxury')
    .reduce((total, event) => total + event.amount, 0) ?? 0;
  const swapCount = Math.floor((removalEvents?.filter((event) => event.action === 'transferred').length ?? 0) / 2);
  const replacedCount = removalEvents?.filter((event) => event.action === 'replaced').length ?? 0;
  const rewardEventCount = rewardEvents?.length ?? 0;

  let intimacyBadge = 'Gắn Kết Nhẹ Nhàng 🌸';
  if (intimacyScore > 75) intimacyBadge = 'Cặp Đôi Bùng Nổ Nồng Nhiệt 💋';
  else if (intimacyScore > 40) intimacyBadge = 'Tình Yêu Thân Mật Đắm Say 🔥';

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusFrame = window.requestAnimationFrame(() => {
      if (terminal) panelRef.current?.querySelector<HTMLElement>('button:not([disabled])')?.focus();
      else closeButtonRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !terminal) {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll(FOCUSABLE_SELECTOR),
      ).filter(
        (element): element is HTMLElement =>
          element instanceof HTMLElement && !element.hasAttribute('disabled'),
      );

      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [onClose, terminal]);

  const renderOutfitSummary = (playerIndex: 0 | 1) => {
    const outfitState = outfitStates?.[playerIndex];
    if (!outfitState) return null;

    const initialCount = getInitialGarmentCount(outfitState);
    const remainingCount = getPresentGarmentSlots(outfitState).length;
    const removedCount = Math.max(0, initialCount - remainingCount);
    const cardRemovalCount = getRemovalCount(removalEvents, playerIndex, 'card');
    const penaltyRemovalCount = getRemovalCount(removalEvents, playerIndex, 'penalty');

    return (
      <div className="mt-3 border-t border-white/10 pt-3">
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-200/80">
          <Layers3 className="h-3.5 w-3.5" aria-hidden="true" />
          Trang phục
        </div>
        <dl className="grid grid-cols-3 gap-1 text-center">
          <div className="rounded-lg bg-white/[0.04] px-1 py-1.5">
            <dt className="text-[9px] text-neutral-500">Ban đầu</dt>
            <dd className="mt-0.5 text-sm font-bold text-white">{initialCount}</dd>
          </div>
          <div className="rounded-lg bg-rose-500/[0.07] px-1 py-1.5">
            <dt className="text-[9px] text-neutral-500">Đã bỏ</dt>
            <dd className="mt-0.5 text-sm font-bold text-rose-300">{removedCount}</dd>
          </div>
          <div className="rounded-lg bg-emerald-500/[0.06] px-1 py-1.5">
            <dt className="text-[9px] text-neutral-500">Còn lại</dt>
            <dd className="mt-0.5 text-sm font-bold text-emerald-300">{remainingCount}</dd>
          </div>
        </dl>
        {removalEvents && (
          <p className="mt-2 text-[10px] text-neutral-400">
            Theo thẻ: <span className="font-semibold text-neutral-200">{cardRemovalCount}</span>
            <span aria-hidden="true"> · </span>
            Do luật phạt: <span className="font-semibold text-neutral-200">{penaltyRemovalCount}</span>
          </p>
        )}
      </div>
    );
  };

  const renderRewardSummary = (playerIndex: 0 | 1) => {
    const reward = playerRewards?.[playerIndex];
    if (!reward) return null;
    return (
      <div className="mt-3 border-t border-white/10 pt-3">
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200/80">
          <Star className="h-3.5 w-3.5 fill-amber-300/20" aria-hidden="true" />
          Phần thưởng
        </div>
        <dl className="grid grid-cols-3 gap-1 text-center">
          <div className="rounded-lg bg-amber-500/[0.07] px-1 py-1.5">
            <dt className="text-[9px] text-neutral-500">Đã kiếm</dt>
            <dd className="mt-0.5 text-sm font-bold text-amber-200">{reward.totalStarsEarned}★</dd>
          </div>
          <div className="rounded-lg bg-white/[0.04] px-1 py-1.5">
            <dt className="flex items-center justify-center gap-1 text-[9px] text-neutral-500"><Shuffle className="h-2.5 w-2.5" />Đổi</dt>
            <dd className="mt-0.5 text-sm font-bold text-white">{reward.rerollsUsed}</dd>
          </div>
          <div className="rounded-lg bg-orange-500/[0.06] px-1 py-1.5">
            <dt className="flex items-center justify-center gap-1 text-[9px] text-neutral-500"><TrendingUp className="h-2.5 w-2.5" />Tăng</dt>
            <dd className="mt-0.5 text-sm font-bold text-orange-200">{reward.difficultyBoostsUsed}</dd>
          </div>
        </dl>
        <p className="mt-2 text-[10px] text-neutral-400">Còn lại: <strong className="text-amber-200">{reward.starBalance}★</strong></p>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: shouldReduceMotion ? 0.08 : 0.18 }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 bg-black/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="summary-title"
      aria-describedby="summary-description"
      onMouseDown={(event) => {
        if (!terminal && event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={panelRef}
        tabIndex={-1}
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 8 }}
        transition={{ duration: shouldReduceMotion ? 0.08 : 0.24, ease: 'easeOut' }}
        className="relative w-full max-w-lg max-h-[calc(100svh-2rem)] overflow-y-auto overscroll-contain glass-wine rounded-3xl p-6 sm:p-8 border border-amber-400/60 shadow-2xl text-center text-white"
      >
        {!terminal && (
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Đóng thống kê"
            className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full text-neutral-400 transition hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-500/30 to-amber-500/30 border border-amber-400/60 mx-auto flex items-center justify-center mb-4">
          <Trophy className="w-8 h-8 text-amber-300 drop-shadow-[0_0_10px_rgba(212,175,55,0.8)]" />
        </div>

        <h3 id="summary-title" className="font-serif-romantic text-3xl font-bold text-gold-gradient mb-1">
          Tổng Kết Cuộc Chơi
        </h3>
        <p id="summary-description" className="text-xs text-rose-200/90 italic mb-6">
          {terminal
            ? endReason === 'have_sex'
              ? 'Lá hiếm đã được mở. Không có yêu cầu phải thực hiện.'
              : 'Ván chơi đã kết thúc và không thể tiếp tục từ màn hình này.'
            : '“Mỗi khoảnh khắc chia sẻ là một nhịp đập yêu thương”'}
        </p>

        {/* Intimacy Score Badge */}
        <div className="bg-neutral-900/80 rounded-2xl p-4 border border-rose-500/30 mb-6 space-y-2">
          <div className="text-xs text-neutral-400 uppercase tracking-wider">
            Chỉ số thấu hiểu & kết nối
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-rose-500/[0.06] p-2">
              <div className="text-[9px] uppercase tracking-wider text-rose-200/65">Tim hồng</div>
              <div className="text-2xl font-bold font-serif-romantic text-rose-200">{intimacyScore}%</div>
            </div>
            <div className="rounded-xl bg-violet-400/[0.07] p-2">
              <div className="text-[9px] uppercase tracking-wider text-violet-200/65">Tim Luxury</div>
              <div className="text-2xl font-bold font-serif-romantic text-violet-200">{luxuryIntimacyPercent}%</div>
            </div>
          </div>
          <div className="inline-block px-3 py-1 rounded-full bg-rose-950/80 border border-rose-500/40 text-xs text-rose-300 font-medium">
            {intimacyBadge}
          </div>
          {intimacyEvents && (
            <div className="grid grid-cols-2 gap-1.5 pt-2 text-center sm:grid-cols-4">
              <div className="rounded-lg bg-white/[0.04] px-1 py-1.5">
                <div className="text-[9px] text-neutral-500">Hoàn thành</div>
                <div className="text-xs font-bold text-white">+{cardGain}%</div>
              </div>
              <div className="rounded-lg bg-rose-500/[0.07] px-1 py-1.5">
                <div className="text-[9px] text-neutral-500">Theo thẻ</div>
                <div className="text-xs font-bold text-rose-300">+{clothingGain}%</div>
              </div>
              <div className="rounded-lg bg-amber-500/[0.07] px-1 py-1.5">
                <div className="text-[9px] text-neutral-500">Tư thế đã mở</div>
                <div className="text-xs font-bold text-amber-300">{positionCardsRevealed}</div>
              </div>
              <div className="rounded-lg bg-violet-500/[0.07] px-1 py-1.5">
                <div className="text-[9px] text-neutral-500">Luxury</div>
                <div className="text-xs font-bold text-violet-200">+{luxuryGain}%</div>
              </div>
            </div>
          )}
          {removalEvents && (
            <p className="pt-1 text-[10px] text-neutral-400">Đổi đồ: <strong className="text-neutral-200">{swapCount}</strong> · Món bị thay: <strong className="text-neutral-200">{replacedCount}</strong></p>
          )}
          {journeyPhase === 'final' && (
            <p className="pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200">
              Đã mở lá hiếm kết thúc hành trình
            </p>
          )}
        </div>

        {/* Player stats comparison */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-left">
          <div className="bg-neutral-900/60 rounded-2xl p-3.5 border border-rose-500/20">
            <div className="text-lg mb-1">{player1.avatar} {player1.name}</div>
            <div className="text-xs text-neutral-300 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{player1.completedCount} thử thách hoàn thành</span>
            </div>
            {renderRewardSummary(0)}
            {renderOutfitSummary(0)}
          </div>

          <div className="bg-neutral-900/60 rounded-2xl p-3.5 border border-amber-500/20">
            <div className="text-lg mb-1">{player2.avatar} {player2.name}</div>
            <div className="text-xs text-neutral-300 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{player2.completedCount} thử thách hoàn thành</span>
            </div>
            {renderRewardSummary(1)}
            {renderOutfitSummary(1)}
          </div>
        </div>

        {playerRewards && (
          <p className="mb-5 text-[10px] text-neutral-500">Đã ghi {rewardEventCount} sự kiện cộng hoặc sử dụng sao trong ván.</p>
        )}

        {/* Favorites count */}
        <div className="text-xs text-neutral-300 mb-6 flex items-center justify-center gap-2">
          <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
          <span>Đã lưu {favoritesCount} lá bài kỉ niệm vào danh sách yêu thích</span>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {terminal ? (
            <button
              type="button"
              onClick={onHome}
              className="min-h-11 flex-1 py-3 rounded-full bg-neutral-900 border border-neutral-700 text-xs font-semibold hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              Về trang đầu
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 flex-1 py-3 rounded-full bg-neutral-900 border border-neutral-700 text-xs font-semibold hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              Chơi Tiếp Lượt Sau
            </button>
          )}
          <button
            type="button"
            onClick={onRestart}
            className="min-h-11 flex-1 py-3 rounded-full bg-gold-gradient text-neutral-950 text-xs font-bold shadow-md hover:shadow-lg flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Tạo Ván Mới</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
