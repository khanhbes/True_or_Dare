import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  CheckCircle2,
  Heart,
  Layers3,
  LockOpen,
  Percent,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';

interface RulesModalProps {
  onClose: () => void;
}

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';

    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll(FOCUSABLE_SELECTOR)
      ).filter(
        (element): element is HTMLElement =>
          element instanceof HTMLElement && !element.hasAttribute('disabled')
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
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[90] flex items-start sm:items-center justify-center overflow-y-auto bg-black/85 p-3 sm:p-5 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-title"
      aria-describedby="rules-description"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={panelRef}
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.96, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
        className="relative my-auto w-full max-w-2xl max-h-[calc(100svh-1.5rem)] overflow-y-auto overscroll-contain rounded-3xl border border-rose-400/35 bg-[#130d10]/98 text-left text-white shadow-[0_28px_90px_rgba(0,0,0,0.72)]"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-[#130d10]/95 px-5 py-4 backdrop-blur-xl sm:px-7 sm:py-5">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-rose-400/35 bg-rose-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-rose-200">
                18+ · Đồng thuận
              </span>
              <span className="text-[10px] text-neutral-500">Đọc trước khi bắt đầu</span>
            </div>
            <h2 id="rules-title" className="font-serif-romantic text-2xl font-bold text-amber-300 sm:text-3xl">
              🎮 Cách Chơi
            </h2>
            <p id="rules-description" className="mt-1 max-w-xl text-xs leading-relaxed text-neutral-400 sm:text-sm">
              🎴 Rút thẻ → ✅ hoàn thành → ❤️ tăng thân mật → 🔄 đổi lượt. Dành cho hai người trưởng thành, tự nguyện.
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Đóng luật chơi"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-neutral-400 transition hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-5 sm:px-7 sm:py-6">
          <ol className="relative space-y-0 before:absolute before:bottom-5 before:left-[19px] before:top-5 before:w-px before:bg-gradient-to-b before:from-rose-400/50 before:via-amber-400/35 before:to-transparent">
            <li className="relative grid grid-cols-[40px_1fr] gap-3 pb-6 sm:gap-4">
              <span className="relative z-[1] flex h-10 w-10 items-center justify-center rounded-full border border-rose-400/45 bg-[#241018] text-rose-200 shadow-[0_0_20px_rgba(255,107,157,0.12)]">
                <Users className="h-4.5 w-4.5" />
              </span>
              <div className="pt-0.5">
                <h3 className="text-sm font-semibold text-white sm:text-base">1. Chuẩn bị cùng nhau</h3>
                <p className="mt-1 text-xs leading-relaxed text-neutral-300 sm:text-sm">
                  👫 Hai người thay phiên nhau rút Truth hoặc Dare. Truth là trả lời câu hỏi; Dare là thực hiện thử thách.
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-rose-200/75">
                  Chỉ bắt đầu sau khi cả hai đều là người trưởng thành, tự nguyện và đã thống nhất giới hạn.
                </p>
              </div>
            </li>

            <li className="relative grid grid-cols-[40px_1fr] gap-3 pb-6 sm:gap-4">
              <span className="relative z-[1] flex h-10 w-10 items-center justify-center rounded-full border border-amber-400/45 bg-[#241c0d] text-amber-200 shadow-[0_0_20px_rgba(212,175,55,0.1)]">
                <Layers3 className="h-4.5 w-4.5" />
              </span>
              <div className="pt-0.5">
                <h3 className="text-sm font-semibold text-white sm:text-base">2. Trang phục theo từng lớp</h3>
                <p className="mt-1 text-xs leading-relaxed text-neutral-300 sm:text-sm">
                  👕 Trang phục thay đổi dần qua các thẻ. Game theo dõi trạng thái của cả hai và chỉ đưa ra thẻ phù hợp.
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-amber-200/75">
                  Nhân vật luôn là hình minh họa kín đáo, kể cả khi không còn món đồ đã chọn.
                </p>
              </div>
            </li>

            <li className="relative grid grid-cols-[40px_1fr] gap-3 pb-6 sm:gap-4">
              <span className="relative z-[1] flex h-10 w-10 items-center justify-center rounded-full border border-rose-400/45 bg-[#241018] text-rose-200 shadow-[0_0_20px_rgba(255,107,157,0.12)]">
                <Heart className="h-4.5 w-4.5 fill-current" />
              </span>
              <div className="pt-0.5">
                <h3 className="text-sm font-semibold text-white sm:text-base">3. Mỗi lượt chơi</h3>
                <p className="mt-1 text-xs leading-relaxed text-neutral-300 sm:text-sm">
                  ❤️ Hoàn thành thẻ làm tăng Intimacy từ 0% đến 100%. Mức sao và độ khó tăng dần theo hành trình.
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-rose-200/75">
                  Hoàn thành bài sẽ cộng điểm theo số sao. Cởi đồ do hiệu ứng của thẻ có thưởng thêm; bỏ qua và cởi đồ do luật phạt không cộng điểm. Bỏ qua được xử lý theo luật phạt đã cấu hình; cả hai luôn có thể dừng mà không cần giải thích.
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-amber-200/80">
                  Lá có đồng hồ chỉ bắt đầu khi bấm “Bắt đầu thực hiện”. Hết giờ sẽ reo khoảng 3 giây; hai bạn vẫn tự xác nhận kết quả, game không tự phạt.
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-amber-200/80">
                  Hoàn thành bài thường cộng đúng số ★ trên lá cho người thực hiện. Mỗi người có ví riêng: 8★ để đổi một lá và 10★ để làm lượt rút kế tiếp của đối phương khó hơn một bậc. Mỗi loại chỉ dùng một lần trên một lượt, sao chưa dùng được giữ đến hết ván.
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-neutral-400">
                  Lá bị bỏ qua hoặc đổi đi không được mở khóa trong Bộ sưu tập. Chỉ xác nhận hoàn thành mới mở khóa lá.
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-rose-200/75">
                  Với thẻ có tác động trang phục, hãy chọn đúng món theo lời thẻ rồi xác nhận. Thẻ đổi đồ yêu cầu mỗi người chọn một món; bản xem trước có thể hủy mà không làm thay đổi nhân vật.
                </p>
                <div className="mt-2 flex items-start gap-2 text-[11px] leading-relaxed text-amber-200/80">
                  <Percent className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>Tỉ lệ Sự thật/Thử thách và 1★–5★ thay đổi theo năm mốc thân mật. Xác suất luôn được chuẩn hóa theo những lá còn hợp lệ và không tự mở cấp độ đã tắt.</span>
                </div>
              </div>
            </li>

            <li className="relative grid grid-cols-[40px_1fr] gap-3 pb-6 sm:gap-4">
              <span className="relative z-[1] flex h-10 w-10 items-center justify-center rounded-full border border-amber-400/45 bg-[#241c0d] text-amber-200 shadow-[0_0_20px_rgba(212,175,55,0.1)]">
                <AlertTriangle className="h-4.5 w-4.5" />
              </span>
              <div className="pt-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-white sm:text-base">4. Luật phạt tùy chọn</h3>
                  <span className="rounded-full bg-rose-500/12 px-2 py-0.5 text-[9px] uppercase tracking-wider text-rose-200">Cả hai cùng đồng ý</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-neutral-300 sm:text-sm">
                  Khi bật luật phạt, nếu câu trả lời được cả hai xác nhận là sai hoặc thử thách không được thực hiện, người đang lượt có thể bỏ 1 món hợp lệ của chính mình.
                </p>
                <p className="mt-2 text-xs leading-relaxed text-neutral-300 sm:text-sm">
                  Nếu không còn món nào, hai bạn có thể thống nhất một phương án thay thế an toàn hoặc tiếp tục không phạt. Trò chơi không bị khóa và không ai phải làm điều mình không muốn.
                </p>
              </div>
            </li>

            <li className="relative grid grid-cols-[40px_1fr] gap-3 pb-6 sm:gap-4">
              <span className="relative z-[1] flex h-10 w-10 items-center justify-center rounded-full border border-blue-400/40 bg-blue-950/35 text-blue-200 shadow-[0_0_20px_rgba(96,165,250,0.08)]">
                <LockOpen className="h-4.5 w-4.5" />
              </span>
              <div className="pt-0.5">
                <h3 className="text-sm font-semibold text-white sm:text-base">5. Tim Luxury và bộ Tư thế</h3>
                <p className="mt-1 text-xs leading-relaxed text-neutral-300 sm:text-sm">
                  💗 Khi Standard đạt 100%, nếu trang phục chưa đủ điều kiện game tiếp tục Standard nóng hơn. Khi cả hai sẵn sàng và cùng đồng ý, Position Deck bắt đầu.
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-blue-200/75">
                  ⭐ Standard dùng ⭐1–⭐5. 💎 Position dùng ⭐6–⭐10. Sao mô tả độ nóng của thẻ, không đổi màu trái tim.
                </p>
              </div>
            </li>

            <li className="relative grid grid-cols-[40px_1fr] gap-3 sm:gap-4">
              <span className="relative z-[1] flex h-10 w-10 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-950/35 text-emerald-200 shadow-[0_0_20px_rgba(52,211,153,0.08)]">
                <ShieldCheck className="h-4.5 w-4.5" />
              </span>
              <div className="pt-0.5">
                <h3 className="text-sm font-semibold text-white sm:text-base">6. Đồng thuận luôn được ưu tiên</h3>
                <p className="mt-1 text-xs leading-relaxed text-neutral-300 sm:text-sm">
                  Mỗi người có thể rút lại đồng ý bất cứ lúc nào. Im lặng hoặc đồng ý ở lượt trước không thay cho sự đồng ý ở hiện tại; không ai bị phạt vì từ chối hay dừng cuộc chơi.
                </p>
              </div>
            </li>
          </ol>

          <div className="mt-6 flex gap-3 rounded-2xl border border-amber-400/25 bg-amber-500/[0.06] px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-300" />
            <p className="text-xs leading-relaxed text-amber-100/85">
              <strong className="font-semibold text-amber-200">Nghe “Dừng” là dừng ngay.</strong>{' '}
              Không quay phim, chụp ảnh hoặc chia sẻ nội dung riêng tư nếu chưa được đồng ý rõ ràng.
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-white/10 bg-[#130d10]/95 px-5 py-4 backdrop-blur-xl sm:px-7">
          <button
            type="button"
            onClick={onClose}
            className="mx-auto flex w-full max-w-sm items-center justify-center gap-2 rounded-full bg-gold-gradient px-5 py-3 text-sm font-bold text-neutral-950 shadow-[0_0_24px_rgba(212,175,55,0.24)] transition hover:shadow-[0_0_30px_rgba(255,107,157,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Đã Hiểu, Tiếp Tục</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
