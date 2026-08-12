import {
  GameSettings,
  GarmentConfig,
  GarmentSlot,
  OutfitConfig,
  OutfitStage,
  OutfitState,
  PlayerPresentation,
} from '../types';

export interface GarmentStyleOption {
  id: string;
  label: string;
}

export interface GarmentColorOption {
  id: string;
  label: string;
  value: string;
}

type GarmentCatalog = Record<
  PlayerPresentation,
  Partial<Record<GarmentSlot, readonly GarmentStyleOption[]>>
>;

export const GARMENT_LABELS: Record<GarmentSlot, string> = {
  shirt: 'Áo',
  pants: 'Quần',
  bra: 'Áo lót',
  underwear: 'Quần lót',
};

export const GARMENT_SLOT_ORDER: Record<PlayerPresentation, readonly GarmentSlot[]> = {
  male: ['shirt', 'pants', 'underwear'],
  female: ['shirt', 'pants', 'bra', 'underwear'],
};

export const GARMENT_CATALOG: GarmentCatalog = {
  male: {
    shirt: [
      { id: 't_shirt', label: 'Áo thun' },
      { id: 'button_shirt', label: 'Sơ mi' },
      { id: 'hoodie', label: 'Hoodie' },
    ],
    pants: [
      { id: 'jeans', label: 'Jeans' },
      { id: 'trousers', label: 'Quần tây' },
      { id: 'shorts', label: 'Quần short' },
    ],
    underwear: [
      { id: 'briefs', label: 'Briefs' },
      { id: 'boxer_briefs', label: 'Boxer briefs' },
      { id: 'boxers', label: 'Boxers' },
    ],
  },
  female: {
    shirt: [
      { id: 't_shirt', label: 'Áo thun' },
      { id: 'blouse', label: 'Blouse' },
      { id: 'camisole', label: 'Camisole' },
    ],
    pants: [
      { id: 'jeans', label: 'Jeans' },
      { id: 'trousers', label: 'Quần tây' },
      { id: 'shorts', label: 'Quần short' },
    ],
    bra: [
      { id: 'classic', label: 'Cổ điển' },
      { id: 'bralette', label: 'Bralette' },
      { id: 'sports_bra', label: 'Áo lót thể thao' },
    ],
    underwear: [
      { id: 'bikini', label: 'Bikini' },
      { id: 'high_waist', label: 'Cạp cao' },
      { id: 'boyshort', label: 'Boyshort' },
    ],
  },
};

export const GARMENT_COLORS: readonly GarmentColorOption[] = [
  { id: 'pink', label: 'Hồng', value: '#FF6B9D' },
  { id: 'cream', label: 'Trắng kem', value: '#FFF5EC' },
  { id: 'wine', label: 'Đỏ rượu', value: '#7A1F2B' },
  { id: 'black', label: 'Đen', value: '#19151A' },
  { id: 'navy', label: 'Navy', value: '#263A67' },
  { id: 'teal', label: 'Xanh ngọc', value: '#2A9D8F' },
  { id: 'purple', label: 'Tím', value: '#7950A8' },
  { id: 'gold', label: 'Vàng', value: '#D4AF37' },
];

const MALE_DEFAULT: OutfitConfig = {
  presentation: 'male',
  garments: {
    shirt: { styleId: 't_shirt', color: '#FF6B9D' },
    pants: { styleId: 'jeans', color: '#263A67' },
    underwear: { styleId: 'boxer_briefs', color: '#FFF5EC' },
  },
};

const FEMALE_DEFAULT: OutfitConfig = {
  presentation: 'female',
  garments: {
    shirt: { styleId: 'blouse', color: '#FF6B9D' },
    pants: { styleId: 'jeans', color: '#263A67' },
    bra: { styleId: 'bralette', color: '#FFF5EC' },
    underwear: { styleId: 'bikini', color: '#FF6B9D' },
  },
};

const cloneOutfit = (outfit: OutfitConfig): OutfitConfig => ({
  presentation: outfit.presentation,
  garments: Object.fromEntries(
    Object.entries(outfit.garments).map(([slot, garment]) => [slot, { ...garment }]),
  ) as Partial<Record<GarmentSlot, GarmentConfig>>,
});

export const DEFAULT_OUTFITS: [OutfitConfig, OutfitConfig] = [
  cloneOutfit(MALE_DEFAULT),
  cloneOutfit(FEMALE_DEFAULT),
];

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  levels: ['gentle', 'intimate', 'passionate'],
  roundsMode: 'unlimited',
  targetRounds: 16,
  privacyDefault: true,
  enableTimer: true,
  timerDuration: 30,
  drawMode: 'random',
  outfits: [cloneOutfit(MALE_DEFAULT), cloneOutfit(FEMALE_DEFAULT)],
  penaltyClothingEnabled: true,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isHexColor = (value: unknown): value is string =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

const hasStyle = (
  presentation: PlayerPresentation,
  slot: GarmentSlot,
  styleId: unknown,
): styleId is string =>
  typeof styleId === 'string' &&
  Boolean(GARMENT_CATALOG[presentation][slot]?.some((style) => style.id === styleId));

