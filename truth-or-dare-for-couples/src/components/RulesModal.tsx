import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';

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

const VectorClose: React.FC = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
  </svg>
);

const VectorCheck: React.FC = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TurnFlowGraphic: React.FC = () => (
  <svg viewBox="0 0 520 112" className="h-auto w-full" role="img" aria-label="Rút thẻ, hoàn thành, tăng thân mật, đổi lượt">
    <defs>
      <linearGradient id="flowGlow" x1="0" x2="1">
        <stop offset="0%" stopColor="#fb7185" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
    </defs>
    <path d="M130 55H180M292 55H342M454 55H486" fill="none" stroke="url(#flowGlow)" strokeWidth="3" strokeLinecap="round" opacity=".6" />
    <g>
      <rect x="18" y="22" width="112" height="66" rx="18" fill="#26131b" stroke="#fb7185" strokeOpacity=".55" />
      <rect x="41" y="36" width="24" height="32" rx="5" fill="none" stroke="#fda4af" strokeWidth="2" />
      <rect x="50" y="31" width="24" height="32" rx="5" fill="#2e1720" stroke="#fecdd3" strokeWidth="2" />
      <text x="99" y="59" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700">RÚT THẺ</text>
    </g>
    <g>
      <rect x="180" y="22" width="112" height="66" rx="18" fill="#20180f" stroke="#f59e0b" strokeOpacity=".55" />
      <circle cx="211" cy="55" r="16" fill="none" stroke="#fcd34d" strokeWidth="2" />
      <path d="M203 55l6 6 11-13" fill="none" stroke="#fde68a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <text x="254" y="59" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700">XONG</text>
    </g>
    <g>
      <rect x="342" y="22" width="112" height="66" rx="18" fill="#26131b" stroke="#fb7185" strokeOpacity=".55" />
      <path d="M374 67C355 54 360 37 373 37c8 0 12 6 12 6s4-6 12-6c13 0 18 17-1 30l-11 8-11-8Z" fill="#fb7185" opacity=".9" />
      <text x="420" y="59" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700">+ THÂN MẬT</text>
    </g>
    <path d="M488 41c18 0 26 11 26 22 0 12-9 22-24 22M500 77l-10 8 9 7" fill="none" stroke="#cbd5e1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TruthDareGraphic: React.FC = () => (
  <svg viewBox="0 0 520 150" className="h-auto w-full" role="img" aria-label="Truth là trả lời, Dare là thử thách">
    <g>
      <rect x="16" y="14" width="236" height="122" rx="24" fill="#161b2a" stroke="#60a5fa" strokeOpacity=".45" />
      <path d="M60 49h70a13 13 0 0 1 13 13v26a13 13 0 0 1-13 13H90l-18 13 5-13H60A13 13 0 0 1 47 88V62A13 13 0 0 1 60 49Z" fill="none" stroke="#93c5fd" strokeWidth="2" />
      <circle cx="76" cy="75" r="3" fill="#bfdbfe" /><circle cx="94" cy="75" r="3" fill="#bfdbfe" /><circle cx="112" cy="75" r="3" fill="#bfdbfe" />
      <text x="185" y="67" fill="#dbeafe" fontSize="20" fontWeight="800" textAnchor="middle">TRUTH</text>
      <text x="185" y="92" fill="#94a3b8" fontSize="13" textAnchor="middle">Trả lời thật lòng</text>
    </g>
    <g>
      <rect x="268" y="14" width="236" height="122" rx="24" fill="#281613" stroke="#fb7185" strokeOpacity=".45" />
      <path d="M324 105c-15-12-17-27-7-38 7-8 7-15 4-24 13 6 20 16 19 28 7-4 10-9 11-16 10 10 15 21 13 33-2 15-15 27-31 27-4 0-7 0-9-1Z" fill="#fb7185" opacity=".9" />
      <text x="430" y="67" fill="#ffe4e6" fontSize="20" fontWeight="800" textAnchor="middle">DARE</text>
      <text x="430" y="92" fill="#a8a29e" fontSize="13" textAnchor="middle">Thực hiện thử thách</text>
    </g>
  </svg>
);

