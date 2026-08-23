/**
 * OutfitFigure — React Native port using react-native-svg.
 * Renders avatar body, hair, eyes, limbs, clothes layers (shirt, pants, bra, underwear)
 * with accurate SVG paths from web implementation.
 */
import React, { useId } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  ClipPath,
  Rect,
  Ellipse,
  Circle,
  G,
  Path,
} from 'react-native-svg';
import type {
  GarmentConfig,
  GarmentSlot,
  OutfitConfig,
  OutfitState,
  PlayerPresentation,
} from '@/shared/types';
import { getDisplayGarment, getEquippedGarmentMap } from '@/shared/utils/wardrobe';
import { COLORS, FONTS } from '@/theme';

const LAYER_ORDER: GarmentSlot[] = ['underwear', 'bra', 'pants', 'shirt'];

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
  width?: number;
  height?: number;
}

const MaleBase = ({
  skinId,
  garments,
  clipPrefix,
}: {
  skinId: string;
  garments?: Partial<Record<GarmentSlot, GarmentConfig>>;
  clipPrefix?: string;
}) => {
  const hasShirt = Boolean(garments?.shirt);
  const hasPants = Boolean(garments?.pants);
  const hasUnderwear = Boolean(garments?.underwear);
  const isShorts = garments?.pants?.styleId === 'shorts';
  const armClip = hasShirt && clipPrefix ? `url(#${clipPrefix}-a)` : undefined;
  const legClip = clipPrefix
    ? hasPants
      ? isShorts
        ? `url(#${clipPrefix}-ls)`
        : `url(#${clipPrefix}-ll)`
      : hasUnderwear
      ? `url(#${clipPrefix}-lu)`
      : undefined
    : undefined;

  return (
    <G>
      <G>
        <G clipPath={armClip}>
          <Path
            d="M80 124c-12 15-16 37-13 59 2 17 8 32 16 45"
            fill="none"
            stroke={`url(#${skinId})`}
            strokeLinecap="round"
            strokeWidth="20"
          />
          <Path
            d="M140 124c12 16 16 36 13 57-2 16-8 30-15 43"
            fill="none"
            stroke={`url(#${skinId})`}
            strokeLinecap="round"
            strokeWidth="20"
          />
        </G>
        <G clipPath={legClip}>
          <Path
            d="M94 231c-1 43-7 96-9 144"
            fill="none"
            stroke={`url(#${skinId})`}
            strokeLinecap="round"
            strokeWidth="25"
          />
          <Path
            d="M126 231c4 44 8 95 5 144"
            fill="none"
            stroke={`url(#${skinId})`}
            strokeLinecap="round"
            strokeWidth="25"
          />
        </G>
      </G>
      <Path
        d="M82 113c7-9 17-13 28-13 12 0 22 4 29 13 8 12 9 34 4 57-2 15-1 40 2 60-17 12-53 12-70 0 3-20 4-45 2-60-5-23-3-45 5-57Z"
        fill={`url(#${skinId})`}
      />
      <Path d="M98 82h25l3 27c-7 8-25 8-32 0Z" fill={`url(#${skinId})`} />
      <G transform="rotate(-4 110 59)">
        <Ellipse cx="110" cy="59" rx="34" ry="38" fill={`url(#${skinId})`} />
        <Circle cx="77" cy="62" r="7" fill="#cf8580" />
        <Circle cx="143" cy="62" r="7" fill="#c47c79" />
        <Path
          d="M77 58c-1-27 13-43 35-43 23 0 38 16 36 44-9-2-15-8-19-17-12 10-28 15-50 14Z"
          fill="#3f2832"
        />
        <Path
          d="M82 43c8-19 29-27 45-18 7 4 12 10 15 18-20-10-41-9-60 0Z"
          fill="#593644"
          opacity={0.48}
        />
        <G fill="none" stroke="#4b2932" strokeLinecap="round" strokeWidth="2.4">
          <Path d="M94 61c2 2 5 2 7 0" />
          <Path d="M120 61c2 2 5 2 7 0" />
        </G>
        <Path
          d="M107 73c3 2 7 2 10-1"
          fill="none"
          stroke="#8c4750"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <Ellipse cx="89" cy="70" rx="7" ry="3.5" fill="#f38d96" opacity={0.3} />
        <Ellipse cx="133" cy="69" rx="7" ry="3.5" fill="#f38d96" opacity={0.28} />
      </G>
      <Path
        d="M74 221c5 3 11 2 15-2M135 218c5 4 11 4 15 0"
        fill="none"
        stroke="#9e5b60"
        strokeLinecap="round"
        strokeWidth="2"
        opacity={0.52}
      />
      <Path
        d="M72 382c9-4 19-3 27 2l4 9c-11 6-33 6-43 0 1-5 5-9 12-11Zm52 2c9-5 20-4 27 1 6 4 8 8 8 11-11 5-31 4-41-2Z"
        fill="#8e5658"
      />
    </G>
  );
};

