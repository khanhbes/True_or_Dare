import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AlertCircle, Check, Lock, X } from 'lucide-react';
import type { GarmentSlot, OutfitState } from '../types';
import { GARMENT_LABELS, getPresentGarmentSlots, getRemovableGarmentSlots } from '../utils/wardrobe';
import { OutfitFigure } from './OutfitFigure';

export interface GarmentRemovalDialogProps {
  open?: boolean;
  targetName: string;
  outfitState: OutfitState;
  source: 'card' | 'penalty' | 'preparation';
  onConfirm: (slot: GarmentSlot) => void;
  onCancel: () => void;
  onContinueWithoutRemoval?: () => void;
}

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export const GarmentRemovalDialog: React.FC<GarmentRemovalDialogProps> = ({
  open = true,
  targetName,
  outfitState,
  source,
  onConfirm,
  onCancel,
  onContinueWithoutRemoval,
}) => {
  const [selectedSlot, setSelectedSlot] = useState<GarmentSlot | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);
  const titleId = useId();
  const descriptionId = useId();
  const eligibleSlots = useMemo(() => getRemovableGarmentSlots(outfitState), [outfitState]);
  const presentSlots = useMemo(() => getPresentGarmentSlots(outfitState), [outfitState]);

  onCancelRef.current = onCancel;

  useEffect(() => {
    if (!open) return;
    setSelectedSlot(null);
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Delay one tick so the closing penalty dialog cannot restore focus behind this dialog.
    const focusTimer = window.setTimeout(() => {
      (closeButtonRef.current ?? dialogRef.current)?.focus();
    }, 50);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancelRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable: HTMLElement[] = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)];
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
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

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      previouslyFocused?.focus();
    };
  }, [open, targetName]);

  useEffect(() => {
    if (selectedSlot && !eligibleSlots.includes(selectedSlot)) setSelectedSlot(null);
  }, [eligibleSlots, selectedSlot]);

  if (!open) return null;
  const hasEligibleGarment = eligibleSlots.length > 0;
  const sourceLabel = source === 'card' ? 'Thẻ bài' : source === 'penalty' ? 'Luật phạt' : 'Chuẩn bị Tư thế';

  return (
    <div className="garment-dialog" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="garment-dialog__panel"
      >
        <header className="garment-dialog__header">
          <div>
            <span className="garment-dialog__source">{sourceLabel}</span>
            <h2 id={titleId}>Chọn 1 món của {targetName}</h2>
            <p id={descriptionId}>
              {hasEligibleGarment
                ? 'Chọn trực tiếp trên nhân vật hoặc danh sách. Món đồ chỉ được bỏ sau khi bạn xác nhận.'
                : `${targetName} không còn món đồ nào có thể bỏ ở thời điểm này.`}
            </p>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onCancel} className="garment-dialog__close" aria-label="Đóng và giữ nguyên trang phục">
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="garment-dialog__content">
          <div className="garment-dialog__figure">
            <OutfitFigure
              outfit={outfitState.initial}
              state={outfitState}
              interactiveSlots={eligibleSlots}
              selectedSlot={selectedSlot}
              previewRemovedSlot={selectedSlot}
              onSelectSlot={(slot) => setSelectedSlot((current) => current === slot ? null : slot)}
              name={targetName}
              active
            />
            <p className="garment-dialog__preview-note" aria-live="polite">
              {selectedSlot ? `Đang xem trước: bỏ ${GARMENT_LABELS[selectedSlot].toLocaleLowerCase('vi')}.` : 'Chưa chọn món đồ.'}
            </p>
          </div>

          <div className="garment-dialog__choices">
            {presentSlots.map((slot) => {
              const isEligible = eligibleSlots.includes(slot);
              const isSelected = selectedSlot === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  disabled={!isEligible}
                  aria-pressed={isEligible ? isSelected : undefined}
                  onClick={() => setSelectedSlot(isSelected ? null : slot)}
                  className={`garment-choice ${isSelected ? 'is-selected' : ''}`}
                >
                  <span>
                    <strong>{GARMENT_LABELS[slot]}</strong>
                    <small>{isEligible ? 'Có thể chọn' : slot === 'bra' ? 'Cần bỏ áo trước' : 'Cần bỏ quần trước'}</small>
                  </span>
                  {isEligible ? (isSelected ? <Check aria-hidden="true" /> : <span className="garment-choice__dot" />) : <Lock aria-hidden="true" />}
                </button>
              );
            })}

            {!hasEligibleGarment && (
              <div className="garment-dialog__empty" role="status">
                <AlertCircle aria-hidden="true" />
                <p>Hãy cùng chọn một phương án thay thế mà cả hai đều thoải mái. Trò chơi vẫn có thể tiếp tục.</p>
              </div>
            )}
          </div>
        </div>

        <footer className="garment-dialog__footer">
          <button type="button" onClick={onCancel} className="garment-dialog__secondary">Hủy, giữ nguyên</button>
          {hasEligibleGarment ? (
            <button
              type="button"
              disabled={!selectedSlot}
              className="garment-dialog__confirm"
              onClick={() => selectedSlot && onConfirm(selectedSlot)}
            >
              {selectedSlot ? `Xác nhận bỏ ${GARMENT_LABELS[selectedSlot].toLocaleLowerCase('vi')}` : 'Chọn một món để xác nhận'}
            </button>
          ) : (
            <button type="button" className="garment-dialog__confirm" onClick={onContinueWithoutRemoval ?? onCancel}>Tiếp tục ván chơi</button>
          )}
        </footer>
      </div>
    </div>
  );
};
