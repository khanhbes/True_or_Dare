import React, { useId } from 'react';
import type {
  GarmentConfig,
  GarmentSlot,
  OutfitConfig,
  OutfitState,
  PlayerPresentation,
} from '../types';
import { GARMENT_LABELS, getDisplayGarment, getEquippedGarmentMap } from '../utils/wardrobe';
import './outfit.css';

const LAYER_ORDER: GarmentSlot[] = ['underwear', 'bra', 'pants', 'shirt'];

const HIT_PATHS: Record<PlayerPresentation, Record<GarmentSlot, string>> = {
  male: {
    shirt: 'M88 102C72 106 61 118 58 137l5 27c4 8 8 19 9 34l2 40c19 11 53 11 72 0l2-40c1-15 5-26 9-34l5-27c-3-19-14-31-30-35Z',
    pants: 'M77 202c21-6 45-6 66 0l4 48-5 130c-8 7-21 7-30 1l-3-104-7 104c-9 6-22 5-30-2l7-129Z',
    bra: 'M80 122c19-8 41-8 60 0l8 55c-22 12-54 12-76 0Z',
    underwear: 'M75 196c22-6 48-6 70 0l4 70c-11 8-27 9-39 3-12 6-28 5-39-3Z',
  },
  female: {
    shirt: 'M89 102c-16 5-27 16-30 34l4 46c4 9 9 20 11 34l-2 22c20 13 56 13 76 0l-2-22c2-14 7-25 11-34l4-46c-3-18-14-29-30-34Z',
    pants: 'M74 201c23-7 49-7 72 0l5 48-7 131c-8 7-21 7-30 1l-5-104-6 104c-9 6-22 5-30-2l8-130Z',
    bra: 'M80 122c19-8 41-8 60 0l8 55c-22 12-54 12-76 0Z',
    underwear: 'M71 187c24-7 54-7 78 0l3 75c-11 9-29 10-42 5-13 5-31 4-42-5Z',
  },
};

export interface OutfitFigureProps {
  outfit: OutfitConfig;
  state?: OutfitState;
  remainingSlots?: GarmentSlot[];
  interactiveSlots?: GarmentSlot[];
  selectedSlot?: GarmentSlot | null;
  previewRemovedSlot?: GarmentSlot | null;
  editingSlot?: GarmentSlot | null;
  onSelectSlot?: (slot: GarmentSlot) => void;
  active?: boolean;
  compact?: boolean;
  name?: string;
  className?: string;
  ariaLabel?: string;
}

const normalizeSvgId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '');

