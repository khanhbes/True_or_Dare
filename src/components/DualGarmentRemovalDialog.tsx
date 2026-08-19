import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, Lock, X } from 'lucide-react';
import type { GarmentSlot, OutfitState } from '../types';
import { GARMENT_LABELS, getPresentGarmentSlots, getRemovableGarmentSlots } from '../utils/wardrobe';
import { OutfitFigure } from './OutfitFigure';

interface DualGarmentRemovalDialogProps {
  playerNames: readonly [string, string];
  outfitStates: readonly [OutfitState, OutfitState];
  onConfirm: (firstSlot: GarmentSlot, secondSlot: GarmentSlot) => void;
  onCancel: () => void;
  onContinueWithoutRemoval: () => void;
}

const FOCUSABLE = 'button:not([disabled]),[href],[tabindex]:not([tabindex="-1"])';

export const DualGarmentRemovalDialog: React.FC<DualGarmentRemovalDialogProps> = ({
  playerNames,
  outfitStates,
  onConfirm,
  onCancel,
  onContinueWithoutRemoval,
}) => {
  const [selections, setSelections] = useState<[GarmentSlot | null, GarmentSlot | null]>([null, null]);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const eligible = [
    getRemovableGarmentSlots(outfitStates[0]),
    getRemovableGarmentSlots(outfitStates[1]),
  ] as const;
  const canComplete = eligible[0].length > 0 && eligible[1].length > 0;
  const names = useMemo(() => [...playerNames] as [string, string], [playerNames]);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>('button')?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [onCancel]);

  const choose = (index: 0 | 1, slot: GarmentSlot) => {
    setSelections((current) => {
      const next: [GarmentSlot | null, GarmentSlot | null] = [current[0], current[1]];
      next[index] = current[index] === slot ? null : slot;
      return next;
    });
  };

  return (
    <div className="garment-dialog" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className="garment-dialog__panel max-w-3xl">
        <header className="garment-dialog__header">
          <div>
            <span className="garment-dialog__source">Thẻ Tư thế · Cả hai</span>
            <h2 id={titleId}>Mỗi người chọn 1 món để bỏ</h2>
            <p id={descriptionId}>Hai lựa chọn chỉ được cập nhật cùng lúc sau khi xác nhận. Hủy sẽ giữ nguyên cả hai nhân vật.</p>
          </div>
          <button type="button" onClick={onCancel} className="garment-dialog__close" aria-label="Hủy và giữ nguyên trang phục"><X aria-hidden="true" /></button>
        </header>

        <div className="grid max-h-[60svh] gap-4 overflow-y-auto p-1 sm:grid-cols-2">
          {([0, 1] as const).map((index) => {
            const present = getPresentGarmentSlots(outfitStates[index]);
            return (
              <section key={index} className="rounded-2xl border border-white/10 bg-black/20 p-3" aria-label={`Chọn đồ của ${names[index]}`}>
                <h3 className="text-center font-serif-romantic text-lg font-bold text-white">{names[index]}</h3>
                <OutfitFigure
                  outfit={outfitStates[index].initial}
                  state={outfitStates[index]}
                  interactiveSlots={eligible[index]}
                  selectedSlot={selections[index]}
                  previewRemovedSlot={selections[index]}
                  onSelectSlot={(slot) => choose(index, slot)}
                  name={names[index]}
                  active
                  className="mx-auto max-h-56"
                />
                <div className="mt-2 grid gap-2">
                  {present.map((slot) => {
                    const allowed = eligible[index].includes(slot);
                    const selected = selections[index] === slot;
                    return (
                      <button key={slot} type="button" disabled={!allowed} aria-pressed={allowed ? selected : undefined} onClick={() => choose(index, slot)} className={`garment-choice ${selected ? 'is-selected' : ''}`}>
                        <span><strong>{GARMENT_LABELS[slot]}</strong><small>{allowed ? 'Có thể chọn' : slot === 'bra' ? 'Cần bỏ áo trước' : 'Cần bỏ quần trước'}</small></span>
                        {allowed ? (selected ? <Check aria-hidden="true" /> : <span className="garment-choice__dot" />) : <Lock aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <footer className="garment-dialog__footer">
          <button type="button" onClick={onCancel} className="garment-dialog__secondary">Hủy, giữ nguyên</button>
          {canComplete ? (
            <button type="button" className="garment-dialog__confirm" disabled={!selections[0] || !selections[1]} onClick={() => selections[0] && selections[1] && onConfirm(selections[0], selections[1])}>
              {selections[0] && selections[1] ? 'Xác nhận bỏ 2 món' : 'Chọn một món của mỗi người'}
            </button>
          ) : (
            <button type="button" className="garment-dialog__confirm" onClick={onContinueWithoutRemoval}>Tiếp tục không bỏ đồ</button>
          )}
        </footer>
      </div>
    </div>
  );
};