const FemaleBase = ({
  skinId,
  garments,
  clipPrefix,
}: {
  skinId: string;
  garments?: Partial<Record<GarmentSlot, GarmentConfig>>;
  clipPrefix?: string;
}) => {
  const hasShirt = Boolean(garments?.shirt);
  const isCamisole = garments?.shirt?.styleId === 'camisole';
  const hasPants = Boolean(garments?.pants);
  const hasUnderwear = Boolean(garments?.underwear);
  const isShorts = garments?.pants?.styleId === 'shorts';
  const armClip = hasShirt && !isCamisole && clipPrefix ? `url(#${clipPrefix}-a)` : undefined;
  const legClip = clipPrefix
    ? hasPants
      ? isShorts
        ? `url(#${clipPrefix}-ls)`
        : `url(#${clipPrefix}-ll)`
      : hasUnderwear
      ? `url(#${clipPrefix}-lu)`
      : undefined
    : undefined;

  return (
    <G>
      <Path
        d="M79 52c-3-25 10-39 31-39 27 0 42 19 38 50l-2 41c-8 13-21 19-35 16l-22-12c-8-17-11-35-10-56Z"
        fill="#4c2b3b"
      />
      <G>
        <G clipPath={armClip}>
          <Path
            d="M81 124c-12 16-15 38-11 59 3 17 8 32 15 45"
            fill="none"
            stroke={`url(#${skinId})`}
            strokeLinecap="round"
            strokeWidth="19"
          />
          <Path
            d="M139 124c12 15 15 34 11 53-3 15-9 28-16 40"
            fill="none"
            stroke={`url(#${skinId})`}
            strokeLinecap="round"
            strokeWidth="19"
          />
        </G>
        <G clipPath={legClip}>
          <Path
            d="M95 232c-3 43-8 95-6 143"
            fill="none"
            stroke={`url(#${skinId})`}
            strokeLinecap="round"
            strokeWidth="24"
          />
          <Path
            d="M125 232c7 43 11 94 5 143"
            fill="none"
            stroke={`url(#${skinId})`}
            strokeLinecap="round"
            strokeWidth="24"
          />
        </G>
      </G>
      <Path
        d="M84 113c7-9 16-13 26-13 11 0 20 4 27 13 8 12 8 33 3 55-3 13-1 24 2 37 2 8 3 17 3 25-17 13-53 13-70 0 0-8 1-17 3-25 3-13 5-24 2-37-5-22-4-43 4-55Z"
        fill={`url(#${skinId})`}
      />
      <Path d="M98 82h24l4 27c-7 8-25 8-32 0Z" fill={`url(#${skinId})`} />
      <G transform="rotate(4 110 59)">
        <Ellipse cx="110" cy="59" rx="33" ry="38" fill={`url(#${skinId})`} />
        <Circle cx="78" cy="62" r="6.5" fill="#cf8580" />
        <Circle cx="142" cy="62" r="6.5" fill="#c47c79" />
        <Path
          d="M78 56c0-27 13-42 35-42 22 0 36 16 35 43-9-1-16-7-20-17-11 11-28 17-50 16Z"
          fill="#4c2b3b"
        />
        <Path
          d="M82 40c11-18 31-23 47-13 6 4 10 9 13 15-17-9-40-10-60-2Z"
          fill="#714056"
          opacity={0.48}
        />
        <G fill="none" stroke="#4b2932" strokeLinecap="round" strokeWidth="2.4">
          <Path d="M94 62c2 2 5 2 7 0" />
          <Path d="M120 62c2 2 5 2 7 0" />
        </G>
        <Path
          d="M106 73c4 3 8 3 12 0"
          fill="none"
          stroke="#8c4750"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <Ellipse cx="89" cy="70" rx="7" ry="3.5" fill="#f38d96" opacity={0.33} />
        <Ellipse cx="133" cy="70" rx="7" ry="3.5" fill="#f38d96" opacity={0.31} />
      </G>
      <Path
        d="M76 222c5 4 11 3 15-1M132 213c5 4 11 4 15 0"
        fill="none"
        stroke="#9e5b60"
        strokeLinecap="round"
        strokeWidth="2"
        opacity={0.52}
      />
      <Path
        d="M77 382c8-5 19-4 27 1l2 9c-12 6-32 6-42 0 1-4 6-8 13-10Zm46 2c9-5 20-4 27 1 5 3 8 7 8 10-11 5-30 4-41-2Z"
        fill="#995d61"
      />
    </G>
  );
};