const MaleBase = ({ skinId, garments, clipPrefix }: { skinId: string; garments?: Partial<Record<GarmentSlot, GarmentConfig>>; clipPrefix?: string }) => {
  const hasShirt = Boolean(garments?.shirt);
  const hasPants = Boolean(garments?.pants);
  const hasUnderwear = Boolean(garments?.underwear);
  const isShorts = garments?.pants?.styleId === 'shorts';
  const armClip = hasShirt && clipPrefix ? `url(#${clipPrefix}-a)` : undefined;
  const legClip = clipPrefix ? (hasPants ? (isShorts ? `url(#${clipPrefix}-ls)` : `url(#${clipPrefix}-ll)`) : hasUnderwear ? `url(#${clipPrefix}-lu)` : undefined) : undefined;

  return (
    <g className="outfit-figure__body outfit-figure__body--male" aria-hidden="true">
      <g className="outfit-figure__limbs">
        <g clipPath={armClip}>
          <path d="M80 124c-12 15-16 37-13 59 2 17 8 32 16 45" fill="none" stroke={`url(#${skinId})`} strokeLinecap="round" strokeWidth="20" />
          <path d="M140 124c12 16 16 36 13 57-2 16-8 30-15 43" fill="none" stroke={`url(#${skinId})`} strokeLinecap="round" strokeWidth="20" />
        </g>
        <g clipPath={legClip}>
          <path d="M94 231c-1 43-7 96-9 144" fill="none" stroke={`url(#${skinId})`} strokeLinecap="round" strokeWidth="25" />
          <path d="M126 231c4 44 8 95 5 144" fill="none" stroke={`url(#${skinId})`} strokeLinecap="round" strokeWidth="25" />
        </g>
      </g>
      <path d="M82 113c7-9 17-13 28-13 12 0 22 4 29 13 8 12 9 34 4 57-2 15-1 40 2 60-17 12-53 12-70 0 3-20 4-45 2-60-5-23-3-45 5-57Z" fill={`url(#${skinId})`} />
      <path d="M98 82h25l3 27c-7 8-25 8-32 0Z" fill={`url(#${skinId})`} />
      <g transform="rotate(-4 110 59)">
        <ellipse cx="110" cy="59" rx="34" ry="38" fill={`url(#${skinId})`} />
        <circle cx="77" cy="62" r="7" fill="#cf8580" />
        <circle cx="143" cy="62" r="7" fill="#c47c79" />
        <path d="M77 58c-1-27 13-43 35-43 23 0 38 16 36 44-9-2-15-8-19-17-12 10-28 15-50 14Z" fill="#3f2832" />
        <path d="M82 43c8-19 29-27 45-18 7 4 12 10 15 18-20-10-41-9-60 0Z" fill="#593644" opacity=".48" />
        <g className="outfit-figure__eyes" fill="none" stroke="#4b2932" strokeLinecap="round" strokeWidth="2.4">
          <path d="M94 61c2 2 5 2 7 0" />
          <path d="M120 61c2 2 5 2 7 0" />
        </g>
        <path d="M107 73c3 2 7 2 10-1" fill="none" stroke="#8c4750" strokeLinecap="round" strokeWidth="2" />
        <ellipse cx="89" cy="70" rx="7" ry="3.5" fill="#f38d96" opacity=".3" />
        <ellipse cx="133" cy="69" rx="7" ry="3.5" fill="#f38d96" opacity=".28" />
      </g>
      <path d="M74 221c5 3 11 2 15-2M135 218c5 4 11 4 15 0" fill="none" stroke="#9e5b60" strokeLinecap="round" strokeWidth="2" opacity=".52" />
      <path d="M72 382c9-4 19-3 27 2l4 9c-11 6-33 6-43 0 1-5 5-9 12-11Zm52 2c9-5 20-4 27 1 6 4 8 8 8 11-11 5-31 4-41-2Z" fill="#8e5658" />
    </g>
  );
};

