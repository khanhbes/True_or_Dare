import type { CardItem, PositionDifficultyStars } from '../types';

export const POSITION_STAR_SCHEMA_VERSION = 2;
export const POSITION_STARS = [6, 7, 8, 9, 10] as const;
const LEGACY_MAP: Record<number, PositionDifficultyStars> = { 1: 6, 2: 7, 3: 8, 4: 9, 5: 10 };

export const isPositionStar = (value: unknown): value is PositionDifficultyStars =>
  typeof value === 'number' && Number.isInteger(value) && value >= 6 && value <= 10;

export const migratePositionStar = (value: unknown): PositionDifficultyStars => {
  if (isPositionStar(value)) return value;
  if (typeof value === 'number' && LEGACY_MAP[value]) return LEGACY_MAP[value];
  throw new Error(`Invalid Position difficulty star: ${String(value)}`);
};

export const migratePositionCard = (card: CardItem): CardItem => {
  if (card.deck !== 'position' || !card.position) return card;
  return { ...card, position: { ...card.position, difficultyStars: migratePositionStar(card.position.difficultyStars) } };
};

export const migratePositionCards = (cards: CardItem[]): CardItem[] => cards.map(migratePositionCard);