const MaleShirt = ({ garment }: { garment: GarmentConfig }) => {
  const fill = garment.color;
  if (garment.styleId === 'hoodie') {
    return (
      <G>
        <Path
          d="M91 102c8-5 30-5 38 0c10 3 19 8 25 15c6 8 9 20 8 33l-12 5c-2-7-4-14-6-20c1 28 3 66 4 103c-18 12-58 12-76 0c1-37 3-75 4-103c-2 6-4 13-6 20l-12-5c-1-13 2-25 8-33c6-7 15-12 25-15Z"
          fill={fill}
        />
        <Path d="M89 104c0-16 42-16 42 0-3 16-14 24-21 24s-18-8-21-24Z" fill="#28141e" opacity={0.22} />
        <Path d="M83 192c16-7 38-7 54 0l3 24c-18 8-42 8-60 0Z" fill="#28141e" opacity={0.16} />
        <Path d="M101 119v30m18-30v30" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity={0.55} strokeWidth="2" />
        <Circle cx="101" cy="150" r="2" fill="#fff" opacity={0.72} />
        <Circle cx="119" cy="150" r="2" fill="#fff" opacity={0.72} />
      </G>
    );
  }
  if (garment.styleId === 'button_shirt') {
    return (
      <G>
        <Path
          d="M91 102c8-4 30-4 38 0c10 3 19 8 25 15c6 7 9 19 8 31l-12 5c-2-6-4-12-6-18c1 28 3 66 4 103c-18 12-58 12-76 0c1-37 3-75 4-103c-2 6-4 12-6 18l-12-5c-1-12 2-24 8-31c6-7 15-12 25-15Z"
          fill={fill}
        />
        <Path d="m93 102 17 21 17-21m-17 21v116" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity={0.56} strokeWidth="2" />
        {[142, 161, 180, 199].map((y) => (
          <Circle key={y} cx="110" cy={y} r="1.8" fill="#fff" opacity={0.72} />
        ))}
        <Path d="M117 150h13v16h-13" fill="none" stroke="#fff" strokeOpacity={0.34} strokeWidth="1.7" />
        <Path d="M74 236c18 6 44 6 62 0" fill="none" stroke="#fff" strokeOpacity={0.28} strokeWidth="2" />
      </G>
    );
  }
  return (
    <G>
      <Path
        d="M91 102c8-4 30-4 38 0c10 3 19 8 25 15c6 7 9 19 8 31l-12 5c-2-6-4-12-6-18c1 28 3 66 4 103c-18 12-58 12-76 0c1-37 3-75 4-103c-2 6-4 12-6 18l-12-5c-1-12 2-24 8-31c6-7 15-12 25-15Z"
        fill={fill}
      />
      <Path d="M93 102c3 13 31 13 34 0" fill="#2c1822" opacity={0.22} />
      <Path d="M74 236c18 6 44 6 62 0" fill="none" stroke="#fff" strokeOpacity={0.3} strokeWidth="2.2" />
    </G>
  );
};