const FemaleBase = ({ skinId, garments, clipPrefix }: { skinId: string; garments?: Partial<Record<GarmentSlot, GarmentConfig>>; clipPrefix?: string }) => {
  const hasShirt = Boolean(garments?.shirt);
  const isCamisole = garments?.shirt?.styleId === 'camisole';
  const hasPants = Boolean(garments?.pants);
  const hasUnderwear = Boolean(garments?.underwear);
  const isShorts = garments?.pants?.styleId === 'shorts';
  const armClip = hasShirt && !isCamisole && clipPrefix ? `url(#${clipPrefix}-a)` : undefined;
  const legClip = clipPrefix ? (hasPants ? (isShorts ? `url(#${clipPrefix}-ls)` : `url(#${clipPrefix}-ll)`) : hasUnderwear ? `url(#${clipPrefix}-lu)` : undefined) : undefined;

  return (
    <g className="outfit-figure__body outfit-figure__body--female" aria-hidden="true">
      <path d="M79 52c-3-25 10-39 31-39 27 0 42 19 38 50l-2 41c-8 13-21 19-35 16l-22-12c-8-17-11-35-10-56Z" fill="#4c2b3b" />
      <g className="outfit-figure__limbs">
        <g clipPath={armClip}>
          <path d="M81 124c-12 16-15 38-11 59 3 17 8 32 15 45" fill="none" stroke={`url(#${skinId})`} strokeLinecap="round" strokeWidth="19" />
          <path d="M139 124c12 15 15 34 11 53-3 15-9 28-16 40" fill="none" stroke={`url(#${skinId})`} strokeLinecap="round" strokeWidth="19" />
        </g>
        <g clipPath={legClip}>
          <path d="M95 232c-3 43-8 95-6 143" fill="none" stroke={`url(#${skinId})`} strokeLinecap="round" strokeWidth="24" />
          <path d="M125 232c7 43 11 94 5 143" fill="none" stroke={`url(#${skinId})`} strokeLinecap="round" strokeWidth="24" />
        </g>
      </g>
      <path d="M84 113c7-9 16-13 26-13 11 0 20 4 27 13 8 12 8 33 3 55-3 13-1 24 2 37 2 8 3 17 3 25-17 13-53 13-70 0 0-8 1-17 3-25 3-13 5-24 2-37-5-22-4-43 4-55Z" fill={`url(#${skinId})`} />
      <path d="M98 82h24l4 27c-7 8-25 8-32 0Z" fill={`url(#${skinId})`} />
      <g transform="rotate(4 110 59)">
        <ellipse cx="110" cy="59" rx="33" ry="38" fill={`url(#${skinId})`} />
        <circle cx="78" cy="62" r="6.5" fill="#cf8580" />
        <circle cx="142" cy="62" r="6.5" fill="#c47c79" />
        <path d="M78 56c0-27 13-42 35-42 22 0 36 16 35 43-9-1-16-7-20-17-11 11-28 17-50 16Z" fill="#4c2b3b" />
        <path d="M82 40c11-18 31-23 47-13 6 4 10 9 13 15-17-9-40-10-60-2Z" fill="#714056" opacity=".48" />
        <g className="outfit-figure__eyes" fill="none" stroke="#4b2932" strokeLinecap="round" strokeWidth="2.4">
          <path d="M94 62c2 2 5 2 7 0" />
          <path d="M120 62c2 2 5 2 7 0" />
        </g>
        <path d="M106 73c4 3 8 3 12 0" fill="none" stroke="#8c4750" strokeLinecap="round" strokeWidth="2" />
        <ellipse cx="89" cy="70" rx="7" ry="3.5" fill="#f38d96" opacity=".33" />
        <ellipse cx="133" cy="70" rx="7" ry="3.5" fill="#f38d96" opacity=".31" />
      </g>
      <path d="M76 222c5 4 11 3 15-1M132 213c5 4 11 4 15 0" fill="none" stroke="#9e5b60" strokeLinecap="round" strokeWidth="2" opacity=".52" />
      <path d="M77 382c8-5 19-4 27 1l2 9c-12 6-32 6-42 0 1-4 6-8 13-10Zm46 2c9-5 20-4 27 1 5 3 8 7 8 10-11 5-30 4-41-2Z" fill="#995d61" />
    </g>
  );
};