const HeartProgressGraphic: React.FC = () => (
  <svg viewBox="0 0 520 132" className="h-auto w-full" role="img" aria-label="Intimacy tăng từ 0 đến 100 phần trăm bằng trái tim hồng">
    <defs>
      <linearGradient id="heartFill" x1="0" x2="1"><stop offset="0%" stopColor="#fda4af" /><stop offset="100%" stopColor="#fb7185" /></linearGradient>
      <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
    </defs>
    <path d="M92 91C48 62 58 28 82 28c14 0 24 9 30 18 6-9 16-18 30-18 24 0 34 34-10 63l-20 14-20-14Z" fill="url(#heartFill)" filter="url(#softGlow)" />
    <rect x="175" y="48" width="294" height="20" rx="10" fill="#2b1a21" stroke="#fb7185" strokeOpacity=".35" />
    <rect x="175" y="48" width="213" height="20" rx="10" fill="url(#heartFill)" />
    <text x="175" y="92" fill="#a8a29e" fontSize="12">0%</text>
    <text x="469" y="92" fill="#fecdd3" fontSize="12" textAnchor="end">100%</text>
    <text x="322" y="119" fill="#fff" fontSize="14" fontWeight="700" textAnchor="middle">Hoàn thành thẻ để làm đầy trái tim</text>
  </svg>
);

const StarJourneyGraphic: React.FC = () => (
  <svg viewBox="0 0 520 204" className="h-auto w-full" role="img" aria-label="Standard từ 1 đến 5 sao, Position từ 6 đến 10 sao">
    <text x="24" y="28" fill="#fecdd3" fontSize="13" fontWeight="800">STANDARD</text>
    <path d="M44 78H476" stroke="#fb7185" strokeOpacity=".28" strokeWidth="2" />
    {[1,2,3,4,5].map((star, index) => {
      const x = 60 + index * 100;
      return <g key={star}><circle cx={x} cy="78" r="27" fill="#25151c" stroke="#fb7185" strokeOpacity={0.4 + index * 0.1} /><text x={x} y="84" fill="#fff" fontSize="16" fontWeight="900" textAnchor="middle">★{star}</text></g>;
    })}
    <text x="24" y="143" fill="#bfdbfe" fontSize="13" fontWeight="800">POSITION</text>
    <path d="M44 178H476" stroke="#60a5fa" strokeOpacity=".28" strokeWidth="2" />
    {[6,7,8,9,10].map((star, index) => {
      const x = 60 + index * 100;
      return <g key={star}><circle cx={x} cy="178" r="24" fill="#101827" stroke="#60a5fa" strokeOpacity={0.4 + index * 0.1} /><text x={x} y="183" fill="#dbeafe" fontSize="14" fontWeight="900" textAnchor="middle">{star}</text></g>;
    })}
  </svg>
);

const ClothingGraphic: React.FC = () => (
  <svg viewBox="0 0 520 160" className="h-auto w-full" role="img" aria-label="Game tự theo dõi trang phục của hai người">
    <g transform="translate(56 25)">
      <circle cx="55" cy="24" r="18" fill="#2c1b22" stroke="#fb7185" strokeOpacity=".55" />
      <path d="M24 130V83c0-22 14-37 31-37s31 15 31 37v47" fill="#24161c" stroke="#fb7185" strokeOpacity=".5" strokeWidth="2" />
      <path d="M16 75l22-19 17 17 17-17 22 19-11 25-13-8v38H40V92l-13 8-11-25Z" fill="#7f1d3f" opacity=".8" />
      <text x="55" y="153" fill="#fecdd3" fontSize="12" fontWeight="700" textAnchor="middle">NGƯỜI A</text>
    </g>
    <path d="M218 80h84" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5 7" opacity=".7" />
    <circle cx="260" cy="80" r="28" fill="#21190f" stroke="#f59e0b" strokeOpacity=".45" />
    <path d="M248 82l8 8 17-20" fill="none" stroke="#fcd34d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <g transform="translate(352 25)">
      <circle cx="55" cy="24" r="18" fill="#171e2a" stroke="#60a5fa" strokeOpacity=".55" />
      <path d="M24 130V83c0-22 14-37 31-37s31 15 31 37v47" fill="#151b25" stroke="#60a5fa" strokeOpacity=".5" strokeWidth="2" />
      <path d="M16 75l22-19 17 17 17-17 22 19-11 25-13-8v38H40V92l-13 8-11-25Z" fill="#1e3a8a" opacity=".78" />
      <text x="55" y="153" fill="#bfdbfe" fontSize="12" fontWeight="700" textAnchor="middle">NGƯỜI B</text>
    </g>
  </svg>
);

