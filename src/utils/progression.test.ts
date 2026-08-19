import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_CARDS } from '../data/cards';
import { CardItem, DifficultyStars, PositionDifficultyStars } from '../types';
import { createOutfitState, DEFAULT_GAME_SETTINGS } from './wardrobe';
import {
  DEFAULT_PROGRESSION_CONFIG,
  DEFAULT_LUXURY_PROGRESSION_CONFIG,
  calculateCompletedCardIntimacy,
  calculateCompletedPositionLuxury,
  deriveDifficultyStars,
  derivePositionDifficultyStars,
  getCardDeck,
  getJourneyDrawProbabilities,
  hydrateProgressionConfig,
  hydrateLuxuryProgressionConfig,
  isStandardJourneyCardEligible,
  selectJourneyCard,
  selectLuxuryPositionCard,
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

const makePositionCard = (
  id: string,
  stars: PositionDifficultyStars,
  luxuryGain?: number,
): CardItem => ({
  id,
  type: 'dare',
  level: 'passionate',
  content: id,
  deck: 'position',
  position: {
    family: stars === 10 ? 'have_sex' : 'oral',
    recipient: 'both',
    orderGroup: stars === 10 ? 4 : 1,
    rarity: stars === 10 ? 'mythic' : 'luxury',
    difficultyStars: stars,
    luxuryGain,
  },
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
  assert.deepEqual(
    positions.filter((card) => card.position?.family === 'oral').map(derivePositionDifficultyStars),
    [3, 3, 3],
  );
  assert.deepEqual(
    positions.filter((card) => card.position?.family === 'blowjob').map(derivePositionDifficultyStars),
    [5, 5, 5],
  );
  assert.deepEqual(
    positions.filter((card) => card.position?.family === 'handjob').map(derivePositionDifficultyStars),
    [7, 7, 7],
  );
  assert.equal(final && derivePositionDifficultyStars(final), 10);
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

test('Luxury probabilities follow every boundary and unlock 10 stars only from 80 percent', () => {
  const cards = Array.from({ length: 10 }, (_, index) =>
    makePositionCard(`position-${index + 1}`, (index + 1) as PositionDifficultyStars));
  const expected = [
    [0, { 1: .5, 2: .3, 3: .2 }],
    [20, { 2: .2, 3: .4, 4: .25, 5: .15 }],
    [40, { 3: .1, 4: .25, 5: .35, 6: .2, 7: .1 }],
    [60, { 5: .1, 6: .25, 7: .35, 8: .2, 9: .1 }],
    [80, { 5: .05, 6: .1, 7: .2, 8: .25, 9: .35, 10: .05 }],
  ] as const;

  for (const [percent, weights] of expected) {
    const result = selectLuxuryPositionCard({
      cards,
      actorIndex: 0,
      outfits,
      usedCardIds: [],
      luxuryPercent: percent,
      config: DEFAULT_LUXURY_PROGRESSION_CONFIG,
      random: () => 0,
    });
    for (const star of Array.from({ length: 10 }, (_, index) => (index + 1) as PositionDifficultyStars)) {
      const expectedWeight = (weights as Partial<Record<PositionDifficultyStars, number>>)[star] ?? 0;
      assert.ok(Math.abs(result.probabilities.stars[star] - expectedWeight) < 1e-10);
    }
  }

  const beforeUnlock = selectLuxuryPositionCard({
    cards,
    actorIndex: 0,
    outfits,
    usedCardIds: [],
    luxuryPercent: 79,
    config: DEFAULT_LUXURY_PROGRESSION_CONFIG,
    random: () => .999999,
  });
  assert.notEqual(derivePositionDifficultyStars(beforeUnlock.card!), 10);
  const afterUnlock = selectLuxuryPositionCard({
    cards,
    actorIndex: 0,
    outfits,
    usedCardIds: [],
    luxuryPercent: 80,
    config: DEFAULT_LUXURY_PROGRESSION_CONFIG,
    random: () => .999999,
  });
  assert.equal(derivePositionDifficultyStars(afterUnlock.card!), 10);
});

test('Luxury selection normalizes missing stars, avoids repeats and resets only after exhaustion', () => {
  const cards = [makePositionCard('one-a', 1), makePositionCard('one-b', 1)];
  const first = selectLuxuryPositionCard({
    cards,
    actorIndex: 0,
    outfits,
    usedCardIds: [],
    luxuryPercent: 0,
    config: DEFAULT_LUXURY_PROGRESSION_CONFIG,
    random: () => 0,
  });
  assert.equal(first.probabilities.stars[1], 1);
  const second = selectLuxuryPositionCard({
    cards,
    actorIndex: 0,
    outfits,
    usedCardIds: first.nextUsedCardIds,
    luxuryPercent: 0,
    config: DEFAULT_LUXURY_PROGRESSION_CONFIG,
    random: () => 0,
  });
  assert.notEqual(second.card?.id, first.card?.id);
  const reset = selectLuxuryPositionCard({
    cards,
    actorIndex: 0,
    outfits,
    usedCardIds: second.nextUsedCardIds,
    luxuryPercent: 0,
    config: DEFAULT_LUXURY_PROGRESSION_CONFIG,
    random: () => 0,
  });
  assert.equal(reset.didResetPool, true);
  assert.equal(reset.nextUsedCardIds.length, 1);
});

test('Luxury completion uses 6–14 defaults, per-card override and clamps at 100', () => {
  assert.deepEqual(
    calculateCompletedPositionLuxury(0, makePositionCard('one', 1), DEFAULT_LUXURY_PROGRESSION_CONFIG),
    { nextPercent: 6, baseApplied: 6, removalApplied: 0, totalApplied: 6 },
  );
  assert.deepEqual(
    calculateCompletedPositionLuxury(90, makePositionCard('nine', 9), DEFAULT_LUXURY_PROGRESSION_CONFIG),
    { nextPercent: 100, baseApplied: 10, removalApplied: 0, totalApplied: 10 },
  );
  assert.equal(
    calculateCompletedPositionLuxury(20, makePositionCard('override', 5, 17), DEFAULT_LUXURY_PROGRESSION_CONFIG).totalApplied,
    17,
  );
});

test('100 percent forces the 10-star final and reports a missing final without crashing', () => {
  const final = makePositionCard('final', 10);
  const forced = selectLuxuryPositionCard({
    cards: [makePositionCard('nine', 9), final],
    actorIndex: 0,
    outfits,
    usedCardIds: ['final'],
    luxuryPercent: 100,
    config: DEFAULT_LUXURY_PROGRESSION_CONFIG,
    random: () => 0,
  });
  assert.equal(forced.card?.id, 'final');
  assert.equal(forced.probabilities.stars[10], 1);
  const missing = selectLuxuryPositionCard({
    cards: [makePositionCard('nine', 9)],
    actorIndex: 0,
    outfits,
    usedCardIds: [],
    luxuryPercent: 100,
    config: DEFAULT_LUXURY_PROGRESSION_CONFIG,
    random: () => 0,
  });
  assert.equal(missing.card, null);
  assert.equal(missing.missingFinalCard, true);
});

test('Luxury config hydration preserves valid rows and rejects all-zero rows', () => {
  const hydrated = hydrateLuxuryProgressionConfig({
    bands: [
      { starWeights: Object.fromEntries(Array.from({ length: 10 }, (_, index) => [index + 1, 0])) },
      { starWeights: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8, 10: 9 } },
    ],
    starGains: { 1: -5, 2: 9, 10: 500 },
  });
  assert.deepEqual(hydrated.bands[0], DEFAULT_LUXURY_PROGRESSION_CONFIG.bands[0]);
  assert.equal(hydrated.bands[1].starWeights[10], 9);
  assert.equal(hydrated.starGains[1], 6);
  assert.equal(hydrated.starGains[2], 9);
  assert.equal(hydrated.starGains[10], 100);
});