const MaleShirt = ({ garment }: { garment: GarmentConfig }) => {
  const fill = garment.color;
  if (garment.styleId === 'hoodie') {
    return (
      <>
        <path d="M91 102c8-5 30-5 38 0c10 3 19 8 25 15c6 8 9 20 8 33l-12 5c-2-7-4-14-6-20c1 28 3 66 4 103c-18 12-58 12-76 0c1-37 3-75 4-103c-2 6-4 13-6 20l-12-5c-1-13 2-25 8-33c6-7 15-12 25-15Z" fill={fill} />
        <path d="M89 104c0-16 42-16 42 0-3 16-14 24-21 24s-18-8-21-24Z" fill="#28141e" opacity=".22" />
        <path d="M83 192c16-7 38-7 54 0l3 24c-18 8-42 8-60 0Z" fill="#28141e" opacity=".16" />
        <path d="M101 119v30m18-30v30" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".55" strokeWidth="2" />
        <circle cx="101" cy="150" r="2" fill="#fff" opacity=".72" />
        <circle cx="119" cy="150" r="2" fill="#fff" opacity=".72" />
      </>
    );
  }
  if (garment.styleId === 'button_shirt') {
    return (
      <>
        <path d="M91 102c8-4 30-4 38 0c10 3 19 8 25 15c6 7 9 19 8 31l-12 5c-2-6-4-12-6-18c1 28 3 66 4 103c-18 12-58 12-76 0c1-37 3-75 4-103c-2 6-4 12-6 18l-12-5c-1-12 2-24 8-31c6-7 15-12 25-15Z" fill={fill} />
        <path d="m93 102 17 21 17-21m-17 21v116" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".56" strokeWidth="2" />
        {[142, 161, 180, 199].map((y) => <circle key={y} cx="110" cy={y} r="1.8" fill="#fff" opacity=".72" />)}
        <path d="M117 150h13v16h-13" fill="none" stroke="#fff" strokeOpacity=".34" strokeWidth="1.7" />
        <path d="M74 236c18 6 44 6 62 0" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="2" />
      </>
    );
  }
  return (
    <>
      <path d="M91 102c8-4 30-4 38 0c10 3 19 8 25 15c6 7 9 19 8 31l-12 5c-2-6-4-12-6-18c1 28 3 66 4 103c-18 12-58 12-76 0c1-37 3-75 4-103c-2 6-4 12-6 18l-12-5c-1-12 2-24 8-31c6-7 15-12 25-15Z" fill={fill} />
      <path d="M93 102c3 13 31 13 34 0" fill="#2c1822" opacity=".22" />
      <path d="M74 236c18 6 44 6 62 0" fill="none" stroke="#fff" strokeOpacity=".3" strokeWidth="2.2" />
    </>
  );
};

const FemaleShirt = ({ garment }: { garment: GarmentConfig }) => {
  const fill = garment.color;
  if (garment.styleId === 'camisole') {
    return (
      <>
        <path d="M91 103h7v23c7 6 17 6 24 0v-23h7v23c8 16 12 36 14 57c1 17 3 38 5 60c-18 14-58 14-76 0c1-22 3-43 5-60c2-21 7-41 14-57Z" fill={fill} />
        <path d="M80 182c16 7 40 7 56 0m-58 34c18 8 44 8 62 0" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".38" strokeWidth="2.1" />
      </>
    );
  }
  if (garment.styleId === 'blouse') {
    return (
      <>
        <path d="M91 102c8-4 30-4 38 0c10 3 19 8 25 15c6 8 9 20 8 33l-4 31-18-4 5-37 3 102c-18 13-56 13-76 0l3-102 5 37-18 4-4-31c-1-13 2-25 8-33c6-7 15-12 25-15Z" fill={fill} />
        <path d="M93 102c2 14 32 14 34 0M72 240c18 8 44 8 62 0" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".44" strokeWidth="2.1" />
        <path d="M104 114c0 7 3 10 6 10s6-3 6-10" fill="#fff" opacity=".18" />
        <circle cx="110" cy="144" r="1.8" fill="#fff" opacity=".7" />
        <circle cx="110" cy="165" r="1.8" fill="#fff" opacity=".7" />
      </>
    );
  }
  return (
    <>
      <path d="M91 102c8-4 30-4 38 0c10 3 19 8 24 14c6 8 9 20 8 31l-12 5c-2-6-4-12-6-18c0 30 2 68 3 108c-17 13-55 13-72 0c1-40 3-78 3-108c-2 6-4 12-6 18l-12-5c-1-11 2-23 8-31c5-6 14-11 24-14Z" fill={fill} />
      <path d="M93 102c3 13 31 13 34 0" fill="#2c1822" opacity=".22" />
      <path d="M72 240c18 8 44 8 62 0" fill="none" stroke="#fff" strokeOpacity=".3" strokeWidth="2.2" />
    </>
  );
};

