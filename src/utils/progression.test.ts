import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_CARDS } from '../data/cards';
import { CardItem, DifficultyStars } from '../types';
import { createOutfitState, DEFAULT_GAME_SETTINGS } from './wardrobe';
import {
  DEFAULT_PROGRESSION_CONFIG,
  calculateCompletedCardIntimacy,
  deriveDifficultyStars,
  getCardDeck,
  getJourneyDrawProbabilities,
  hydrateProgressionConfig,
  isStandardJourneyCardEligible,
  selectJourneyCard,
  selectNextPositionCard,
} from './progression';

const outfits = [
  createOutfitState(DEFAULT_GAME_SETTINGS.outfits[0]),
  createOutfitState(DEFAULT_GAME_SETTINGS.outfits[1]),
] as const;

const makeCard = (
  id: string,
  type: 'truth' | 'dare',
  stars: DifficultyStars,
  audience: 'male' | 'female' | 'both' = 'both',
): CardItem => ({
  id,
  type,
  level: 'gentle',
  content: id,
  deck: 'standard',
  progression: { difficultyStars: stars, audience },
});
test('all 56 standard cards receive the curated star distribution and both audience', () => {
  const standardCards = INITIAL_CARDS.filter((card) => getCardDeck(card) === 'standard');
  assert.equal(standardCards.length, 56);
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<DifficultyStars, number>;
  for (const card of standardCards) {
    counts[deriveDifficultyStars(card)] += 1;
    assert.equal(card.progression?.audience, 'both');
  }
  assert.deepEqual(counts, { 1: 11, 2: 17, 3: 14, 4: 12, 5: 2 });
});

test('position deck contains nine ordered luxury cards and one reusable mythic final', () => {
  const positions = INITIAL_CARDS.filter((card) => getCardDeck(card) === 'position');
  assert.equal(positions.length, 10);
  assert.deepEqual(
    positions.filter((card) => card.position?.family === 'oral').map((card) => card.position?.recipient).sort(),
    ['both', 'female', 'male'],
  );
  assert.equal(positions.filter((card) => card.position?.family === 'blowjob').length, 3);
  assert.equal(positions.filter((card) => card.position?.family === 'handjob').length, 3);
  const final = positions.find((card) => card.position?.family === 'have_sex');
  assert.equal(final?.position?.orderGroup, 4);
  assert.equal(final?.position?.rarity, 'mythic');
});

test('default journey probabilities match every configured intimacy boundary', () => {
  const cards = (['truth', 'dare'] as const).flatMap((type) =>
    ([1, 2, 3, 4, 5] as DifficultyStars[]).map((star) => makeCard(`${type}-${star}`, type, star)),
  );
  const expected = [
    [0, 0.65, [0.7, 0.25, 0.05, 0, 0]],
    [20, 0.55, [0.45, 0.35, 0.15, 0.05, 0]],
    [40, 0.45, [0.2, 0.3, 0.3, 0.15, 0.05]],
    [60, 0.35, [0.1, 0.15, 0.3, 0.3, 0.15]],
    [80, 0.25, [0.05, 0.1, 0.2, 0.35, 0.3]],
  ] as const;
  for (const [percent, truthChance, starChances] of expected) {
    const probabilities = getJourneyDrawProbabilities({
      cards,
      actorIndex: 0,
      outfits,
      usedCardIds: [],
      levels: ['gentle'],
      intimacyPercent: percent,
      config: DEFAULT_PROGRESSION_CONFIG,
    });
    assert.ok(Math.abs(probabilities.types.truth - truthChance) < 1e-10);
    starChances.forEach((chance, index) => {
      assert.ok(Math.abs(probabilities.stars[(index + 1) as DifficultyStars] - chance) < 1e-10);
    });
  }
});

test('audience and outfit requirements filter cards before weighted selection', () => {
  const male = makeCard('male', 'truth', 1, 'male');
  const female = makeCard('female', 'truth', 1, 'female');
  const underwear = {
    ...makeCard('underwear', 'truth', 1),
    progression: {
      difficultyStars: 1 as const,
      audience: 'both' as const,
      actorStages: ['underwear_only' as const],
    },
  };
  assert.equal(isStandardJourneyCardEligible(male, 0, outfits), true);
  assert.equal(isStandardJourneyCardEligible(male, 1, outfits), false);
  assert.equal(isStandardJourneyCardEligible(female, 1, outfits), true);
  assert.equal(isStandardJourneyCardEligible(underwear, 0, outfits), false);
});

