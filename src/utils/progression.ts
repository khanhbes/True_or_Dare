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
} from '../types';
import { isCardEligibleForOutfits } from './cardSelection';
import { getOutfitStage } from './wardrobe';

export const DIFFICULTY_STARS = [1, 2, 3, 4, 5] as const;
export const POSITION_DIFFICULTY_STARS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export const STANDARD_CARD_TYPES = ['truth', 'dare'] as const;

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

const finiteNonNegative = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;

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
      truth: finiteNonNegative(savedTypes.truth, defaultBand.typeWeights.truth),
      dare: finiteNonNegative(savedTypes.dare, defaultBand.typeWeights.dare),
    };
    const starWeights = Object.fromEntries(
      DIFFICULTY_STARS.map((star) => [
        star,
        finiteNonNegative(savedStars[String(star)], defaultBand.starWeights[star]),
      ]),
    ) as Record<DifficultyStars, number>;
    if (typeWeights.truth + typeWeights.dare <= 0) return defaultBand;
    if (DIFFICULTY_STARS.every((star) => starWeights[star] <= 0)) return defaultBand;
    return { ...defaultBand, typeWeights, starWeights };
  });

  const savedGains = isRecord(value.starGains) ? value.starGains : {};
  const starGains = Object.fromEntries(
    DIFFICULTY_STARS.map((star) => [
      star,
      Math.min(100, finiteNonNegative(savedGains[String(star)], fallback.starGains[star])),
    ]),
  ) as Record<DifficultyStars, number>;

  return {
    bands,
    starGains,
    cardRemovalBonus: Math.min(
      100,
      finiteNonNegative(value.cardRemovalBonus, fallback.cardRemovalBonus),
    ),
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
      finiteNonNegative(savedStars[String(star)], defaultBand.starWeights[star]),
    ])) as Record<PositionDifficultyStars, number>;
    return POSITION_DIFFICULTY_STARS.some((star) => starWeights[star] > 0)
      ? { ...defaultBand, starWeights }
      : defaultBand;
  });
  const savedGains = isRecord(value.starGains) ? value.starGains : {};
  const starGains = Object.fromEntries(POSITION_DIFFICULTY_STARS.map((star) => [
    star,
    Math.min(100, finiteNonNegative(savedGains[String(star)], fallback.starGains[star])),
  ])) as Record<PositionDifficultyStars, number>;
  return { bands, starGains };
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

export const getCardAudience = (card: CardItem): CardAudience =>
  card.progression?.audience ?? 'both';

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

const audienceMatches = (audience: CardAudience, actorIndex: PlayerIndex): boolean =>
  audience === 'both' || (audience === 'male' ? actorIndex === 0 : actorIndex === 1);

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
  if (!audienceMatches(getCardAudience(card), actorIndex)) return false;
  const partnerIndex: PlayerIndex = actorIndex === 0 ? 1 : 0;
  if (!stagesMatch(card.progression?.actorStages, outfits[actorIndex])) return false;
  if (!stagesMatch(card.progression?.partnerStages, outfits[partnerIndex])) return false;
  return isCardEligibleForOutfits(card, actorIndex, outfits);
};

