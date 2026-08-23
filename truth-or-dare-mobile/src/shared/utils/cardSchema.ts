import type { CardItem, LuxuryProgressionConfig, ProgressionConfig } from '../types';

const CARD_LEVELS = new Set(['gentle', 'intimate', 'passionate']);
const CARD_TYPES = new Set(['truth', 'dare']);
const CARD_DECKS = new Set(['standard', 'position']);
const CARD_AUDIENCES = new Set(['male', 'female', 'both', 'current', 'opponent']);
const POSITION_FAMILIES = new Set(['oral', 'blowjob', 'handjob', 'have_sex', 'other']);
const POSITION_RECIPIENTS = new Set(['male', 'female', 'both']);
const OUTFIT_STAGES = new Set(['dressed', 'underwear_only', 'empty']);
export const MAX_CARD_TIMER_SECONDS = 3600;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isOptionalString = (value: unknown): boolean =>
  value === undefined || typeof value === 'string';

export const isStoredCard = (value: unknown): value is CardItem => {
  if (!isRecord(value)) return false;

  const effect = value.clothingEffect;
  const hasValidEffect = effect === undefined || effect === null || (
    isRecord(effect) && (
      effect.kind === 'swap_garments' ||
      (effect.kind === 'remove_garment' &&
        ['self', 'opponent', 'male', 'female', 'both'].includes(String(effect.target)))
    )
  );
  const hasValidTimer = value.timerSeconds === undefined || value.timerSeconds === null || (
    typeof value.timerSeconds === 'number' && Number.isFinite(value.timerSeconds)
  );
  const validStages = (stages: unknown) => stages === undefined || (
    Array.isArray(stages) && stages.every((stage) =>
      typeof stage === 'string' && OUTFIT_STAGES.has(stage))
  );
  const progression = value.progression;
  const hasValidProgression = progression === undefined || progression === null || (
    isRecord(progression) &&
    typeof progression.difficultyStars === 'number' &&
    Number.isInteger(progression.difficultyStars) &&
    progression.difficultyStars >= 1 && progression.difficultyStars <= 5 &&
    typeof progression.audience === 'string' && CARD_AUDIENCES.has(progression.audience) &&
    (progression.intimacyGain === undefined || (
      typeof progression.intimacyGain === 'number' &&
      Number.isFinite(progression.intimacyGain) &&
      progression.intimacyGain >= 0 && progression.intimacyGain <= 100
    )) && validStages(progression.actorStages) && validStages(progression.partnerStages)
  );
  const position = value.position;
  const hasValidPosition = position === undefined || position === null || (
    isRecord(position) &&
    typeof position.family === 'string' && POSITION_FAMILIES.has(position.family) &&
    isOptionalString(position.customLabel) &&
    typeof position.recipient === 'string' && POSITION_RECIPIENTS.has(position.recipient) &&
    typeof position.orderGroup === 'number' && [1, 2, 3, 4].includes(position.orderGroup) &&
    (position.rarity === 'luxury' || position.rarity === 'mythic') &&
    (position.difficultyStars === undefined || (
      typeof position.difficultyStars === 'number' &&
      Number.isInteger(position.difficultyStars) &&
      position.difficultyStars >= 1 && position.difficultyStars <= 10
    )) &&
    (position.luxuryGain === undefined || (
      typeof position.luxuryGain === 'number' && Number.isFinite(position.luxuryGain) &&
      position.luxuryGain >= 0 && position.luxuryGain <= 100
    ))
  );
  const appearance = value.appearance;
  const hasValidAppearance = appearance === undefined || (
    isRecord(appearance) &&
    (appearance.iconScale === undefined || (
      typeof appearance.iconScale === 'number' && Number.isFinite(appearance.iconScale) &&
      appearance.iconScale >= 0.5 && appearance.iconScale <= 1.8
    )) &&
    (appearance.textScale === undefined || (
      typeof appearance.textScale === 'number' && Number.isFinite(appearance.textScale) &&
      appearance.textScale >= 0.75 && appearance.textScale <= 1.5
    )) &&
    (appearance.iconTextGap === undefined || (
      typeof appearance.iconTextGap === 'number' && Number.isFinite(appearance.iconTextGap) &&
      appearance.iconTextGap >= 0 && appearance.iconTextGap <= 48
    ))
  );

  return (
    typeof value.id === 'string' && value.id.trim().length > 0 &&
    typeof value.type === 'string' && CARD_TYPES.has(value.type) &&
    typeof value.level === 'string' && CARD_LEVELS.has(value.level) &&
    typeof value.content === 'string' && isOptionalString(value.hint) &&
    hasValidTimer &&
    (value.deck === undefined || (typeof value.deck === 'string' && CARD_DECKS.has(value.deck))) &&
    hasValidProgression && hasValidPosition &&
    (value.isCustom === undefined || typeof value.isCustom === 'boolean') &&
    isOptionalString(value.icon) && isOptionalString(value.customImage) &&
    isOptionalString(value.customImageId) &&
    (value.illustrationOverride === undefined || typeof value.illustrationOverride === 'boolean') &&
    hasValidAppearance && hasValidEffect
  );
};

export const normalizeStoredCard = (card: CardItem): CardItem => {
  const normalized = { ...card };
  if (typeof normalized.timerSeconds === 'number') {
    if (normalized.timerSeconds <= 0) normalized.timerSeconds = null;
    else if (!Number.isInteger(normalized.timerSeconds) || normalized.timerSeconds > MAX_CARD_TIMER_SECONDS) {
      delete normalized.timerSeconds;
    }
  }
  if (normalized.deck === 'position' && normalized.position?.family === 'have_sex') {
    delete normalized.clothingEffect;
  }
  return normalized;
};