const FemaleShirt = ({ garment }: { garment: GarmentConfig }) => {
  const fill = garment.color;
  if (garment.styleId === 'camisole') {
    return (
      <G>
        <Path
          d="M91 103h7v23c7 6 17 6 24 0v-23h7v23c8 16 12 36 14 57c1 17 3 38 5 60c-18 14-58 14-76 0c1-22 3-43 5-60c2-21 7-41 14-57Z"
          fill={fill}
        />
        <Path d="M80 182c16 7 40 7 56 0m-58 34c18 8 44 8 62 0" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity={0.38} strokeWidth="2.1" />
      </G>
    );
  }
  if (garment.styleId === 'blouse') {
    return (
      <G>
        <Path
          d="M91 102c8-4 30-4 38 0c10 3 19 8 25 15c6 8 9 20 8 33l-4 31-18-4 5-37 3 102c-18 13-56 13-76 0l3-102 5 37-18 4-4-31c-1-13 2-25 8-33c6-7 15-12 25-15Z"
          fill={fill}
        />
        <Path d="M93 102c2 14 32 14 34 0M72 240c18 8 44 8 62 0" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity={0.44} strokeWidth="2.1" />
        <Path d="M104 114c0 7 3 10 6 10s6-3 6-10" fill="#fff" opacity={0.18} />
        <Circle cx="110" cy="144" r="1.8" fill="#fff" opacity={0.7} />
        <Circle cx="110" cy="165" r="1.8" fill="#fff" opacity={0.7} />
      </G>
    );
  }
  return (
    <G>
      <Path
        d="M91 102c8-4 30-4 38 0c10 3 19 8 24 14c6 8 9 20 8 31l-12 5c-2-6-4-12-6-18c0 30 2 68 3 108c-17 13-55 13-72 0c1-40 3-78 3-108c-2 6-4 12-6 18l-12-5c-1-11 2-23 8-31c5-6 14-11 24-14Z"
        fill={fill}
      />
      <Path d="M93 102c3 13 31 13 34 0" fill="#2c1822" opacity={0.22} />
      <Path d="M72 240c18 8 44 8 62 0" fill="none" stroke="#fff" strokeOpacity={0.3} strokeWidth="2.2" />
    </G>
  );
};

const MalePants = ({ garment }: { garment: GarmentConfig }) => {
  const isShorts = garment.styleId === 'shorts';
  const isJeans = garment.styleId === 'jeans';
  if (isShorts) {
    return (
      <G>
        <Path
          d="M75 198c21-6 49-6 70 0l1 53-3 22c-9 5-22 6-32 1l-2-27-5 27c-10 5-23 4-32-2l2-21Z"
          fill={garment.color}
        />
        <Path d="M77 208c20 6 46 6 66 0m-33 1-1 38" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity={0.4} strokeWidth="2.1" />
        <Path d="M78 232c9 1 17-3 21-13m42 13c-9 1-17-3-21-13" fill="none" stroke="#fff" strokeOpacity={0.28} strokeWidth="1.7" />
      </G>
    );
  }
  return (
    <G>
      <Path
        d="M75 198c21-6 49-6 70 0l1 51-4 129c-8 6-20 6-29 1l-4-108-7 109c-9 5-21 4-29-2l6-129Z"
        fill={garment.color}
      />
      <Path d="M77 208c20 6 46 6 66 0m-33 1-1 62" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity={0.38} strokeWidth="2.1" />
      {isJeans ? (
        <G>
          <Path d="M78 232c9 1 17-4 21-14m42 14c-9 1-17-4-21-14" fill="none" stroke="#fff" strokeOpacity={0.32} strokeWidth="1.7" />
          <Path d="M75 356c8 3 17 3 25 1m15 0c8 3 17 3 25 0" fill="none" stroke="#fff" strokeOpacity={0.28} strokeWidth="2.1" />
        </G>
      ) : (
        <Path d="M91 215 84 373m43-158 6 158" fill="none" stroke="#fff" strokeOpacity={0.17} strokeWidth="1.7" />
      )}
    </G>
  );
};