export const getGarmentStyles = (
  presentation: PlayerPresentation,
  slot: GarmentSlot,
): readonly GarmentStyleOption[] => GARMENT_CATALOG[presentation][slot] ?? [];

/** Hydrates one saved outfit. An explicit empty garments object stays empty. */
export const hydrateOutfitConfig = (
  value: unknown,
  presentation: PlayerPresentation,
): OutfitConfig => {
  const fallback = presentation === 'male' ? MALE_DEFAULT : FEMALE_DEFAULT;
  if (!isRecord(value) || !isRecord(value.garments)) return cloneOutfit(fallback);

  const garments: Partial<Record<GarmentSlot, GarmentConfig>> = {};
  for (const slot of GARMENT_SLOT_ORDER[presentation]) {
    const candidate = value.garments[slot];
    if (
      isRecord(candidate) &&
      hasStyle(presentation, slot, candidate.styleId) &&
      isHexColor(candidate.color)
    ) {
      garments[slot] = {
        styleId: candidate.styleId,
        color: candidate.color.toUpperCase(),
      };
    }
  }

  return { presentation, garments };
};

const positiveInteger = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : fallback;

/** Migrates older localStorage values and discards malformed setting fields. */
export const hydrateGameSettings = (value: unknown): GameSettings => {
  if (!isRecord(value)) {
    return {
      ...DEFAULT_GAME_SETTINGS,
      levels: [...DEFAULT_GAME_SETTINGS.levels],
      outfits: [cloneOutfit(MALE_DEFAULT), cloneOutfit(FEMALE_DEFAULT)],
    };
  }

  const allowedLevels = new Set(DEFAULT_GAME_SETTINGS.levels);
  const levels = Array.isArray(value.levels)
    ? [...new Set(value.levels.filter((level): level is GameSettings['levels'][number] =>
        typeof level === 'string' && allowedLevels.has(level as GameSettings['levels'][number]),
      ))]
    : [];
  const savedOutfits = Array.isArray(value.outfits) ? value.outfits : [];

  return {
    levels: levels.length > 0 ? levels : [...DEFAULT_GAME_SETTINGS.levels],
    roundsMode: value.roundsMode === 'target' ? 'target' : 'unlimited',
    targetRounds: positiveInteger(value.targetRounds, DEFAULT_GAME_SETTINGS.targetRounds),
    privacyDefault:
      typeof value.privacyDefault === 'boolean'
        ? value.privacyDefault
        : DEFAULT_GAME_SETTINGS.privacyDefault,
    enableTimer:
      typeof value.enableTimer === 'boolean'
        ? value.enableTimer
        : DEFAULT_GAME_SETTINGS.enableTimer,
    timerDuration: positiveInteger(value.timerDuration, DEFAULT_GAME_SETTINGS.timerDuration),
    drawMode: value.drawMode === 'choose' ? 'choose' : 'random',
    outfits: [
      hydrateOutfitConfig(savedOutfits[0], 'male'),
      hydrateOutfitConfig(savedOutfits[1], 'female'),
    ],
    penaltyClothingEnabled:
      typeof value.penaltyClothingEnabled === 'boolean'
        ? value.penaltyClothingEnabled
        : DEFAULT_GAME_SETTINGS.penaltyClothingEnabled,
  };
};

export const createOutfitState = (config: OutfitConfig): OutfitState => {
  const initial = hydrateOutfitConfig(config, config.presentation);
  return {
    initial,
    remainingSlots: GARMENT_SLOT_ORDER[initial.presentation].filter(
      (slot) => initial.garments[slot] !== undefined,
    ),
  };
};

export const getPresentGarmentSlots = (state: OutfitState): GarmentSlot[] => {
  const remaining = new Set(state.remainingSlots);
  return GARMENT_SLOT_ORDER[state.initial.presentation].filter(
    (slot) => remaining.has(slot) && state.initial.garments[slot] !== undefined,
  );
};

export const getOutfitStage = (state: OutfitState): OutfitStage => {
  const present = getPresentGarmentSlots(state);
  if (present.length === 0) return 'empty';
  return present.includes('shirt') || present.includes('pants')
    ? 'dressed'
    : 'underwear_only';
};

export const getRemovableGarmentSlots = (state: OutfitState): GarmentSlot[] => {
  const present = getPresentGarmentSlots(state);
  const presentSet = new Set(present);
  return present.filter((slot) => {
    if (slot === 'bra') return !presentSet.has('shirt');
    if (slot === 'underwear') return !presentSet.has('pants');
    return true;
  });
};

export const getRemovableGarments = getRemovableGarmentSlots;

export const isGarmentRemovable = (state: OutfitState, slot: GarmentSlot): boolean =>
  getRemovableGarmentSlots(state).includes(slot);

/** Returns the same state when the slot is missing or covered by an outer layer. */
export const removeGarment = (state: OutfitState, slot: GarmentSlot): OutfitState => {
  if (!isGarmentRemovable(state, slot)) return state;
  return {
    ...state,
    remainingSlots: state.remainingSlots.filter((remainingSlot) => remainingSlot !== slot),
  };
};