export const parseStoredCards = (value: unknown): CardItem[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.filter(isStoredCard).map(normalizeStoredCard).filter((card) => {
    if (seen.has(card.id)) return false;
    seen.add(card.id);
    return true;
  });
};

const isWeight = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;

export const isProgressionConfigValue = (value: unknown): value is ProgressionConfig => {
  if (!isRecord(value) || !Array.isArray(value.bands) || value.bands.length !== 5 ||
      !isRecord(value.starGains) || !isWeight(value.cardRemovalBonus)) return false;
  const starGains = value.starGains as Record<string, unknown>;
  const gains = [1, 2, 3, 4, 5].map((star) => starGains[String(star)]);
  if (!gains.every(isWeight) || !gains.some((gain) => gain > 0)) return false;
  return value.bands.every((band) => {
    if (!isRecord(band) || !isRecord(band.typeWeights) || !isRecord(band.starWeights)) return false;
    const tw = band.typeWeights as Record<string, unknown>;
    const sw = band.starWeights as Record<string, unknown>;
    return isWeight(tw.truth) && isWeight(tw.dare) &&
      (Number(tw.truth) + Number(tw.dare)) > 0 &&
      [1, 2, 3, 4, 5].every((star) => isWeight(sw[String(star)])) &&
      [1, 2, 3, 4, 5].some((star) => Number(sw[String(star)]) > 0);
  });
};

export const isLuxuryProgressionConfigValue = (value: unknown): value is LuxuryProgressionConfig => {
  if (!isRecord(value) || !Array.isArray(value.bands) || value.bands.length !== 5 ||
      !isRecord(value.starGains)) return false;
  const stars = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const starGains = value.starGains as Record<string, unknown>;
  const gains = stars.map((star) => starGains[String(star)]);
  if (!gains.every(isWeight) || !gains.slice(0, 9).some((gain) => gain > 0)) return false;
  return value.bands.every((band) => {
    if (!isRecord(band) || !isRecord(band.starWeights)) return false;
    const sw = band.starWeights as Record<string, unknown>;
    return stars.every((star) => isWeight(sw[String(star)])) &&
      stars.some((star) => Number(sw[String(star)]) > 0);
  });
};

export interface CatalogPayload {
  schemaVersion: number;
  datasetRevision: number;
  seededAt: string;
  updatedAt: string;
  customCards: CardItem[];
  editedCards: CardItem[];
  deletedSystemCardIds: string[];
  progressionConfig: unknown;
  luxuryProgressionConfig: unknown;
  assets: Array<{ id: string; url: string; sha256: string; mimeType: string; size: number }>;
  counts: { customCards: number; editedCards: number; deletedSystemCards: number; assets: number };
  lastBackupAt?: string | null;
}

export const parseCatalogPayload = (value: unknown): CatalogPayload | null => {
  if (!isRecord(value) || !Array.isArray(value.customCards) || !Array.isArray(value.editedCards) ||
      !Array.isArray(value.deletedSystemCardIds) || !Array.isArray(value.assets) ||
      !isRecord(value.counts)) return null;
  const customCards = parseStoredCards(value.customCards);
  const editedCards = parseStoredCards(value.editedCards);
  const deletedSystemCardIds = Array.from(new Set(value.deletedSystemCardIds.filter(
    (id): id is string => typeof id === 'string' && id.trim().length > 0,
  )));
  const assets = value.assets.filter((asset): asset is CatalogPayload['assets'][number] =>
    isRecord(asset) && typeof asset.id === 'string' && typeof asset.url === 'string' &&
    typeof asset.sha256 === 'string' && /^[a-f0-9]{64}$/i.test(asset.sha256) &&
    typeof asset.mimeType === 'string' && asset.mimeType.startsWith('image/') &&
    typeof asset.size === 'number' && Number.isInteger(asset.size) && asset.size >= 0,
  );
  const uniqueAssetIds = new Set(assets.map((asset) => asset.id));
  const uniqueAssetHashes = new Set(assets.map((asset) => asset.sha256));
  const schemaVersion = value.schemaVersion;
  const datasetRevision = value.datasetRevision;
  if (customCards.length !== value.customCards.length || editedCards.length !== value.editedCards.length ||
      deletedSystemCardIds.length !== value.deletedSystemCardIds.length || assets.length !== value.assets.length ||
      uniqueAssetIds.size !== assets.length || uniqueAssetHashes.size !== assets.length ||
      typeof schemaVersion !== 'number' || !Number.isInteger(schemaVersion) || schemaVersion < 1 ||
      typeof datasetRevision !== 'number' || !Number.isInteger(datasetRevision) || datasetRevision < 0 ||
      typeof value.seededAt !== 'string' || typeof value.updatedAt !== 'string') return null;
  if (!isProgressionConfigValue(value.progressionConfig) ||
      !isLuxuryProgressionConfigValue(value.luxuryProgressionConfig)) return null;
  if (value.counts.customCards !== customCards.length || value.counts.editedCards !== editedCards.length ||
      value.counts.deletedSystemCards !== deletedSystemCardIds.length || value.counts.assets !== assets.length) {
    return null;
  }
  return {
    schemaVersion,
    datasetRevision,
    seededAt: value.seededAt,
    updatedAt: value.updatedAt,
    customCards,
    editedCards,
    deletedSystemCardIds,
    progressionConfig: value.progressionConfig,
    luxuryProgressionConfig: value.luxuryProgressionConfig,
    assets,
    counts: {
      customCards: customCards.length,
      editedCards: editedCards.length,
      deletedSystemCards: deletedSystemCardIds.length,
      assets: assets.length,
    },
    lastBackupAt: typeof value.lastBackupAt === 'string' ? value.lastBackupAt : null,
  };
};
