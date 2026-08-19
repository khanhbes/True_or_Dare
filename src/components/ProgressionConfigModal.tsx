import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { RotateCcw, Save, SlidersHorizontal, X } from 'lucide-react';
import { CardType, DifficultyStars, ProgressionConfig } from '../types';
import {
  DEFAULT_PROGRESSION_CONFIG,
  DIFFICULTY_STARS,
  cloneProgressionConfig,
  hydrateProgressionConfig,
} from '../utils/progression';

interface ProgressionConfigModalProps {
  config: ProgressionConfig;
  onChange: (config: ProgressionConfig) => void;
  onClose: () => void;
}

const TYPE_KEYS: CardType[] = ['truth', 'dare'];

const normalizedPercent = (values: readonly number[], index: number): number => {
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0);
  return total > 0 ? Math.round((Math.max(0, values[index]) / total) * 100) : 0;
};
export const ProgressionConfigModal: React.FC<ProgressionConfigModalProps> = ({
  config,
  onChange,
  onClose,
}) => {
  const reduceMotion = useReducedMotion();
  const [draft, setDraft] = useState(() => cloneProgressionConfig(config));
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const isValid = draft.bands.every((band) =>
    TYPE_KEYS.some((type) => Number.isFinite(band.typeWeights[type]) && band.typeWeights[type] > 0) &&
    DIFFICULTY_STARS.some((star) => Number.isFinite(band.starWeights[star]) && band.starWeights[star] > 0) &&
    TYPE_KEYS.every((type) => Number.isFinite(band.typeWeights[type]) && band.typeWeights[type] >= 0) &&
    DIFFICULTY_STARS.every((star) => Number.isFinite(band.starWeights[star]) && band.starWeights[star] >= 0),
  ) && DIFFICULTY_STARS.every((star) =>
    Number.isFinite(draft.starGains[star]) && draft.starGains[star] >= 0 && draft.starGains[star] <= 100,
  ) && Number.isFinite(draft.cardRemovalBonus) && draft.cardRemovalBonus >= 0 && draft.cardRemovalBonus <= 100;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const dialog = document.querySelector<HTMLElement>('[data-progression-dialog="true"]');
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (focusable.length === 0) return;
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
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  const updateBandWeight = (
    bandIndex: number,
    group: 'typeWeights' | 'starWeights',
    key: CardType | DifficultyStars,
    value: number,
  ) => {
    setDraft((current) => {
      const next = cloneProgressionConfig(current);
      if (group === 'typeWeights') {
        next.bands[bandIndex].typeWeights[key as CardType] = value;
      } else {
        next.bands[bandIndex].starWeights[key as DifficultyStars] = value;
      }
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-md sm:items-center sm:p-5"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <motion.section
        data-progression-dialog="true"
        role="dialog"
        aria-modal="true"
        aria-labelledby="progression-config-title"
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.99 }}
        transition={{ duration: reduceMotion ? 0.08 : 0.2 }}
        className="relative my-auto max-h-[calc(100svh-1.5rem)] w-full max-w-5xl overflow-y-auto overscroll-contain rounded-[1.75rem] border border-amber-300/25 bg-[#0b0a0d] shadow-2xl"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-[#0b0a0d]/95 px-4 py-4 backdrop-blur sm:px-6">
          <div className="flex gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-300/10 text-amber-200">
              <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="progression-config-title" className="font-serif-romantic text-xl font-bold text-amber-100 sm:text-2xl">
                Cấu hình tiến triển
              </h2>
              <p className="mt-1 text-[11px] text-neutral-400">
                Các trọng số được tự chuẩn hóa thành phần trăm khi rút bài.
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Đóng cấu hình tiến triển"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-neutral-400 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-6 p-4 sm:p-6">
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[760px] border-collapse text-left text-xs">
              <thead className="bg-white/[0.04] text-[10px] uppercase tracking-[0.12em] text-neutral-400">
                <tr>
                  <th className="px-3 py-3">Mốc</th>
                  <th className="px-2 py-3">Sự thật</th>
                  <th className="px-2 py-3">Thử thách</th>
                  {DIFFICULTY_STARS.map((star) => <th key={star} className="px-2 py-3">{star}★</th>)}
                </tr>
              </thead>
              <tbody>
                {draft.bands.map((band, bandIndex) => {
                  const typeValues = TYPE_KEYS.map((type) => band.typeWeights[type]);
                  const starValues = DIFFICULTY_STARS.map((star) => band.starWeights[star]);
                  return (
                    <tr key={band.minPercent} className="border-t border-white/[0.07] align-top">
                      <th className="whitespace-nowrap px-3 py-3 text-amber-200">{band.minPercent}–{band.maxPercent}%</th>
                      {TYPE_KEYS.map((type, typeIndex) => (
                        <td key={type} className="px-2 py-2">
                          <input
                            type="number"
                            min={0}
                            step={1}
                            aria-label={`${type === 'truth' ? 'Sự thật' : 'Thử thách'} tại ${band.minPercent} đến ${band.maxPercent} phần trăm`}
                            value={band.typeWeights[type]}
                            onChange={(event) => updateBandWeight(bandIndex, 'typeWeights', type, Number(event.target.value))}
                            className="h-10 w-16 rounded-lg border border-neutral-700 bg-neutral-950 px-2 text-white outline-none focus:border-amber-300/60"
                          />
                          <div className="mt-1 text-[9px] text-neutral-500">≈{normalizedPercent(typeValues, typeIndex)}%</div>
                        </td>
                      ))}
                      {DIFFICULTY_STARS.map((star, starIndex) => (
                        <td key={star} className="px-2 py-2">
                          <input
                            type="number"
                            min={0}
                            step={1}
                            aria-label={`${star} sao tại ${band.minPercent} đến ${band.maxPercent} phần trăm`}
                            value={band.starWeights[star]}
                            onChange={(event) => updateBandWeight(bandIndex, 'starWeights', star, Number(event.target.value))}
                            className="h-10 w-16 rounded-lg border border-neutral-700 bg-neutral-950 px-2 text-white outline-none focus:border-amber-300/60"
                          />
                          <div className="mt-1 text-[9px] text-neutral-500">≈{normalizedPercent(starValues, starIndex)}%</div>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <section aria-labelledby="intimacy-gains-title">
            <h3 id="intimacy-gains-title" className="text-sm font-semibold text-white">Điểm thân mật khi hoàn thành</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-6">
              {DIFFICULTY_STARS.map((star) => (
                <label key={star} className="text-[10px] text-neutral-400">
                  {star}★
                  <div className="relative mt-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={draft.starGains[star]}
                      onChange={(event) => setDraft((current) => ({
                        ...cloneProgressionConfig(current),
                        starGains: { ...current.starGains, [star]: Number(event.target.value) },
                      }))}
                      className="h-11 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 pr-8 text-white outline-none focus:border-rose-300/60"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-neutral-600">%</span>
                  </div>
                </label>
              ))}
              <label className="text-[10px] text-neutral-400">
                Bỏ đồ do thẻ
                <div className="relative mt-1">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={draft.cardRemovalBonus}
                    onChange={(event) => setDraft((current) => ({
                      ...cloneProgressionConfig(current),
                      cardRemovalBonus: Number(event.target.value),
                    }))}
                    className="h-11 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 pr-8 text-white outline-none focus:border-rose-300/60"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-neutral-600">%</span>
                </div>
              </label>
            </div>
          </section>

          {!isValid && (
            <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              Mỗi hàng cần ít nhất một trọng số loại và một trọng số sao lớn hơn 0; điểm thưởng nằm trong 0–100.
            </p>
          )}
        </div>

        <footer className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-white/10 bg-[#0b0a0d]/95 px-4 py-4 backdrop-blur sm:flex-row sm:justify-between sm:px-6">
          <button
            type="button"
            onClick={() => setDraft(cloneProgressionConfig(DEFAULT_PROGRESSION_CONFIG as ProgressionConfig))}
            className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-neutral-700 px-4 text-xs font-semibold text-neutral-300 hover:border-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
          >
            <RotateCcw className="h-4 w-4" /> Khôi phục mặc định
          </button>
          <button
            type="button"
            disabled={!isValid}
            onClick={() => { onChange(hydrateProgressionConfig(draft)); onClose(); }}
            className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#f7e7b0,#d4af37)] px-5 text-xs font-bold text-neutral-950 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
          >
            <Save className="h-4 w-4" /> Lưu cấu hình
          </button>
        </footer>
      </motion.section>
    </div>
  );
};
