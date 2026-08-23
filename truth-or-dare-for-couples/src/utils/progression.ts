import {
  CardAudience,
  CardItem,
  CardLevel,
  CardType,
  DifficultyStars,
  LuxuryProgressionBand,
  LuxuryProgressionConfig,
  OutfitStage,
  OutfitState,
  PlayerIndex,
  PositionDifficultyStars,
  ProgressionBand,
  ProgressionConfig,
  TurnAudience,
} from '../types';
import { isCardEligibleForOutfits } from './cardSelection';
import { getOutfitStage } from './wardrobe';

export const DIFFICULTY_STARS = [1, 2, 3, 4, 5] as const;
export const POSITION_DIFFICULTY_STARS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export const STANDARD_CARD_TYPES = ['truth', 'dare'] as const;

export type WardrobeDifficultyTier = 'dressed' | 'underwear_only' | 'empty';

export interface WardrobeDifficultyProfile {
  tier: WardrobeDifficultyTier;
  maxStars: DifficultyStars;
  weights: Record<DifficultyStars, number>;
}

const WARDROBE_DIFFICULTY_PROFILES: Readonly<Record<
  WardrobeDifficultyTier,
  WardrobeDifficultyProfile
>> = {
  dressed: {
    tier: 'dressed',
    maxStars: 3,
    weights: { 1: 45, 2: 35, 3: 20, 4: 0, 5: 0 },
  },
  underwear_only: {
    tier: 'underwear_only',
    maxStars: 4,
    weights: { 1: 5, 2: 10, 3: 20, 4: 65, 5: 0 },
  },
  empty: {
    tier: 'empty',
    maxStars: 5,
    weights: { 1: 3, 2: 7, 3: 15, 4: 25, 5: 50 },
  },
};

/** Uses the least-clothed player so mixed outfits progress safely. */
export const getWardrobeDifficultyProfile = (
  outfits: readonly [OutfitState, OutfitState],
): WardrobeDifficultyProfile => {
  const stages = outfits.map(getOutfitStage);
  if (stages.includes('empty')) return WARDROBE_DIFFICULTY_PROFILES.empty;
  if (stages.includes('underwear_only')) return WARDROBE_DIFFICULTY_PROFILES.underwear_only;
  return WARDROBE_DIFFICULTY_PROFILES.dressed;
};

export const DEFAULT_PROGRESSION_CONFIG: Readonly<ProgressionConfig> = {
  bands: [
    {
      minPercent: 0,
      maxPercent: 19,
      typeWeights: { truth: 65, dare: 35 },
      starWeights: { 1: 70, 2: 25, 3: 5, 4: 0, 5: 0 },
    },
    {
      minPercent: 20,
      maxPercent: 39,
      typeWeights: { truth: 55, dare: 45 },
      starWeights: { 1: 45, 2: 35, 3: 15, 4: 5, 5: 0 },
    },
    {
      minPercent: 40,
      maxPercent: 59,
      typeWeights: { truth: 45, dare: 55 },
      starWeights: { 1: 20, 2: 30, 3: 30, 4: 15, 5: 5 },
    },
    {
      minPercent: 60,
      maxPercent: 79,
      typeWeights: { truth: 35, dare: 65 },
      starWeights: { 1: 10, 2: 15, 3: 30, 4: 30, 5: 15 },
    },
    {
      minPercent: 80,
      maxPercent: 99,
      typeWeights: { truth: 25, dare: 75 },
      starWeights: { 1: 5, 2: 10, 3: 20, 4: 35, 5: 30 },
    },
  ],
  starGains: { 1: 4, 2: 6, 3: 8, 4: 10, 5: 12 },
  cardRemovalBonus: 8,
};

const positionWeights = (
  weights: Partial<Record<PositionDifficultyStars, number>>,
): Record<PositionDifficultyStars, number> => Object.fromEntries(
  POSITION_DIFFICULTY_STARS.map((star) => [star, weights[star] ?? 0]),
) as Record<PositionDifficultyStars, number>;