const MalePants = ({ garment }: { garment: GarmentConfig }) => {
  const isShorts = garment.styleId === 'shorts';
  const isJeans = garment.styleId === 'jeans';
  if (isShorts) {
    return (
      <>
        <path d="M75 198c21-6 49-6 70 0l1 53-3 22c-9 5-22 6-32 1l-2-27-5 27c-10 5-23 4-32-2l2-21Z" fill={garment.color} />
        <path d="M77 208c20 6 46 6 66 0m-33 1-1 38" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".4" strokeWidth="2.1" />
        <path d="M78 232c9 1 17-3 21-13m42 13c-9 1-17-3-21-13" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="1.7" />
      </>
    );
  }
  return (
    <>
      <path d="M75 198c21-6 49-6 70 0l1 51-4 129c-8 6-20 6-29 1l-4-108-7 109c-9 5-21 4-29-2l6-129Z" fill={garment.color} />
      <path d="M77 208c20 6 46 6 66 0m-33 1-1 62" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".38" strokeWidth="2.1" />
      {isJeans ? (
        <>
          <path d="M78 232c9 1 17-4 21-14m42 14c-9 1-17-4-21-14" fill="none" stroke="#fff" strokeOpacity=".32" strokeWidth="1.7" />
          <path d="M75 356c8 3 17 3 25 1m15 0c8 3 17 3 25 0" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="2.1" />
        </>
      ) : (
        <path d="M91 215 84 373m43-158 6 158" fill="none" stroke="#fff" strokeOpacity=".17" strokeWidth="1.7" />
      )}
    </>
  );
};

const FemalePants = ({ garment }: { garment: GarmentConfig }) => {
  const isShorts = garment.styleId === 'shorts';
  const isJeans = garment.styleId === 'jeans';
  if (isShorts) {
    return (
      <>
        <path d="M72 194c23-7 53-7 76 0l1 55-3 21c-10 7-24 8-35 3l-2-28-5 28c-11 5-25 4-35-3l2-21Z" fill={garment.color} />
        <path d="M74 205c22 7 50 7 72 0m-36 1-1 39" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".4" strokeWidth="2.1" />
        <path d="M75 230c10 2 19-3 23-14m47 14c-10 2-19-3-23-14" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="1.7" />
      </>
    );
  }
  return (
    <>
      <path d="M72 194c23-7 53-7 76 0l1 53-6 131c-8 6-20 6-29 1l-5-108-6 109c-9 5-21 4-29-2l7-131Z" fill={garment.color} />
      <path d="M74 205c22 7 50 7 72 0m-36 1-1 65" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".38" strokeWidth="2.1" />
      {isJeans ? (
        <>
          <path d="M75 230c10 2 19-3 23-15m47 15c-10 2-19-3-23-15" fill="none" stroke="#fff" strokeOpacity=".32" strokeWidth="1.7" />
          <path d="M76 356c8 3 17 3 25 1m15 0c8 3 17 3 25 0" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="2.1" />
        </>
      ) : (
        <path d="M91 212 85 373m42-161 5 161" fill="none" stroke="#fff" strokeOpacity=".17" strokeWidth="1.7" />
      )}
    </>
  );
};

const MaleUnderwear = ({ garment }: { garment: GarmentConfig }) => {
  if (garment.styleId === 'briefs') {
    return (
      <>
        <path d="M76 202c21-6 47-6 68 0l-6 38c-7 10-17 18-28 24-11-6-21-14-28-24Z" fill={garment.color} />
        <path d="M78 211c19 6 45 6 64 0m-32 2v39" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".42" strokeWidth="2.1" />
      </>
    );
  }
  const isBoxers = garment.styleId === 'boxers';
  return (
    <>
      <path d={`M75 200c22-6 48-6 70 0l${isBoxers ? '3 67c-10 7-24 8-36 2l-2-30-4 30c-12 6-26 5-36-2Z' : '1 59c-9 7-22 8-32 3l-3-28-4 28c-10 5-23 4-32-3Z'}`} fill={garment.color} />
      <path d="M77 211c20 6 46 6 66 0m-33 2-1 29" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".42" strokeWidth="2.1" />
      {isBoxers && <path d="M84 226h12m28 0h12" stroke="#fff" strokeLinecap="round" strokeOpacity=".3" strokeWidth="1.7" />}
    </>
  );
};

