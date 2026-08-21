import type { CardItem, CardLevel, CardType, PositionFamily, PositionRecipient } from '../types';
import { deriveDifficultyStars, derivePositionDifficultyStars, getCardDeck } from './progression';

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

const POSITION_RECIPIENT_ORDER: Record<PositionRecipient, number> = {
  male: 0,
  female: 1,
  both: 2,
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
    const starDifference = derivePositionDifficultyStars(first) - derivePositionDifficultyStars(second);
    if (starDifference !== 0) return starDifference;

    const firstFamily = first.position?.family ?? 'other';
    const secondFamily = second.position?.family ?? 'other';
    const familyDifference = POSITION_FAMILY_ORDER[firstFamily] - POSITION_FAMILY_ORDER[secondFamily];
    if (familyDifference !== 0) return familyDifference;

    const firstRecipient = first.position?.recipient ?? 'both';
    const secondRecipient = second.position?.recipient ?? 'both';
    const recipientDifference = POSITION_RECIPIENT_ORDER[firstRecipient] - POSITION_RECIPIENT_ORDER[secondRecipient];
    if (recipientDifference !== 0) return recipientDifference;
  } else {
    const levelDifference = LEVEL_ORDER[first.level] - LEVEL_ORDER[second.level];
    if (levelDifference !== 0) return levelDifference;

    const typeDifference = TYPE_ORDER[first.type] - TYPE_ORDER[second.type];
    if (typeDifference !== 0) return typeDifference;

    const starDifference = deriveDifficultyStars(first) - deriveDifficultyStars(second);
    if (starDifference !== 0) return starDifference;
  }

  return naturalIdCollator.compare(first.id, second.id);
};