export const DEFAULT_LUXURY_PROGRESSION_CONFIG: Readonly<LuxuryProgressionConfig> = {
  bands: [
    { minPercent: 0, maxPercent: 19, starWeights: positionWeights({ 1: 50, 2: 30, 3: 20 }) },
    { minPercent: 20, maxPercent: 39, starWeights: positionWeights({ 2: 20, 3: 40, 4: 25, 5: 15 }) },
    { minPercent: 40, maxPercent: 59, starWeights: positionWeights({ 3: 10, 4: 25, 5: 35, 6: 20, 7: 10 }) },
    { minPercent: 60, maxPercent: 79, starWeights: positionWeights({ 5: 10, 6: 25, 7: 35, 8: 20, 9: 10 }) },
    { minPercent: 80, maxPercent: 99, starWeights: positionWeights({ 5: 5, 6: 10, 7: 20, 8: 25, 9: 35, 10: 5 }) },
  ],
  starGains: { 1: 6, 2: 7, 3: 8, 4: 9, 5: 10, 6: 11, 7: 12, 8: 13, 9: 14, 10: 0 },
  finalCardChance: 5,
};

const cloneBand = (band: ProgressionBand): ProgressionBand => ({
  minPercent: band.minPercent,
  maxPercent: band.maxPercent,
  typeWeights: { ...band.typeWeights },
  starWeights: { ...band.starWeights },
});