const FemalePants = ({ garment }: { garment: GarmentConfig }) => {
  const isShorts = garment.styleId === 'shorts';
  const isJeans = garment.styleId === 'jeans';
  if (isShorts) {
    return (
      <G>
        <Path
          d="M72 194c23-7 53-7 76 0l1 55-3 21c-10 7-24 8-35 3l-2-28-5 28c-11 5-25 4-35-3l2-21Z"
          fill={garment.color}
        />
        <Path d="M74 205c22 7 50 7 72 0m-36 1-1 39" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity={0.4} strokeWidth="2.1" />
        <Path d="M75 230c10 2 19-3 23-14m47 14c-10 2-19-3-23-14" fill="none" stroke="#fff" strokeOpacity={0.28} strokeWidth="1.7" />
      </G>
    );
  }
  return (
    <G>
      <Path
        d="M72 194c23-7 53-7 76 0l1 53-6 131c-8 6-20 6-29 1l-5-108-6 109c-9 5-21 4-29-2l7-131Z"
        fill={garment.color}
      />
      <Path d="M74 205c22 7 50 7 72 0m-36 1-1 65" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity={0.38} strokeWidth="2.1" />
      {isJeans ? (
        <G>
          <Path d="M75 230c10 2 19-3 23-15m47 15c-10 2-19-3-23-15" fill="none" stroke="#fff" strokeOpacity={0.32} strokeWidth="1.7" />
          <Path d="M76 356c8 3 17 3 25 1m15 0c8 3 17 3 25 0" fill="none" stroke="#fff" strokeOpacity={0.28} strokeWidth="2.1" />
        </G>
      ) : (
        <Path d="M91 212 85 373m42-161 5 161" fill="none" stroke="#fff" strokeOpacity={0.17} strokeWidth="1.7" />
      )}
    </G>
  );
};

const MaleUnderwear = ({ garment }: { garment: GarmentConfig }) => {
  if (garment.styleId === 'briefs') {
    return (
      <G>
        <Path
          d="M76 202c21-6 47-6 68 0l-6 38c-7 10-17 18-28 24-11-6-21-14-28-24Z"
          fill={garment.color}
        />
        <Path d="M78 211c19 6 45 6 64 0m-32 2v39" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity={0.42} strokeWidth="2.1" />
      </G>
    );
  }
  const isBoxers = garment.styleId === 'boxers';
  return (
    <G>
      <Path
        d={`M75 200c22-6 48-6 70 0l${
          isBoxers
            ? '3 67c-10 7-24 8-36 2l-2-30-4 30c-12 6-26 5-36-2Z'
            : '1 59c-9 7-22 8-32 3l-3-28-4 28c-10 5-23 4-32-3Z'
        }`}
        fill={garment.color}
      />
      <Path d="M77 211c20 6 46 6 66 0m-33 2-1 29" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity={0.42} strokeWidth="2.1" />
      {isBoxers && <Path d="M84 226h12m28 0h12" stroke="#fff" strokeLinecap="round" strokeOpacity={0.3} strokeWidth="1.7" />}
    </G>
  );
};

const FemaleBra = ({ garment }: { garment: GarmentConfig }) => {
  if (garment.styleId === 'sports_bra') {
    return (
      <G>
        <Path d="M84 128c16-6 36-6 52 0l7 45c-18 9-48 9-66 0Z" fill={garment.color} />
        <Path d="m88 131 9-22m35 22-9-22M79 169c18 7 44 7 62 0" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity={0.48} strokeWidth="2.3" />
      </G>
    );
  }
  if (garment.styleId === 'bralette') {
    return (
      <G>
        <Path d="m77 173 9-43 24 24 24-24 9 43c-16 11-50 11-66 0Z" fill={garment.color} />
        <Path d="m88 133 9-24m35 24-9-24M79 169c18 7 44 7 62 0" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity={0.48} strokeWidth="2.3" />
        <Path d="m87 131 23 23 23-23" fill="none" stroke="#fff" strokeOpacity={0.22} strokeWidth="1.7" />
      </G>
    );
  }
  return (
    <G>
      <Path d="M77 152c2-15 13-20 33-3 20-17 31-12 33 3l-2 23c-19 8-43 8-62 0Z" fill={garment.color} />
      <Path d="M110 149v28m-30-23-7-22m67 22 7-22M80 171c18 7 42 7 60 0" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity={0.48} strokeWidth="2.2" />
    </G>
  );
};

const FemaleUnderwear = ({ garment }: { garment: GarmentConfig }) => {
  if (garment.styleId === 'high_waist') {
    return (
      <G>
        <Path d="M73 190c22-7 52-7 74 0l-9 59c-8 9-18 15-28 20-10-5-20-11-28-20Z" fill={garment.color} />
        <Path d="M75 201c21 7 49 7 70 0" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity={0.48} strokeWidth="2.3" />
      </G>
    );
  }
  if (garment.styleId === 'boyshort') {
    return (
      <G>
        <Path d="M72 199c23-7 53-7 76 0l2 59c-10 8-25 9-37 4l-3-25-4 25c-12 5-27 4-37-4Z" fill={garment.color} />
        <Path d="M74 210c22 7 50 7 72 0" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity={0.48} strokeWidth="2.3" />
      </G>
    );
  }
  return (
    <G>
      <Path d="M72 199c13 3 26 10 38 21 12-11 25-18 38-21l-11 53c-8 8-17 13-27 17-10-4-19-9-27-17Z" fill={garment.color} />
      <Path d="M75 204c12 4 24 10 35 19 11-9 23-15 35-19" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity={0.48} strokeWidth="2.2" />
    </G>
  );
};

