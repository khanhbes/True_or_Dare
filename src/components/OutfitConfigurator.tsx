import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Minus, Plus, Shirt } from 'lucide-react';
import type { GarmentConfig, GarmentSlot, OutfitConfig, PlayerPresentation } from '../types';
import { GARMENT_COLORS, GARMENT_LABELS, getGarmentStyles } from '../utils/wardrobe';
import { OutfitFigure } from './OutfitFigure';

export interface OutfitConfiguratorProps {
  value: OutfitConfig;
  onChange: (outfit: OutfitConfig) => void;
  presentation?: PlayerPresentation;
  label?: string;
  disabled?: boolean;
  className?: string;
}

const SLOT_ORDER: Record<PlayerPresentation, GarmentSlot[]> = {
  male: ['shirt', 'pants', 'underwear'],
  female: ['shirt', 'pants', 'bra', 'underwear'],
};

const FALLBACK_COLOR = '#FF6B9D';

export const OutfitConfigurator: React.FC<OutfitConfiguratorProps> = ({
  value,
  onChange,
  presentation = value.presentation,
  label,
  disabled = false,
  className = '',
}) => {
  const slots = SLOT_ORDER[presentation];
  const [editingSlot, setEditingSlot] = useState<GarmentSlot>(slots[0]);
  const rememberedGarments = useRef<Partial<Record<GarmentSlot, GarmentConfig>>>({ ...value.garments });

  useEffect(() => {
    for (const slot of slots) {
      const garment = value.garments[slot];
      if (garment) rememberedGarments.current[slot] = garment;
    }
  }, [slots, value.garments]);

  useEffect(() => {
    if (!slots.includes(editingSlot)) setEditingSlot(slots[0]);
  }, [editingSlot, slots]);

  const selectedGarment = value.garments[editingSlot];
  const garmentCount = useMemo(() => slots.filter((slot) => Boolean(value.garments[slot])).length, [slots, value.garments]);

  const emitGarments = (garments: OutfitConfig['garments']) => {
    onChange({ presentation, garments });
  };

  const toggleGarment = (slot: GarmentSlot) => {
    if (disabled) return;
    setEditingSlot(slot);
    const garments = { ...value.garments };
    if (garments[slot]) {
      rememberedGarments.current[slot] = garments[slot];
      delete garments[slot];
    } else {
      const fallbackStyle = getGarmentStyles(presentation, slot)[0];
      garments[slot] = rememberedGarments.current[slot] ?? {
        styleId: fallbackStyle?.id ?? 'default',
        color: GARMENT_COLORS[0]?.value ?? FALLBACK_COLOR,
      };
    }
    emitGarments(garments);
  };

  const updateSelectedGarment = (patch: Partial<GarmentConfig>) => {
    if (!selectedGarment || disabled) return;
    const next = { ...selectedGarment, ...patch };
    rememberedGarments.current[editingSlot] = next;
    emitGarments({ ...value.garments, [editingSlot]: next });
  };

  const availableStyles = getGarmentStyles(presentation, editingSlot);

  return (
    <section className={`outfit-configurator ${className}`.trim()} aria-label={label ?? `Trang phục ${presentation === 'male' ? 'nam' : 'nữ'}`}>
      <header className="outfit-configurator__header">
        <div>
          <p className="outfit-configurator__eyebrow">{presentation === 'male' ? 'Nhân vật nam' : 'Nhân vật nữ'}</p>
          <h4>{label ?? (presentation === 'male' ? 'Trang phục của Anh' : 'Trang phục của Em')}</h4>
        </div>
        <span className="outfit-configurator__count" aria-label={`${garmentCount} món đang mặc`}>
          <Shirt aria-hidden="true" /> {garmentCount}/{slots.length}
        </span>
      </header>

      <div className="outfit-configurator__workspace">
        <OutfitFigure
          outfit={{ ...value, presentation }}
          editingSlot={editingSlot}
          selectedSlot={editingSlot}
          compact
          name={label}
        />

        <div className="outfit-configurator__controls">
          <div className="outfit-configurator__slots" aria-label="Chọn các món đồ">
            {slots.map((slot) => {
              const included = Boolean(value.garments[slot]);
              const selected = editingSlot === slot;
              return (
                <div
                  key={slot}
                  role="group"
                  aria-label={GARMENT_LABELS[slot]}
                  className={`grid min-h-12 grid-cols-[minmax(0,1fr)_3rem] overflow-hidden rounded-xl border transition duration-200 motion-reduce:transition-none ${selected ? 'border-rose-400/75 bg-rose-500/[0.12] shadow-[0_0_0_2px_rgba(251,113,133,0.1)]' : included ? 'border-white/10 bg-rose-900/15' : 'border-white/10 bg-white/[0.035]'}`}
                >
                  <button
                    type="button"
                    aria-pressed={selected}
                    disabled={disabled}
                    onClick={() => setEditingSlot(slot)}
                    className="flex min-h-12 min-w-0 flex-col items-start justify-center px-2.5 py-1.5 text-left transition hover:bg-white/[0.055] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-300 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <span className={`truncate text-xs font-bold ${included ? 'text-rose-100' : 'text-neutral-300'}`}>
                      {GARMENT_LABELS[slot]}
                    </span>
                    <span className="text-[9px] font-medium text-neutral-500">
                      {included ? 'Đang mặc · Chạm để chỉnh' : 'Chưa thêm · Chạm để xem'}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`${included ? 'Bỏ' : 'Thêm'} ${GARMENT_LABELS[slot].toLocaleLowerCase('vi')}`}
                    aria-pressed={included}
                    disabled={disabled}
                    onClick={() => toggleGarment(slot)}
                    className={`flex min-h-12 min-w-12 items-center justify-center border-l border-white/10 transition hover:bg-rose-500/20 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-300 disabled:cursor-not-allowed disabled:opacity-45 ${included ? 'text-rose-200' : 'text-neutral-300'}`}
                  >
                    {included ? <Minus className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </div>
              );
            })}
          </div>

          <div className={`outfit-configurator__editor ${selectedGarment ? '' : 'is-disabled'}`} aria-live="polite">
            {selectedGarment ? (
              <>
                <div className="outfit-configurator__field">
                  <span className="outfit-configurator__field-label">Kiểu {GARMENT_LABELS[editingSlot].toLocaleLowerCase('vi')}</span>
                  <div className="outfit-configurator__styles">
                    {availableStyles.map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        disabled={disabled}
                        aria-pressed={selectedGarment.styleId === style.id}
                        onClick={() => updateSelectedGarment({ styleId: style.id })}
                        className={selectedGarment.styleId === style.id ? 'is-selected' : ''}
                      >
                        {selectedGarment.styleId === style.id && <Check aria-hidden="true" />}
                        {style.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="outfit-configurator__field">
                  <span className="outfit-configurator__field-label">Màu sắc</span>
                  <div className="outfit-configurator__palette">
                    {GARMENT_COLORS.map((color) => (
                      <button
                        key={color.id}
                        type="button"
                        disabled={disabled}
                        className={selectedGarment.color.toLowerCase() === color.value.toLowerCase() ? 'is-selected' : ''}
                        style={{ '--swatch-color': color.value } as React.CSSProperties}
                        aria-label={`Màu ${color.label}`}
                        aria-pressed={selectedGarment.color.toLowerCase() === color.value.toLowerCase()}
                        title={color.label}
                        onClick={() => updateSelectedGarment({ color: color.value })}
                      >
                        <span aria-hidden="true" />
                      </button>
                    ))}
                    <label className="outfit-configurator__custom-color" title="Chọn màu tùy ý">
                      <span>Tự chọn</span>
                      <input
                        type="color"
                        disabled={disabled}
                        value={selectedGarment.color}
                        aria-label={`Màu tùy chọn cho ${GARMENT_LABELS[editingSlot].toLocaleLowerCase('vi')}`}
                        onChange={(event) => updateSelectedGarment({ color: event.target.value.toUpperCase() })}
                      />
                    </label>
                  </div>
                </div>
              </>
            ) : (
              <button type="button" disabled={disabled} className="outfit-configurator__add" onClick={() => toggleGarment(editingSlot)}>
                <Plus aria-hidden="true" /> Thêm {GARMENT_LABELS[editingSlot].toLocaleLowerCase('vi')}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
