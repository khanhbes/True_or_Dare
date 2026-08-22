import type { CardItem, CardLevel, CardType, PositionFamily, TurnAudience } from '../types';
import { deriveDifficultyStars, derivePositionDifficultyStars, getCardDeck, getCardTurnAudience } from './progression';

const LEVEL_ORDER: Record<CardLevel, number> = {
  gentle: 0,
  intimate: 1,
  passionate: 2,
};

const TYPE_ORDER: Record<CardType, number> = {
  truth: 0,
  dare: 1,
};

const POSITION_FAMILY_ORDER: Record<PositionFamily, number> = {
  oral: 0,
  blowjob: 1,
  handjob: 2,
  other: 3,
  have_sex: 4,
};

const TURN_AUDIENCE_ORDER: Record<TurnAudience, number> = {
  both: 0,
  male: 1,
  female: 2,
};

const naturalIdCollator = new Intl.Collator('vi', {
  numeric: true,
  sensitivity: 'base',
});

/** Stable collection order independent from when a card was created or loaded. */
export const compareCollectionCards = (first: CardItem, second: CardItem): number => {
  const firstDeck = getCardDeck(first);
  const secondDeck = getCardDeck(second);
  if (firstDeck !== secondDeck) return firstDeck === 'standard' ? -1 : 1;

  if (firstDeck === 'position') {
    const orderGroupDifference = (first.position?.orderGroup ?? 1) - (second.position?.orderGroup ?? 1);
    if (orderGroupDifference !== 0) return orderGroupDifference;

    const starDifference = derivePositionDifficultyStars(first) - derivePositionDifficultyStars(second);
    if (starDifference !== 0) return starDifference;

    const firstFamily = first.position?.family ?? 'other';
    const secondFamily = second.position?.family ?? 'other';
    const familyDifference = POSITION_FAMILY_ORDER[firstFamily] - POSITION_FAMILY_ORDER[secondFamily];
    if (familyDifference !== 0) return familyDifference;

    const audienceDifference = TURN_AUDIENCE_ORDER[getCardTurnAudience(first)] - TURN_AUDIENCE_ORDER[getCardTurnAudience(second)];
    if (audienceDifference !== 0) return audienceDifference;
  } else {
    const levelDifference = LEVEL_ORDER[first.level] - LEVEL_ORDER[second.level];
    if (levelDifference !== 0) return levelDifference;

    const starDifference = deriveDifficultyStars(first) - deriveDifficultyStars(second);
    if (starDifference !== 0) return starDifference;

    const typeDifference = TYPE_ORDER[first.type] - TYPE_ORDER[second.type];
    if (typeDifference !== 0) return typeDifference;

    const audienceDifference = TURN_AUDIENCE_ORDER[getCardTurnAudience(first)] - TURN_AUDIENCE_ORDER[getCardTurnAudience(second)];
    if (audienceDifference !== 0) return audienceDifference;
  }

  return naturalIdCollator.compare(first.id, second.id);
};