test('selection chooses type then stars and avoids repeats until the pool is exhausted', () => {
  const cards = [makeCard('truth-1', 'truth', 1), makeCard('dare-2', 'dare', 2)];
  const rolls = [0, 0, 0];
  const first = selectJourneyCard({
    cards,
    actorIndex: 0,
    outfits,
    usedCardIds: [],
    levels: ['gentle'],
    intimacyPercent: 0,
    config: DEFAULT_PROGRESSION_CONFIG,
    random: () => rolls.shift() ?? 0,
  });
  assert.equal(first.card?.id, 'truth-1');
  const second = selectJourneyCard({
    cards,
    actorIndex: 0,
    outfits,
    usedCardIds: first.nextUsedCardIds,
    levels: ['gentle'],
    intimacyPercent: 0,
    config: DEFAULT_PROGRESSION_CONFIG,
    random: () => 0,
  });
  assert.equal(second.card?.id, 'dare-2');
});

test('completion gain clamps at 100 and penalty removals are not part of this reducer', () => {
  const card = makeCard('four-star', 'dare', 4);
  assert.deepEqual(calculateCompletedCardIntimacy(80, card, DEFAULT_PROGRESSION_CONFIG, true), {
    nextPercent: 98,
    baseApplied: 10,
    removalApplied: 8,
    totalApplied: 18,
  });
  assert.deepEqual(calculateCompletedCardIntimacy(96, card, DEFAULT_PROGRESSION_CONFIG, true), {
    nextPercent: 100,
    baseApplied: 4,
    removalApplied: 0,
    totalApplied: 4,
  });
});

test('position selection respects oral, blowjob, handjob order then reuses final', () => {
  const positionCards = INITIAL_CARDS.filter((card) => getCardDeck(card) === 'position');
  const oralIds = positionCards.filter((card) => card.position?.orderGroup === 1).map((card) => card.id);
  const blowjobIds = positionCards.filter((card) => card.position?.orderGroup === 2).map((card) => card.id);
  const handjobIds = positionCards.filter((card) => card.position?.orderGroup === 3).map((card) => card.id);
  assert.equal(selectNextPositionCard(positionCards, [], [], () => 0)?.position?.family, 'oral');
  assert.equal(selectNextPositionCard(positionCards, oralIds, [], () => 0)?.position?.family, 'blowjob');
  assert.equal(selectNextPositionCard(positionCards, [...oralIds, ...blowjobIds], [], () => 0)?.position?.family, 'handjob');
  const allCommon = [...oralIds, ...blowjobIds, ...handjobIds];
  assert.equal(selectNextPositionCard(positionCards, allCommon, [], () => 0)?.position?.family, 'have_sex');
  assert.equal(
    selectNextPositionCard(positionCards, [...allCommon, 'pos-have-sex'], [], () => 0)?.position?.family,
    'have_sex',
  );
});

test('config hydration rejects all-zero rows and malformed gains without losing valid rows', () => {
  const hydrated = hydrateProgressionConfig({
    bands: [
      { typeWeights: { truth: 0, dare: 0 }, starWeights: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
      { typeWeights: { truth: 20, dare: 80 }, starWeights: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 } },
    ],
    starGains: { 1: -1, 2: 7, 3: 8, 4: 9, 5: 200 },
    cardRemovalBonus: 11,
  });
  assert.deepEqual(hydrated.bands[0], DEFAULT_PROGRESSION_CONFIG.bands[0]);
  assert.deepEqual(hydrated.bands[1].typeWeights, { truth: 20, dare: 80 });
  assert.equal(hydrated.starGains[1], 4);
  assert.equal(hydrated.starGains[2], 7);
  assert.equal(hydrated.starGains[5], 100);
  assert.equal(hydrated.cardRemovalBonus, 11);
});