const PositionUnlockGraphic: React.FC = () => (
  <svg viewBox="0 0 520 190" className="h-auto w-full" role="img" aria-label="Hoàn thành Standard, đủ điều kiện trang phục và cả hai đồng ý để mở Position">
    <g><circle cx="100" cy="72" r="38" fill="#28151d" stroke="#fb7185" strokeOpacity=".45" /><path d="M100 88C76 71 82 52 95 52c7 0 11 5 11 5s4-5 11-5c13 0 19 19-5 36l-6 4-6-4Z" fill="#fb7185" /><text x="100" y="129" fill="#fecdd3" fontSize="12" fontWeight="800" textAnchor="middle">STANDARD 100%</text></g>
    <path d="M145 72H205" stroke="#a8a29e" strokeWidth="2" strokeDasharray="5 7" />
    <g><circle cx="260" cy="72" r="38" fill="#21190f" stroke="#f59e0b" strokeOpacity=".45" /><path d="M244 70h32M248 58h24M251 82h18" stroke="#fcd34d" strokeWidth="2.5" strokeLinecap="round" /><text x="260" y="129" fill="#fde68a" fontSize="12" fontWeight="800" textAnchor="middle">TRANG PHỤC</text></g>
    <path d="M305 72H365" stroke="#a8a29e" strokeWidth="2" strokeDasharray="5 7" />
    <g><circle cx="420" cy="72" r="38" fill="#112136" stroke="#60a5fa" strokeOpacity=".45" /><path d="M405 76l9 9 20-24" fill="none" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><text x="420" y="129" fill="#bfdbfe" fontSize="12" fontWeight="800" textAnchor="middle">CẢ HAI ĐỒNG Ý</text></g>
    <path d="M260 145v22" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" /><path d="M250 160l10 10 10-10" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><text x="260" y="187" fill="#dbeafe" fontSize="14" fontWeight="900" textAnchor="middle">POSITION</text>
  </svg>
);

const ConsentGraphic: React.FC = () => (
  <svg viewBox="0 0 520 130" className="h-auto w-full" role="img" aria-label="Có thể bỏ qua hoặc dừng bất cứ lúc nào">
    <rect x="40" y="30" width="180" height="68" rx="20" fill="#21161a" stroke="#fb7185" strokeOpacity=".42" />
    <path d="M83 49v30M97 49v30" stroke="#fda4af" strokeWidth="5" strokeLinecap="round" />
    <text x="157" y="69" fill="#fff" fontSize="17" fontWeight="900" textAnchor="middle">SKIP</text>
    <text x="157" y="87" fill="#a8a29e" fontSize="11" textAnchor="middle">Không muốn làm</text>
    <path d="M240 64h40" stroke="#64748b" strokeWidth="2" strokeDasharray="5 6" />
    <rect x="300" y="30" width="180" height="68" rx="20" fill="#17231d" stroke="#34d399" strokeOpacity=".42" />
    <rect x="331" y="47" width="27" height="34" rx="5" fill="none" stroke="#6ee7b7" strokeWidth="2" />
    <path d="M338 56h13M338 64h13M338 72h8" stroke="#a7f3d0" strokeWidth="1.8" strokeLinecap="round" />
    <text x="406" y="69" fill="#fff" fontSize="17" fontWeight="900" textAnchor="middle">DỪNG</text>
    <text x="406" y="87" fill="#a8a29e" fontSize="11" textAnchor="middle">Bất cứ lúc nào</text>
  </svg>
);