const GarmentArtwork = ({
  presentation,
  slot,
  garment,
}: {
  presentation: PlayerPresentation;
  slot: GarmentSlot;
  garment: GarmentConfig;
}) => {
  if (slot === 'shirt')
    return presentation === 'male' ? <MaleShirt garment={garment} /> : <FemaleShirt garment={garment} />;
  if (slot === 'pants')
    return presentation === 'male' ? <MalePants garment={garment} /> : <FemalePants garment={garment} />;
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
  width = 110,
  height = 210,
}) => {
  const generatedId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const skinId = `outfit-skin-${generatedId}`;
  const runtimeGarments = state ? getEquippedGarmentMap(state) : null;
  const visibleSlots = new Set(
    remainingSlots ??
      ((runtimeGarments ? Object.keys(runtimeGarments) : Object.keys(outfit.garments)) as GarmentSlot[]),
  );
  const presentation = outfit.presentation;
  const clipId = `oc-${generatedId}`;

  const visibleGarments: Partial<Record<GarmentSlot, GarmentConfig>> = {};
  for (const slot of LAYER_ORDER) {
    const garment = runtimeGarments?.[slot] ?? outfit.garments[slot];
    if (visibleSlots.has(slot) && garment) {
      visibleGarments[slot] =
        'originPresentation' in garment
          ? (garment as import('@/shared/types').EquippedGarment)
          : garment;
    }
  }

  return (
    <View
      style={[
        styles.container,
        compact && styles.compact,
        active && styles.active,
        { width, height },
      ]}
    >
      <Svg viewBox="0 0 220 420" width={width} height={height}>
        <Defs>
          <LinearGradient id={skinId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#f2b7aa" />
            <Stop offset="0.55" stopColor="#dc9189" />
            <Stop offset="1" stopColor="#bd7072" />
          </LinearGradient>
          <ClipPath id={`${clipId}-a`}>
            <Rect x="0" y="155" width="220" height="280" />
          </ClipPath>
          <ClipPath id={`${clipId}-ll`}>
            <Rect x="0" y="376" width="220" height="50" />
          </ClipPath>
          <ClipPath id={`${clipId}-ls`}>
            <Rect x="0" y="268" width="220" height="160" />
          </ClipPath>
          <ClipPath id={`${clipId}-lu`}>
            <Rect x="0" y="256" width="220" height="180" />
          </ClipPath>
        </Defs>

        {/* Ground shadow */}
        <Ellipse cx="110" cy="398" rx="58" ry="9" fill="rgba(0,0,0,0.3)" />

        {/* Character base body */}
        <G>
          {presentation === 'male' ? (
            <MaleBase skinId={skinId} garments={visibleGarments} clipPrefix={clipId} />
          ) : (
            <FemaleBase skinId={skinId} garments={visibleGarments} clipPrefix={clipId} />
          )}

          {/* Garment layers */}
          {LAYER_ORDER.map((slot) => {
            const garment = visibleGarments[slot];
            if (!garment || !visibleSlots.has(slot)) return null;
            const isPreviewRemoved = previewRemovedSlot === slot;
            const shouldDim =
              (editingSlot === 'bra' && slot === 'shirt') ||
              (editingSlot === 'underwear' && slot === 'pants');

            return (
              <G
                key={slot}
                opacity={isPreviewRemoved ? 0.3 : shouldDim ? 0.4 : 1}
              >
                <GarmentArtwork presentation={presentation} slot={slot} garment={garment} />
              </G>
            );
          })}
        </G>
      </Svg>

      {name && (
        <Text style={styles.nameLabel} numberOfLines={1}>
          {name}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: {
    padding: 2,
  },
  active: {
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 157, 0.4)',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 107, 157, 0.06)',
  },
  nameLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: '#fff',
    marginTop: 4,
    textAlign: 'center',
  },
});