const FemaleBra = ({ garment }: { garment: GarmentConfig }) => {
  if (garment.styleId === 'sports_bra') {
    return (
      <>
        <path d="M84 128c16-6 36-6 52 0l7 45c-18 9-48 9-66 0Z" fill={garment.color} />
        <path d="m88 131 9-22m35 22-9-22M79 169c18 7 44 7 62 0" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".48" strokeWidth="2.3" />
      </>
    );
  }
  if (garment.styleId === 'bralette') {
    return (
      <>
        <path d="m77 173 9-43 24 24 24-24 9 43c-16 11-50 11-66 0Z" fill={garment.color} />
        <path d="m88 133 9-24m35 24-9-24M79 169c18 7 44 7 62 0" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".48" strokeWidth="2.3" />
        <path d="m87 131 23 23 23-23" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="1.7" />
      </>
    );
  }
  return (
    <>
      <path d="M77 152c2-15 13-20 33-3 20-17 31-12 33 3l-2 23c-19 8-43 8-62 0Z" fill={garment.color} />
      <path d="M110 149v28m-30-23-7-22m67 22 7-22M80 171c18 7 42 7 60 0" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".48" strokeWidth="2.2" />
    </>
  );
};

const FemaleUnderwear = ({ garment }: { garment: GarmentConfig }) => {
  if (garment.styleId === 'high_waist') {
    return (
      <>
        <path d="M73 190c22-7 52-7 74 0l-9 59c-8 9-18 15-28 20-10-5-20-11-28-20Z" fill={garment.color} />
        <path d="M75 201c21 7 49 7 70 0" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".48" strokeWidth="2.3" />
      </>
    );
  }
  if (garment.styleId === 'boyshort') {
    return (
      <>
        <path d="M72 199c23-7 53-7 76 0l2 59c-10 8-25 9-37 4l-3-25-4 25c-12 5-27 4-37-4Z" fill={garment.color} />
        <path d="M74 210c22 7 50 7 72 0" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".48" strokeWidth="2.3" />
      </>
    );
  }
  return (
    <>
      <path d="M72 199c13 3 26 10 38 21 12-11 25-18 38-21l-11 53c-8 8-17 13-27 17-10-4-19-9-27-17Z" fill={garment.color} />
      <path d="M75 204c12 4 24 10 35 19 11-9 23-15 35-19" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".48" strokeWidth="2.2" />
    </>
  );
};

const GarmentArtwork = ({ presentation, slot, garment }: { presentation: PlayerPresentation; slot: GarmentSlot; garment: GarmentConfig }) => {
  if (slot === 'shirt') return presentation === 'male' ? <MaleShirt garment={garment} /> : <FemaleShirt garment={garment} />;
  if (slot === 'pants') return presentation === 'male' ? <MalePants garment={garment} /> : <FemalePants garment={garment} />;
  if (slot === 'bra') return <FemaleBra garment={garment} />;
  return presentation === 'male' ? <MaleUnderwear garment={garment} /> : <FemaleUnderwear garment={garment} />;
};