export const cloneProgressionConfig = (
  config: ProgressionConfig = DEFAULT_PROGRESSION_CONFIG,
): ProgressionConfig => ({
  bands: config.bands.map(cloneBand),
  starGains: { ...config.starGains },
  cardRemovalBonus: config.cardRemovalBonus,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const boundedPercentage = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.min(100, value)
    : fallback;

export const hydrateProgressionConfig = (value: unknown): ProgressionConfig => {
  const fallback = cloneProgressionConfig();
  if (!isRecord(value)) return fallback;

  const savedBands = Array.isArray(value.bands) ? value.bands : [];
  const bands = fallback.bands.map((defaultBand, index) => {
    const saved = savedBands[index];
    if (!isRecord(saved)) return defaultBand;
    const savedTypes = isRecord(saved.typeWeights) ? saved.typeWeights : {};
    const savedStars = isRecord(saved.starWeights) ? saved.starWeights : {};
    const typeWeights = {
      truth: boundedPercentage(savedTypes.truth, defaultBand.typeWeights.truth),
      dare: boundedPercentage(savedTypes.dare, defaultBand.typeWeights.dare),
    };
    const starWeights = Object.fromEntries(
      DIFFICULTY_STARS.map((star) => [
        star,
        boundedPercentage(savedStars[String(star)], defaultBand.starWeights[star]),
      ]),
    ) as Record<DifficultyStars, number>;
    return { ...defaultBand, typeWeights, starWeights };
  });

  const savedGains = isRecord(value.starGains) ? value.starGains : {};
  const starGains = Object.fromEntries(
    DIFFICULTY_STARS.map((star) => [
      star,
      boundedPercentage(savedGains[String(star)], fallback.starGains[star]),
    ]),
  ) as Record<DifficultyStars, number>;

  return {
    bands,
    starGains,
    cardRemovalBonus: boundedPercentage(value.cardRemovalBonus, fallback.cardRemovalBonus),
  };
};

export const cloneLuxuryProgressionConfig = (
  config: LuxuryProgressionConfig = DEFAULT_LUXURY_PROGRESSION_CONFIG,
): LuxuryProgressionConfig => ({
  bands: config.bands.map((band) => ({
    minPercent: band.minPercent,
    maxPercent: band.maxPercent,
    starWeights: { ...band.starWeights },
  })),
  starGains: { ...config.starGains },
  finalCardChance: config.finalCardChance,
});

export const hydrateLuxuryProgressionConfig = (value: unknown): LuxuryProgressionConfig => {
  const fallback = cloneLuxuryProgressionConfig();
  if (!isRecord(value)) return fallback;
  const savedBands = Array.isArray(value.bands) ? value.bands : [];
  const bands = fallback.bands.map((defaultBand, index) => {
    const saved = savedBands[index];
    if (!isRecord(saved)) return defaultBand;
    const savedStars = isRecord(saved.starWeights) ? saved.starWeights : {};
    const starWeights = Object.fromEntries(POSITION_DIFFICULTY_STARS.map((star) => [
      star,
      boundedPercentage(savedStars[String(star)], defaultBand.starWeights[star]),
    ])) as Record<PositionDifficultyStars, number>;
    return { ...defaultBand, starWeights };
  });
  const savedGains = isRecord(value.starGains) ? value.starGains : {};
  const starGains = Object.fromEntries(POSITION_DIFFICULTY_STARS.map((star) => [
    star,
    boundedPercentage(savedGains[String(star)], fallback.starGains[star]),
  ])) as Record<PositionDifficultyStars, number>;
  return {
    bands,
    starGains,
    finalCardChance: boundedPercentage(value.finalCardChance, fallback.finalCardChance),
  };
};

export const getCardDeck = (card: CardItem): 'standard' | 'position' =>
  card.deck === 'position' ? 'position' : 'standard';

export const deriveDifficultyStars = (card: CardItem): DifficultyStars => {
  const explicit = card.progression?.difficultyStars;
  if (explicit && DIFFICULTY_STARS.includes(explicit)) return explicit;
  if (card.level === 'gentle') return card.type === 'truth' ? 1 : 2;
  if (card.level === 'intimate') return 3;
  return 4;
};

export const derivePositionDifficultyStars = (card: CardItem): PositionDifficultyStars => {
  const explicit = card.position?.difficultyStars;
  if (explicit && POSITION_DIFFICULTY_STARS.includes(explicit)) return explicit;
  const legacy = card.progression?.difficultyStars;
  if (legacy && POSITION_DIFFICULTY_STARS.includes(legacy)) return legacy;
  if (card.position?.family === 'have_sex') return 10;
  if (card.position?.family === 'handjob') return 7;
  if (card.position?.family === 'blowjob') return 5;
  return 3;
};

export const getPositionLuxuryGain = (
  card: CardItem,
  config: LuxuryProgressionConfig,
): number => {
  const override = card.position?.luxuryGain;
  return typeof override === 'number' && Number.isFinite(override) && override >= 0
    ? Math.min(100, override)
    : config.starGains[derivePositionDifficultyStars(card)];
};

export const calculateCompletedPositionLuxury = (
  currentPercent: number,
  card: CardItem,
  config: LuxuryProgressionConfig,
): IntimacyGainResult => {
  const current = Math.max(0, Math.min(100, currentPercent));
  const base = getPositionLuxuryGain(card, config);
  const nextPercent = Math.min(100, current + base);
  const totalApplied = nextPercent - current;
  return { nextPercent, baseApplied: totalApplied, removalApplied: 0, totalApplied };
};

const migrateLegacyAudience = (audience: CardAudience | undefined): TurnAudience => {
  if (audience === 'male' || audience === 'female') return audience;
  return 'both';
};

export const getCardTurnAudience = (card: CardItem): TurnAudience => {
  if (getCardDeck(card) === 'position') {
    return card.position?.turnAudience ?? migrateLegacyAudience(card.position?.recipient);
  }
  return card.progression?.turnAudience ?? migrateLegacyAudience(card.progression?.audience);
};

/** @deprecated Use getCardTurnAudience. */
export const getCardAudience = (card: CardItem): CardAudience => getCardTurnAudience(card);

export const getCardIntimacyGain = (
  card: CardItem,
  config: ProgressionConfig,
): number => {
  const override = card.progression?.intimacyGain;
  return typeof override === 'number' && Number.isFinite(override) && override >= 0
    ? Math.min(100, override)
    : config.starGains[deriveDifficultyStars(card)];
};

export interface IntimacyGainResult {
  nextPercent: number;
  baseApplied: number;
  removalApplied: number;
  totalApplied: number;
}

export const calculateCompletedCardIntimacy = (
  currentPercent: number,
  card: CardItem,
  config: ProgressionConfig,
  includeCardRemovalBonus: boolean,
): IntimacyGainResult => {
  const current = Math.max(0, Math.min(100, currentPercent));
  const base = getCardIntimacyGain(card, config);
  const removal = includeCardRemovalBonus ? config.cardRemovalBonus : 0;
  const nextPercent = Math.min(100, current + base + removal);
  const totalApplied = nextPercent - current;
  const baseApplied = Math.min(base, totalApplied);
  return {
    nextPercent,
    baseApplied,
    removalApplied: Math.max(0, totalApplied - baseApplied),
    totalApplied,
  };
};

export const getProgressionBand = (
  intimacyPercent: number,
  config: ProgressionConfig,
): ProgressionBand => {
  const percent = Math.max(0, Math.min(99, intimacyPercent));
  return config.bands.find(
    (band) => percent >= band.minPercent && percent <= band.maxPercent,
  ) ?? config.bands[config.bands.length - 1];
};

export const isProgressionConfigPlayable = (config: ProgressionConfig): boolean =>
  DIFFICULTY_STARS.some((star) => config.starGains[star] > 0);

export const isLuxuryProgressionConfigPlayable = (
  config: LuxuryProgressionConfig,
): boolean => POSITION_DIFFICULTY_STARS.some(
  (star) => star < 10 && config.starGains[star] > 0,
);

const audienceMatches = (audience: TurnAudience, actorIndex: PlayerIndex): boolean =>
  audience === 'both' ||
  (audience === 'male' ? actorIndex === 0 : actorIndex === 1);

export const getStandardCardPerformerIndex = (
  card: CardItem,
  currentPlayerIndex: PlayerIndex,
): PlayerIndex => currentPlayerIndex;

const stagesMatch = (
  allowedStages: readonly OutfitStage[] | undefined,
  outfit: OutfitState,
): boolean => !allowedStages || allowedStages.length === 0 || allowedStages.includes(getOutfitStage(outfit));

export const isStandardJourneyCardEligible = (
  card: CardItem,
  actorIndex: PlayerIndex,
  outfits: readonly [OutfitState, OutfitState],
): boolean => {
  if (getCardDeck(card) !== 'standard') return false;
  if (!audienceMatches(getCardTurnAudience(card), actorIndex)) return false;
  const partnerIndex: PlayerIndex = actorIndex === 0 ? 1 : 0;
  if (!stagesMatch(card.progression?.actorStages, outfits[actorIndex])) return false;
  if (!stagesMatch(card.progression?.partnerStages, outfits[partnerIndex])) return false;
  return isCardEligibleForOutfits(card, actorIndex, outfits);
};

const normalize = <Key extends string | number>(
  keys: readonly Key[],
  weights: Readonly<Record<Key, number>>,
): Record<Key, number> => {
  const safeWeights = keys.map((key) => {
    const value = weights[key] ?? 0;
    return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  });
  const total = safeWeights.reduce((sum, value) => sum + value, 0);
  return Object.fromEntries(
    keys.map((key, index) => [key, total > 0 ? safeWeights[index] / total : 0]),
  ) as Record<Key, number>;
};

const safeRandom = (random: () => number): number => {
  const value = random();
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(0.999999999999, value));
};

const chooseWeighted = <Key extends string | number>(
  keys: readonly Key[],
  weights: Readonly<Record<Key, number>>,
  random: () => number,
): Key | null => {
  const enabled = keys.filter((key) => Number.isFinite(weights[key]) && weights[key] > 0);
  if (enabled.length === 0) return null;
  if (enabled.length === 1) return enabled[0];
  const roll = safeRandom(random);
  let cumulative = 0;
  for (const key of enabled) {
    cumulative += weights[key] ?? 0;
    if (roll < cumulative) return key;
  }
  return enabled[enabled.length - 1];
};

const starWeightsForAvailable = (
  availableStars: readonly DifficultyStars[],
  band: ProgressionBand,
  outfits: readonly [OutfitState, OutfitState],
  difficultyBoost = false,
): Record<DifficultyStars, number> => {
  const profile = getWardrobeDifficultyProfile(outfits);
  const cappedStars = availableStars.filter((star) => star <= profile.maxStars);
  const bandWeights = normalize(DIFFICULTY_STARS, Object.fromEntries(
    DIFFICULTY_STARS.map((star) => [
      star,
      cappedStars.includes(star) ? band.starWeights[star] : 0,
    ]),
  ) as Record<DifficultyStars, number>);
  const wardrobeWeights = normalize(DIFFICULTY_STARS, Object.fromEntries(
    DIFFICULTY_STARS.map((star) => [
      star,
      cappedStars.includes(star) ? profile.weights[star] : 0,
    ]),
  ) as Record<DifficultyStars, number>);
  const combined = normalize(DIFFICULTY_STARS, Object.fromEntries(
    DIFFICULTY_STARS.map((star) => [
      star,
      0.6 * wardrobeWeights[star] + 0.4 * bandWeights[star],
    ]),
  ) as Record<DifficultyStars, number>);

  if (difficultyBoost) {
    const shifted = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<DifficultyStars, number>;
    for (const sourceStar of cappedStars) {
      const destinationStar = cappedStars.find((star) => star > sourceStar) ?? sourceStar;
      shifted[destinationStar] += combined[sourceStar];
    }
    return normalize(DIFFICULTY_STARS, shifted);
  }
  return combined;
};

export interface JourneyDrawProbabilities {
  types: Record<CardType, number>;
  stars: Record<DifficultyStars, number>;
}

export interface SelectJourneyCardOptions {
  cards: readonly CardItem[];
  preferredType?: CardType | null;
  actorIndex: PlayerIndex;
  outfits: readonly [OutfitState, OutfitState];
  usedCardIds: readonly string[];
  levels: readonly CardLevel[];
  intimacyPercent: number;
  config: ProgressionConfig;
  /** Hard exclusions stay excluded even when the normal no-repeat pool resets. */
  excludedCardIds?: readonly string[];
  /** Shifts each available star weight to the next higher available star. */
  difficultyBoost?: boolean;
  random?: () => number;
}

export interface JourneyCardSelectionResult {
  card: CardItem | null;
  nextUsedCardIds: string[];
  availableTypes: CardType[];
  didResetPool: boolean;
  probabilities: JourneyDrawProbabilities;
  errorCode?: 'no_cards' | 'no_positive_weight' | 'no_progress_gain';
}

const getJourneyPool = (options: SelectJourneyCardOptions) => {
  const enabledLevels = new Set(options.levels);
  const excluded = new Set(options.excludedCardIds ?? []);
  const eligible = options.cards.filter(
    (card) => !excluded.has(card.id)
      && enabledLevels.has(card.level)
      && deriveDifficultyStars(card) <= getWardrobeDifficultyProfile(options.outfits).maxStars
      && isStandardJourneyCardEligible(card, options.actorIndex, options.outfits),
  );
  const pool = options.preferredType
    ? eligible.filter((card) => card.type === options.preferredType)
    : eligible;
  const used = new Set(options.usedCardIds);
  let candidates = pool.filter((card) => !used.has(card.id));
  const didResetPool = pool.length > 0 && candidates.length === 0;
  if (didResetPool) candidates = [...pool];
  return { eligible, pool, candidates, didResetPool };
};

const probabilitiesForCandidates = (
  candidates: readonly CardItem[],
  intimacyPercent: number,
  config: ProgressionConfig,
  preferredType: CardType | null,
  outfits: readonly [OutfitState, OutfitState],
  difficultyBoost = false,
): JourneyDrawProbabilities => {
  const band = getProgressionBand(intimacyPercent, config);
  const availableTypes = STANDARD_CARD_TYPES.filter((type) =>
    candidates.some((card) => card.type === type),
  );
  const rawTypes = {
    truth: availableTypes.includes('truth') && (!preferredType || preferredType === 'truth')
      ? band.typeWeights.truth
      : 0,
    dare: availableTypes.includes('dare') && (!preferredType || preferredType === 'dare')
      ? band.typeWeights.dare
      : 0,
  };
  const types = normalize(STANDARD_CARD_TYPES, rawTypes);
  const stars = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<DifficultyStars, number>;

  for (const type of STANDARD_CARD_TYPES) {
    if (types[type] <= 0) continue;
    const availableStars = DIFFICULTY_STARS.filter((star) =>
      candidates.some((card) => card.type === type && deriveDifficultyStars(card) === star),
    );
    if (availableStars.length === 0) continue;
    const conditional = starWeightsForAvailable(availableStars, band, outfits, difficultyBoost);
    for (const star of DIFFICULTY_STARS) stars[star] += types[type] * conditional[star];
  }
  return { types, stars };
};

export const getJourneyDrawProbabilities = (
  options: SelectJourneyCardOptions,
): JourneyDrawProbabilities => {
  const { candidates } = getJourneyPool(options);
  return probabilitiesForCandidates(
    candidates,
    options.intimacyPercent,
    options.config,
    options.preferredType ?? null,
    options.outfits,
    options.difficultyBoost ?? false,
  );
};

export const getJourneyAvailableTypes = (
  options: SelectJourneyCardOptions,
): CardType[] => {
  const { candidates } = getJourneyPool(options);
  const probabilities = probabilitiesForCandidates(
    candidates,
    options.intimacyPercent,
    options.config,
    options.preferredType ?? null,
    options.outfits,
    options.difficultyBoost ?? false,
  );
  return STANDARD_CARD_TYPES.filter((type) =>
    probabilities.types[type] > 0 && candidates.some((card) => card.type === type),
  );
};

export const selectJourneyCard = (options: SelectJourneyCardOptions): JourneyCardSelectionResult => {
  const random = options.random ?? Math.random;
  const { pool, candidates, didResetPool } = getJourneyPool(options);
  const probabilities = probabilitiesForCandidates(
    candidates,
    options.intimacyPercent,
    options.config,
    options.preferredType ?? null,
    options.outfits,
    options.difficultyBoost ?? false,
  );
  const availableTypes = STANDARD_CARD_TYPES.filter((type) =>
    probabilities.types[type] > 0 && candidates.some((card) => card.type === type),
  );
  if (candidates.length === 0) {
    return {
      card: null,
      nextUsedCardIds: [...new Set(options.usedCardIds)],
      availableTypes,
      didResetPool: false,
      probabilities,
      errorCode: 'no_cards',
    };
  }

  if (!isProgressionConfigPlayable(options.config)) {
    return {
      card: null,
      nextUsedCardIds: [...new Set(options.usedCardIds)],
      availableTypes,
      didResetPool: false,
      probabilities,
      errorCode: 'no_progress_gain',
    };
  }

  const typeKeys = STANDARD_CARD_TYPES.filter((type) => probabilities.types[type] > 0);
  const selectedType = chooseWeighted(typeKeys, probabilities.types, random);
  if (!selectedType) {
    return {
      card: null,
      nextUsedCardIds: [...new Set(options.usedCardIds)],
      availableTypes,
      didResetPool: false,
      probabilities,
      errorCode: 'no_positive_weight',
    };
  }
  const typeCards = candidates.filter((card) => card.type === selectedType);
  const availableStars = DIFFICULTY_STARS.filter((star) =>
    typeCards.some((card) => deriveDifficultyStars(card) === star),
  );
  const band = getProgressionBand(options.intimacyPercent, options.config);
  const conditionalStars = starWeightsForAvailable(
    availableStars,
    band,
    options.outfits,
    options.difficultyBoost ?? false,
  );
  const selectedStar = chooseWeighted(availableStars, conditionalStars, random);
  if (!selectedStar) {
    return {
      card: null,
      nextUsedCardIds: [...new Set(options.usedCardIds)],
      availableTypes,
      didResetPool: false,
      probabilities,
      errorCode: 'no_positive_weight',
    };
  }
  const finalPool = typeCards.filter((card) => deriveDifficultyStars(card) === selectedStar);
  const card = finalPool[Math.floor(safeRandom(random) * finalPool.length)];

  const poolIds = new Set(pool.map((item) => item.id));
  const nextUsedCardIds = didResetPool
    ? options.usedCardIds.filter((id) => !poolIds.has(id))
    : [...options.usedCardIds];
  if (!nextUsedCardIds.includes(card.id)) nextUsedCardIds.push(card.id);
  return { card, nextUsedCardIds, availableTypes, didResetPool, probabilities };
};

export interface LuxuryDrawProbabilities {
  stars: Record<PositionDifficultyStars, number>;
  /** Absolute probability of drawing a Have Sex card on this draw. */
  finalCardChance: number;
}

export interface SelectLuxuryPositionCardOptions {
  cards: readonly CardItem[];
  actorIndex: PlayerIndex;
  outfits: readonly [OutfitState, OutfitState];
  usedCardIds: readonly string[];
  luxuryPercent: number;
  config: LuxuryProgressionConfig;
  random?: () => number;
}

export interface LuxuryPositionSelectionResult {
  card: CardItem | null;
  nextUsedCardIds: string[];
  didResetPool: boolean;
  probabilities: LuxuryDrawProbabilities;
  missingFinalCard: boolean;
  errorCode?: 'no_cards' | 'no_positive_weight' | 'missing_final' | 'no_progress_gain';
}

const positionRecipientMatches = (card: CardItem, actorIndex: PlayerIndex): boolean =>
  audienceMatches(getCardTurnAudience(card), actorIndex);

export const getLuxuryProgressionBand = (
  percent: number,
  config: LuxuryProgressionConfig,
): LuxuryProgressionBand => {
  const safePercent = Math.max(0, Math.min(99, percent));
  return config.bands.find(
    (band) => safePercent >= band.minPercent && safePercent <= band.maxPercent,
  ) ?? config.bands[config.bands.length - 1];
};

const luxuryProbabilitiesForCandidates = (
  nonFinalCandidates: readonly CardItem[],
  finalCandidates: readonly CardItem[],
  percent: number,
  config: LuxuryProgressionConfig,
): LuxuryDrawProbabilities => {
  const raw = positionWeights({});
  if (percent >= 100) {
    return {
      stars: raw,
      finalCardChance: finalCandidates.length > 0 ? 1 : 0,
    };
  }
  const band = getLuxuryProgressionBand(percent, config);
  const nonFinalStars = POSITION_DIFFICULTY_STARS.filter((star) =>
    nonFinalCandidates.some((card) => derivePositionDifficultyStars(card) === star),
  );
  const nonFinalRaw = positionWeights({});
  for (const star of nonFinalStars) nonFinalRaw[star] = band.starWeights[star];
  const stars = normalize(POSITION_DIFFICULTY_STARS, nonFinalRaw);
  const finalHasPositiveWeight = finalCandidates.some(
    (card) => band.starWeights[derivePositionDifficultyStars(card)] > 0,
  );
  const finalCardChance = percent >= 80 && finalHasPositiveWeight
    ? config.finalCardChance / 100
    : 0;
  return { stars, finalCardChance };
};

const choosePositionCardByStarWeight = (
  cards: readonly CardItem[],
  band: LuxuryProgressionBand,
  random: () => number,
): CardItem | null => {
  const availableStars = POSITION_DIFFICULTY_STARS.filter((star) =>
    band.starWeights[star] > 0 && cards.some((card) => derivePositionDifficultyStars(card) === star),
  );
  const weights = normalize(POSITION_DIFFICULTY_STARS, band.starWeights);
  const selectedStar = chooseWeighted(availableStars, weights, random);
  if (!selectedStar) return null;
  const pool = cards.filter((card) => derivePositionDifficultyStars(card) === selectedStar);
  return pool[Math.floor(safeRandom(random) * pool.length)] ?? null;
};

export const selectLuxuryPositionCard = (
  options: SelectLuxuryPositionCardOptions,
): LuxuryPositionSelectionResult => {
  const random = options.random ?? Math.random;
  const outfitsReady = options.outfits.every((outfit) => getOutfitStage(outfit) === 'empty');
  const positionCards = options.cards.filter((card) =>
    outfitsReady &&
    getCardDeck(card) === 'position' &&
    card.position &&
    positionRecipientMatches(card, options.actorIndex) &&
    isCardEligibleForOutfits(card, options.actorIndex, options.outfits),
  );
  const finals = positionCards.filter((card) => card.position?.family === 'have_sex');
  const nonFinalEligible = positionCards.filter((card) => card.position?.family !== 'have_sex');
  const finalBand = getLuxuryProgressionBand(99, options.config);
  if (options.luxuryPercent >= 100) {
    const probabilities = luxuryProbabilitiesForCandidates([], finals, 100, options.config);
    const finalCard = choosePositionCardByStarWeight(finals, finalBand, random);
    return {
      card: finalCard,
      nextUsedCardIds: [...new Set(options.usedCardIds)],
      didResetPool: false,
      probabilities,
      missingFinalCard: finals.length === 0,
      errorCode: finals.length === 0 ? 'missing_final' : finalCard ? undefined : 'no_positive_weight',
    };
  }
  const used = new Set(options.usedCardIds);
  let candidates = nonFinalEligible.filter((card) => !used.has(card.id));
  const didResetPool = nonFinalEligible.length > 0 && candidates.length === 0;
  if (didResetPool) candidates = [...nonFinalEligible];
  const probabilities = luxuryProbabilitiesForCandidates(
    candidates,
    finals,
    options.luxuryPercent,
    options.config,
  );
  if (!isLuxuryProgressionConfigPlayable(options.config)) {
    return {
      card: null,
      nextUsedCardIds: [...new Set(options.usedCardIds)],
      didResetPool: false,
      probabilities,
      missingFinalCard: false,
      errorCode: 'no_progress_gain',
    };
  }
  if (options.luxuryPercent >= 80 && finals.length > 0 && safeRandom(random) < probabilities.finalCardChance) {
    const finalCard = choosePositionCardByStarWeight(finals, getLuxuryProgressionBand(options.luxuryPercent, options.config), random);
    if (!finalCard) {
      return {
        card: null,
        nextUsedCardIds: [...new Set(options.usedCardIds)],
        didResetPool: false,
        probabilities,
        missingFinalCard: false,
        errorCode: 'no_positive_weight',
      };
    }
    return {
      card: finalCard,
      nextUsedCardIds: [...new Set(options.usedCardIds)],
      didResetPool: false,
      probabilities,
      missingFinalCard: false,
    };
  }
  const availableStars = POSITION_DIFFICULTY_STARS.filter(
    (star) => probabilities.stars[star] > 0,
  );
  if (candidates.length === 0) {
    return {
      card: null,
      nextUsedCardIds: [...new Set(options.usedCardIds)],
      didResetPool: false,
      probabilities,
      missingFinalCard: false,
      errorCode: 'no_cards',
    };
  }
  if (availableStars.length === 0) {
    return {
      card: null,
      nextUsedCardIds: [...new Set(options.usedCardIds)],
      didResetPool: false,
      probabilities,
      missingFinalCard: false,
      errorCode: 'no_positive_weight',
    };
  }
  const conditionalWeights = normalize(availableStars, Object.fromEntries(
    availableStars.map((star) => [star, probabilities.stars[star]]),
  ) as Record<PositionDifficultyStars, number>);
  const selectedStar = chooseWeighted(availableStars, conditionalWeights, random);
  if (!selectedStar) {
    return {
      card: null,
      nextUsedCardIds: [...new Set(options.usedCardIds)],
      didResetPool: false,
      probabilities,
      missingFinalCard: false,
      errorCode: 'no_positive_weight',
    };
  }
  const starPool = candidates.filter((card) => derivePositionDifficultyStars(card) === selectedStar);
  const card = starPool[Math.floor(safeRandom(random) * starPool.length)];
  const eligibleIds = new Set(nonFinalEligible.map((item) => item.id));
  const nextUsedCardIds = didResetPool
    ? options.usedCardIds.filter((id) => !eligibleIds.has(id))
    : [...options.usedCardIds];
  if (!nextUsedCardIds.includes(card.id)) nextUsedCardIds.push(card.id);
  return { card, nextUsedCardIds, didResetPool, probabilities, missingFinalCard: false };
};