const RuleSection: React.FC<{ eyebrow: string; title: string; description?: string; children: React.ReactNode }> = ({ eyebrow, title, description, children }) => (
  <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
    <div className="mb-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-200/70">{eyebrow}</p>
      <h3 className="mt-1 text-base font-semibold text-white sm:text-lg">{title}</h3>
      {description ? <p className="mt-1 text-xs leading-relaxed text-neutral-400 sm:text-sm">{description}</p> : null}
    </div>
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-black/10 p-2 sm:p-3">{children}</div>
  </section>
);

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

      const focusable = Array.from(panelRef.current.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (element): element is HTMLElement => element instanceof HTMLElement && !element.hasAttribute('disabled')
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
      className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/85 p-3 backdrop-blur-md sm:items-center sm:p-5"
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
        className="relative my-auto max-h-[calc(100svh-1.5rem)] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-[28px] border border-rose-400/25 bg-[#120c0f]/98 text-left text-white shadow-[0_28px_90px_rgba(0,0,0,0.72)]"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-[#120c0f]/95 px-5 py-4 backdrop-blur-xl sm:px-7 sm:py-5">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-rose-200">18+ · 2 người · tự nguyện</span>
              <span className="text-[10px] text-neutral-500">Đọc trong khoảng 15 giây</span>
            </div>
            <h2 id="rules-title" className="font-serif-romantic text-2xl font-bold text-white sm:text-3xl">Cách chơi</h2>
            <p id="rules-description" className="mt-1 max-w-xl text-xs leading-relaxed text-neutral-400 sm:text-sm">Rút thẻ, hoàn thành, tăng thân mật và đổi lượt.</p>
          </div>

          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Đóng luật chơi" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-neutral-400 transition hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400">
            <VectorClose />
          </button>
        </header>

        <main className="space-y-4 px-5 py-5 sm:px-7 sm:py-6">
          <RuleSection eyebrow="01 · Một lượt" title="Rút → Làm → Tăng → Đổi"><TurnFlowGraphic /></RuleSection>
          <RuleSection eyebrow="02 · Chọn cách chơi" title="Truth hoặc Dare"><TruthDareGraphic /></RuleSection>
          <RuleSection eyebrow="03 · Standard" title="Làm đầy trái tim hồng" description="Hoàn thành thẻ để tăng Intimacy từ 0% đến 100%."><HeartProgressGraphic /></RuleSection>
          <RuleSection eyebrow="04 · Độ nóng" title="Sao tăng dần theo hành trình" description="Standard dùng 1–5 sao. Position tiếp tục từ 6–10."><StarJourneyGraphic /></RuleSection>
          <RuleSection eyebrow="05 · Trang phục" title="Game tự theo dõi trạng thái của cả hai" description="Chỉ những thẻ phù hợp với trang phục hiện tại mới được đưa ra."><ClothingGraphic /></RuleSection>
          <RuleSection eyebrow="06 · Mở Position" title="Ba điều kiện, một bước chuyển"><PositionUnlockGraphic /></RuleSection>
          <RuleSection eyebrow="07 · Quyền lựa chọn" title="Không muốn làm thì bỏ qua" description="Mỗi người có thể dừng hoặc đổi ý bất cứ lúc nào, không cần giải thích."><ConsentGraphic /></RuleSection>

          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.05] px-4 py-3">
            <p className="text-center text-xs leading-relaxed text-emerald-100/85 sm:text-sm"><strong className="font-semibold text-emerald-200">Nghe “Dừng” là dừng ngay.</strong>{' '}Không quay phim, chụp ảnh hoặc chia sẻ nội dung riêng tư nếu chưa được đồng ý rõ ràng.</p>
          </div>
        </main>

        <footer className="sticky bottom-0 border-t border-white/10 bg-[#120c0f]/95 px-5 py-4 backdrop-blur-xl sm:px-7">
          <button type="button" onClick={onClose} className="mx-auto flex w-full max-w-sm items-center justify-center gap-2 rounded-full bg-gold-gradient px-5 py-3 text-sm font-bold text-neutral-950 shadow-[0_0_24px_rgba(212,175,55,0.24)] transition hover:shadow-[0_0_30px_rgba(255,107,157,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
            <VectorCheck />
            <span>Đã hiểu, bắt đầu chơi</span>
          </button>
        </footer>
      </motion.div>
    </motion.div>
  );
};