export const OutfitFigure: React.FC<OutfitFigureProps> = ({
  outfit,
  state,
  remainingSlots,
  interactiveSlots = [],
  selectedSlot = null,
  previewRemovedSlot = null,
  editingSlot = null,
  onSelectSlot,
  active = false,
  compact = false,
  name,
  className = '',
  ariaLabel,
}) => {
  const generatedId = normalizeSvgId(useId());
  const skinId = `outfit-skin-${generatedId}`;
  const runtimeGarments = state ? getEquippedGarmentMap(state) : null;
  const visibleSlots = new Set(
    remainingSlots ?? (runtimeGarments ? Object.keys(runtimeGarments) : Object.keys(outfit.garments)) as GarmentSlot[],
  );
  const interactive = new Set(interactiveSlots);
  const presentation = outfit.presentation;
  const clipId = `oc-${generatedId}`;
  const visibleGarments: Partial<Record<GarmentSlot, GarmentConfig>> = {};
  for (const slot of LAYER_ORDER) {
    const garment = runtimeGarments?.[slot] ?? outfit.garments[slot];
    if (visibleSlots.has(slot) && garment) {
      visibleGarments[slot] = 'originPresentation' in garment
        ? getDisplayGarment(garment, presentation)
        : garment;
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<SVGGElement>, slot: GarmentSlot) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelectSlot?.(slot);
    }
  };

  return (
    <figure
      className={`outfit-figure ${compact ? 'outfit-figure--compact' : ''} ${active ? 'outfit-figure--active' : ''} ${className}`.trim()}
      aria-label={ariaLabel ?? `${name || (presentation === 'male' ? 'Nam' : 'Nữ')} và trang phục hiện có`}
    >
      <div className="outfit-figure__halo" aria-hidden="true" />
      <svg
        className="outfit-figure__svg"
        viewBox="0 0 220 420"
        role={interactive.size > 0 ? 'group' : undefined}
        aria-label={interactive.size > 0 ? 'Các món đồ có thể chọn' : undefined}
        aria-hidden={interactive.size === 0 ? true : undefined}
      >
        <defs>
          <linearGradient id={skinId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f2b7aa" />
            <stop offset=".55" stopColor="#dc9189" />
            <stop offset="1" stopColor="#bd7072" />
          </linearGradient>
          <clipPath id={`${clipId}-a`}><rect x="0" y="155" width="220" height="280" /></clipPath>
          <clipPath id={`${clipId}-ll`}><rect x="0" y="376" width="220" height="50" /></clipPath>
          <clipPath id={`${clipId}-ls`}><rect x="0" y="268" width="220" height="160" /></clipPath>
          <clipPath id={`${clipId}-lu`}><rect x="0" y="256" width="220" height="180" /></clipPath>
        </defs>
        <ellipse className="outfit-figure__ground" cx="110" cy="398" rx="58" ry="9" aria-hidden="true" />
        <g className="outfit-figure__character">
          <g className="outfit-figure__breath">
            {presentation === 'male' ? <MaleBase skinId={skinId} garments={visibleGarments} clipPrefix={clipId} /> : <FemaleBase skinId={skinId} garments={visibleGarments} clipPrefix={clipId} />}
            {LAYER_ORDER.map((slot) => {
              const garment = visibleGarments[slot];
              if (!garment || !visibleSlots.has(slot)) return null;
              const canInteract = interactive.has(slot) && Boolean(onSelectSlot);
              const isPreviewRemoved = previewRemovedSlot === slot;
              const shouldDim = (editingSlot === 'bra' && slot === 'shirt') || (editingSlot === 'underwear' && slot === 'pants');
              const hitPath = HIT_PATHS[presentation][slot];

              return (
                <g
                  key={slot}
                  role={canInteract ? 'button' : undefined}
                  tabIndex={canInteract ? 0 : undefined}
                  aria-label={canInteract ? `${isPreviewRemoved ? 'Giữ lại' : 'Chọn bỏ'} ${GARMENT_LABELS[slot].toLocaleLowerCase('vi')}` : undefined}
                  aria-pressed={canInteract ? selectedSlot === slot : undefined}
                  onClick={canInteract ? () => onSelectSlot?.(slot) : undefined}
                  onKeyDown={canInteract ? (event) => handleKeyDown(event, slot) : undefined}
                  className={`outfit-figure__garment outfit-figure__garment--${slot} ${canInteract ? 'is-interactive' : ''} ${selectedSlot === slot ? 'is-selected' : ''} ${isPreviewRemoved ? 'is-preview-removed' : ''} ${shouldDim ? 'is-dimmed' : ''}`}
                  data-slot={slot}
                >
                  <g className="outfit-figure__garment-artwork">
                    <GarmentArtwork presentation={presentation} slot={slot} garment={garment} />
                  </g>
                  {hitPath && (
                    <>
                      <path className="outfit-figure__selection-outline" d={hitPath} />
                      <path className="outfit-figure__hit-area" d={hitPath} />
                    </>
                  )}
                </g>
              );
            })}
          </g>
        </g>
      </svg>
      {name && <figcaption className="outfit-figure__name">{name}</figcaption>}
    </figure>
  );
};