const normalize = <Key extends string | number>(
  keys: readonly Key[],
  weights: Readonly<Record<Key, number>>,
): Record<Key, number> => {
  const total = keys.reduce((sum, key) => sum + Math.max(0, weights[key] ?? 0), 0);
  return Object.fromEntries(
    keys.map((key) => [key, total > 0 ? Math.max(0, weights[key] ?? 0) / total : 0]),
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
): Key => {
  if (keys.length === 1) return keys[0];
  const roll = safeRandom(random);
  let cumulative = 0;
  for (const key of keys) {
    cumulative += weights[key] ?? 0;
    if (roll < cumulative) return key;
  }
  return keys[keys.length - 1];
};

const starWeightsForAvailable = (
  availableStars: readonly DifficultyStars[],
  band: ProgressionBand,
  intimacyPercent: number,
): Record<DifficultyStars, number> => {
  const zeroed = Object.fromEntries(
    DIFFICULTY_STARS.map((star) => [
      star,
      availableStars.includes(star) ? band.starWeights[star] : 0,
    ]),
  ) as Record<DifficultyStars, number>;
  if (availableStars.some((star) => zeroed[star] > 0)) {
    return normalize(DIFFICULTY_STARS, zeroed);
  }
  const ideal = 1 + (Math.max(0, Math.min(99, intimacyPercent)) / 100) * 4;
  const closestDistance = Math.min(...availableStars.map((star) => Math.abs(star - ideal)));
  const fallback = Object.fromEntries(
    DIFFICULTY_STARS.map((star) => [
      star,
      availableStars.includes(star) && Math.abs(star - ideal) === closestDistance ? 1 : 0,
    ]),
  ) as Record<DifficultyStars, number>;
  return normalize(DIFFICULTY_STARS, fallback);
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
  random?: () => number;
}

export interface JourneyCardSelectionResult {
  card: CardItem | null;
  nextUsedCardIds: string[];
  availableTypes: CardType[];
  didResetPool: boolean;
  probabilities: JourneyDrawProbabilities;
}

const getJourneyPool = (options: SelectJourneyCardOptions) => {
  const enabledLevels = new Set(options.levels);
  const eligible = options.cards.filter(
    (card) => enabledLevels.has(card.level) && isStandardJourneyCardEligible(card, options.actorIndex, options.outfits),
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
  if (rawTypes.truth + rawTypes.dare <= 0) {
    for (const type of availableTypes) rawTypes[type] = 1;
  }
  const types = normalize(STANDARD_CARD_TYPES, rawTypes);
  const stars = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<DifficultyStars, number>;

  for (const type of STANDARD_CARD_TYPES) {
    if (types[type] <= 0) continue;
    const availableStars = DIFFICULTY_STARS.filter((star) =>
      candidates.some((card) => card.type === type && deriveDifficultyStars(card) === star),
    );
    if (availableStars.length === 0) continue;
    const conditional = starWeightsForAvailable(availableStars, band, intimacyPercent);
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
  );
};

export const selectJourneyCard = (options: SelectJourneyCardOptions): JourneyCardSelectionResult => {
  const random = options.random ?? Math.random;
  const { eligible, pool, candidates, didResetPool } = getJourneyPool(options);
  const availableTypes = STANDARD_CARD_TYPES.filter((type) =>
    eligible.some((card) => card.type === type),
  );
  const probabilities = probabilitiesForCandidates(
    candidates,
    options.intimacyPercent,
    options.config,
    options.preferredType ?? null,
  );
  if (candidates.length === 0) {
    return {
      card: null,
      nextUsedCardIds: [...new Set(options.usedCardIds)],
      availableTypes,
      didResetPool: false,
      probabilities,
    };
  }

  const typeKeys = STANDARD_CARD_TYPES.filter((type) => probabilities.types[type] > 0);
  const selectedType = chooseWeighted(typeKeys, probabilities.types, random);
  const typeCards = candidates.filter((card) => card.type === selectedType);
  const availableStars = DIFFICULTY_STARS.filter((star) =>
    typeCards.some((card) => deriveDifficultyStars(card) === star),
  );
  const band = getProgressionBand(options.intimacyPercent, options.config);
  const conditionalStars = starWeightsForAvailable(availableStars, band, options.intimacyPercent);
  const selectedStar = chooseWeighted(availableStars, conditionalStars, random);
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
}

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
  candidates: readonly CardItem[],
  percent: number,
  config: LuxuryProgressionConfig,
): LuxuryDrawProbabilities => {
  const availableStars = POSITION_DIFFICULTY_STARS.filter((star) =>
    candidates.some((card) => derivePositionDifficultyStars(card) === star),
  );
  const raw = positionWeights({});
  if (percent >= 100) {
    if (availableStars.includes(10)) raw[10] = 1;
    return { stars: normalize(POSITION_DIFFICULTY_STARS, raw) };
  }
  const band = getLuxuryProgressionBand(percent, config);
  for (const star of availableStars) raw[star] = band.starWeights[star];
  if (availableStars.some((star) => raw[star] > 0)) {
    return { stars: normalize(POSITION_DIFFICULTY_STARS, raw) };
  }
  const ideal = 1 + (Math.max(0, Math.min(99, percent)) / 100) * 8;
  const distance = availableStars.length > 0
    ? Math.min(...availableStars.map((star) => Math.abs(star - ideal)))
    : Infinity;
  for (const star of availableStars) {
    if (Math.abs(star - ideal) === distance) raw[star] = 1;
  }
  return { stars: normalize(POSITION_DIFFICULTY_STARS, raw) };
};

export const selectLuxuryPositionCard = (
  options: SelectLuxuryPositionCardOptions,
): LuxuryPositionSelectionResult => {
  const random = options.random ?? Math.random;
  const positionCards = options.cards.filter((card) =>
    getCardDeck(card) === 'position' &&
    card.position &&
    isCardEligibleForOutfits(card, options.actorIndex, options.outfits),
  );
  const finals = positionCards.filter((card) => card.position?.family === 'have_sex');
  if (options.luxuryPercent >= 100) {
    const probabilities = luxuryProbabilitiesForCandidates(finals, 100, options.config);
    return {
      card: finals.length > 0 ? finals[Math.floor(safeRandom(random) * finals.length)] : null,
      nextUsedCardIds: [...new Set(options.usedCardIds)],
      didResetPool: false,
      probabilities,
      missingFinalCard: finals.length === 0,
    };
  }

  const eligible = positionCards.filter((card) =>
    card.position?.family !== 'have_sex' || options.luxuryPercent >= 80,
  );
  const used = new Set(options.usedCardIds);
  let candidates = eligible.filter((card) => !used.has(card.id));
  const didResetPool = eligible.length > 0 && candidates.length === 0;
  if (didResetPool) candidates = [...eligible];
  const probabilities = luxuryProbabilitiesForCandidates(candidates, options.luxuryPercent, options.config);
  const availableStars = POSITION_DIFFICULTY_STARS.filter((star) => probabilities.stars[star] > 0);
  if (candidates.length === 0 || availableStars.length === 0) {
    return {
      card: null,
      nextUsedCardIds: [...new Set(options.usedCardIds)],
      didResetPool: false,
      probabilities,
      missingFinalCard: false,
    };
  }
  const selectedStar = chooseWeighted(availableStars, probabilities.stars, random);
  const starPool = candidates.filter((card) => derivePositionDifficultyStars(card) === selectedStar);
  const card = starPool[Math.floor(safeRandom(random) * starPool.length)];
  const eligibleIds = new Set(eligible.map((item) => item.id));
  const nextUsedCardIds = didResetPool
    ? options.usedCardIds.filter((id) => !eligibleIds.has(id))
    : [...options.usedCardIds];
  if (!nextUsedCardIds.includes(card.id)) nextUsedCardIds.push(card.id);
  return { card, nextUsedCardIds, didResetPool, probabilities, missingFinalCard: false };
};

export const selectNextPositionCard = (
  cards: readonly CardItem[],
  permanentlyUnlockedIds: readonly string[],
  sessionRevealedIds: readonly string[],
  random: () => number = Math.random,
): CardItem | null => {
  const excluded = new Set([...permanentlyUnlockedIds, ...sessionRevealedIds]);
  const positionCards = cards.filter(
    (card) => getCardDeck(card) === 'position' && card.position,
  );
  for (const group of [1, 2, 3] as const) {
    const candidates = positionCards.filter(
      (card) => card.position?.orderGroup === group && !excluded.has(card.id),
    );
    if (candidates.length > 0) {
      return candidates[Math.floor(safeRandom(random) * candidates.length)];
    }
  }
  const finals = positionCards.filter((card) => card.position?.family === 'have_sex');
  return finals.length > 0 ? finals[Math.floor(safeRandom(random) * finals.length)] : null;
};
