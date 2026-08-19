import assert from 'node:assert/strict';
import test from 'node:test';
import { CardItem } from '../types';
import {
  areBothPlayersLowOnClothing,
  getCardDrawProbabilities,
  getEligibleCardDrawProbabilities,
  getTargetIndex,
  isCardEligibleForOutfits,
  isClothingEffect,
  mergeEditedSystemCard,
  selectEligibleCard,
} from './cardSelection';
import { createOutfitState, DEFAULT_GAME_SETTINGS, removeGarment } from './wardrobe';

const cards: CardItem[] = [
  { id: 'g-truth', type: 'truth', level: 'gentle', content: 'G' },
  { id: 'i-dare', type: 'dare', level: 'intimate', content: 'I' },
  { id: 'p-truth', type: 'truth', level: 'passionate', content: 'P' },
  {
    id: 'remove-opponent',
    type: 'dare',
    level: 'passionate',
    content: 'R',
    clothingEffect: { kind: 'remove_garment', target: 'opponent' },
  },
];

const dressedOutfits = () => [
  createOutfitState(DEFAULT_GAME_SETTINGS.outfits[0]),
  createOutfitState(DEFAULT_GAME_SETTINGS.outfits[1]),
] as const;

const emptyOutfit = (index: 0 | 1) => {
  let state = createOutfitState(DEFAULT_GAME_SETTINGS.outfits[index]);
  const removalOrder = index === 0
    ? (['shirt', 'pants', 'underwear'] as const)
    : (['shirt', 'pants', 'bra', 'underwear'] as const);
  for (const slot of removalOrder) state = removeGarment(state, slot);
  return state;
};

const lowOutfits = (): readonly [ReturnType<typeof createOutfitState>, ReturnType<typeof createOutfitState>] => {
  const outfits = dressedOutfits();
  let male = removeGarment(removeGarment(outfits[0], 'shirt'), 'pants');
  let female = removeGarment(removeGarment(outfits[1], 'shirt'), 'pants');
  female = removeGarment(female, 'bra');
  return [male, female];
};

const assertClose = (actual: number, expected: number) => {
  assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
};

test('self and opponent effects resolve both player indexes correctly', () => {
  const self = { kind: 'remove_garment', target: 'self' } as const;
  const opponent = { kind: 'remove_garment', target: 'opponent' } as const;

  assert.equal(getTargetIndex(self, 0), 0);
  assert.equal(getTargetIndex(self, 1), 1);
  assert.equal(getTargetIndex(opponent, 0), 1);
  assert.equal(getTargetIndex(opponent, 1), 0);

  const maleEmpty = emptyOutfit(0);
  const femaleDressed = dressedOutfits()[1];
  const selfCard: CardItem = {
    id: 'remove-self',
    type: 'dare',
    level: 'intimate',
    content: 'self',
    clothingEffect: self,
  };
  const opponentCard: CardItem = { ...selfCard, id: 'remove-other', clothingEffect: opponent };

  assert.equal(isCardEligibleForOutfits(selfCard, 0, [maleEmpty, femaleDressed]), false);
  assert.equal(isCardEligibleForOutfits(opponentCard, 0, [maleEmpty, femaleDressed]), true);
  assert.equal(isCardEligibleForOutfits(selfCard, 1, [maleEmpty, femaleDressed]), true);
  assert.equal(isCardEligibleForOutfits(opponentCard, 1, [maleEmpty, femaleDressed]), false);
});

test('invalid clothing effects are rejected without affecting cards with null or no effect', () => {
  const invalidEffects = [
    undefined,
    null,
    {},
    { kind: 'remove_garment' },
    { kind: 'unknown', target: 'self' },
    { kind: 'remove_garment', target: 'third_player' },
  ];
  assert.deepEqual(invalidEffects.map(isClothingEffect), [false, false, false, false, false, false]);

  const outfits = dressedOutfits();
  const noEffect: CardItem = { id: 'none', type: 'truth', level: 'gentle', content: 'none' };
  const explicitlyDisabled: CardItem = { ...noEffect, id: 'null', clothingEffect: null };
  const malformed = {
    ...noEffect,
    id: 'bad',
    clothingEffect: { kind: 'remove_garment', target: 'third_player' },
  } as unknown as CardItem;

  assert.equal(isCardEligibleForOutfits(noEffect, 0, outfits), true);
  assert.equal(isCardEligibleForOutfits(explicitlyDisabled, 0, outfits), true);
  assert.equal(isCardEligibleForOutfits(malformed, 0, outfits), false);
  const result = selectEligibleCard({
    cards: [malformed],
    actorIndex: 0,
    outfits,
    usedCardIds: [],
    random: () => 0,
  });
  assert.equal(result.card, null);
});

test('a clothing-effect card becomes ineligible when its target is empty', () => {
  const outfits = dressedOutfits();
  let target = outfits[1];
  for (const slot of ['shirt', 'pants', 'bra', 'underwear'] as const) {
    target = removeGarment(target, slot);
  }
  assert.equal(isCardEligibleForOutfits(cards[3], 0, [outfits[0], target]), false);
});

test('base probabilities are 50/50 by type and 70/20/10 by level', () => {
  const probabilities = getCardDrawProbabilities({ outfits: dressedOutfits() });
  assert.deepEqual(probabilities.types, { truth: 0.5, dare: 0.5 });
  assert.deepEqual(probabilities.levels, {
    gentle: 0.7,
    intimate: 0.2,
    passionate: 0.1,
  });
  assert.equal(probabilities.passionateBoosted, false);
});

test('passionate rises to 40 percent only when both players have at most one garment', () => {
  const dressed = dressedOutfits();
  const oneLow = [lowOutfits()[0], dressed[1]] as const;
  assert.equal(areBothPlayersLowOnClothing(oneLow), false);
  assert.equal(getCardDrawProbabilities({ outfits: oneLow }).passionateBoosted, false);

  const low = lowOutfits();
  const probabilities = getCardDrawProbabilities({ outfits: low });
  assert.equal(areBothPlayersLowOnClothing(low), true);
  assert.equal(probabilities.passionateBoosted, true);
  assertClose(probabilities.levels.gentle, 7 / 15);
  assertClose(probabilities.levels.intimate, 2 / 15);
  assertClose(probabilities.levels.passionate, 0.4);

  const empty = [emptyOutfit(0), emptyOutfit(1)] as const;
  assert.equal(getCardDrawProbabilities({ outfits: empty }).passionateBoosted, true);
});

test('disabled and unavailable categories are zeroed and remaining weights renormalize', () => {
  const noPassionate = getCardDrawProbabilities({
    outfits: lowOutfits(),
    levels: ['gentle', 'intimate'],
  });
  assertClose(noPassionate.levels.gentle, 7 / 9);
  assertClose(noPassionate.levels.intimate, 2 / 9);
  assert.equal(noPassionate.levels.passionate, 0);

  const dareOnly = getCardDrawProbabilities({
    outfits: dressedOutfits(),
    availableTypes: ['dare'],
  });
  assert.deepEqual(dareOnly.types, { truth: 0, dare: 1 });

  const missingPreferred = getCardDrawProbabilities({
    outfits: dressedOutfits(),
    preferredType: 'truth',
    availableTypes: ['dare'],
  });
  assert.deepEqual(missingPreferred.types, { truth: 0, dare: 0 });
});

test('eligible probability helper reports exact marginals for asymmetric card pools', () => {
  const asymmetric: CardItem[] = [
    { id: 'only-truth', type: 'truth', level: 'gentle', content: 'T' },
    { id: 'only-dare', type: 'dare', level: 'passionate', content: 'D' },
  ];
  const probabilities = getEligibleCardDrawProbabilities({
    cards: asymmetric,
    actorIndex: 0,
    outfits: dressedOutfits(),
    usedCardIds: [],
  });
  assert.deepEqual(probabilities.types, { truth: 0.5, dare: 0.5 });
  assert.deepEqual(probabilities.levels, { gentle: 0.5, intimate: 0, passionate: 0.5 });

  const afterTruth = getEligibleCardDrawProbabilities({
    cards: asymmetric,
    actorIndex: 0,
    outfits: dressedOutfits(),
    usedCardIds: ['only-truth'],
  });
  assert.deepEqual(afterTruth.types, { truth: 0, dare: 1 });
  assert.deepEqual(afterTruth.levels, { gentle: 0, intimate: 0, passionate: 1 });

  const reset = getEligibleCardDrawProbabilities({
    cards: asymmetric,
    actorIndex: 0,
    outfits: dressedOutfits(),
    usedCardIds: ['only-truth', 'only-dare'],
  });
  assert.deepEqual(reset.types, { truth: 0.5, dare: 0.5 });
});

test('selector applies exact type and level boundaries with injectable RNG', () => {
  const grid: CardItem[] = [
    { id: 'g-t', type: 'truth', level: 'gentle', content: '' },
    { id: 'g-d', type: 'dare', level: 'gentle', content: '' },
    { id: 'i-t', type: 'truth', level: 'intimate', content: '' },
    { id: 'i-d', type: 'dare', level: 'intimate', content: '' },
    { id: 'p-t', type: 'truth', level: 'passionate', content: '' },
    { id: 'p-d', type: 'dare', level: 'passionate', content: '' },
  ];
  const draw = (values: number[], outfits = dressedOutfits()) => selectEligibleCard({
    cards: grid,
    actorIndex: 0,
    outfits,
    usedCardIds: [],
    random: () => values.shift() ?? 0,
  }).card?.id;

  assert.equal(draw([0.499999, 0.699999, 0]), 'g-t');
  assert.equal(draw([0.5, 0.7, 0]), 'i-d');
  assert.equal(draw([0, 0.9, 0]), 'p-t');
  assert.equal(draw([0, 0.599999, 0], lowOutfits()), 'i-t');
  assert.equal(draw([0, 0.6, 0], lowOutfits()), 'p-t');
});

test('preferred type overrides 50/50 while disabled passionate never opens', () => {
  const values = [0.999, 0];
  const result = selectEligibleCard({
    cards,
    preferredType: 'dare',
    actorIndex: 0,
    outfits: lowOutfits(),
    usedCardIds: [],
    levels: ['gentle', 'intimate'],
    random: () => values.shift() ?? 0,
  });
  assert.equal(result.card?.id, 'i-dare');
  assert.notEqual(result.card?.level, 'passionate');
});

test('selection avoids repeats until the current pool is exhausted', () => {
  const outfits = dressedOutfits();
  const first = selectEligibleCard({
    cards: cards.slice(0, 2),
    preferredType: null,
    actorIndex: 0,
    outfits,
    usedCardIds: [],
    random: () => 0,
  });
  const second = selectEligibleCard({
    cards: cards.slice(0, 2),
    preferredType: null,
    actorIndex: 0,
    outfits,
    usedCardIds: first.nextUsedCardIds,
    random: () => 0,
  });
  assert.notEqual(first.card?.id, second.card?.id);
  const third = selectEligibleCard({
    cards: cards.slice(0, 2),
    actorIndex: 0,
    outfits,
    usedCardIds: second.nextUsedCardIds,
    random: () => 0,
  });
  assert.equal(third.didResetPool, true);
});

test('exhausting a preferred type resets only IDs belonging to that eligible pool', () => {
  const truthA: CardItem = { id: 'truth-a', type: 'truth', level: 'gentle', content: 'A' };
  const truthB: CardItem = { id: 'truth-b', type: 'truth', level: 'gentle', content: 'B' };
  const dare: CardItem = { id: 'dare-a', type: 'dare', level: 'gentle', content: 'D' };
  const result = selectEligibleCard({
    cards: [truthA, truthB, dare],
    preferredType: 'truth',
    actorIndex: 0,
    outfits: dressedOutfits(),
    usedCardIds: ['truth-a', 'truth-b', 'dare-a', 'no-longer-in-cards'],
    random: () => 0,
  });

  assert.equal(result.didResetPool, true);
  assert.equal(result.card?.id, 'truth-a');
  assert.deepEqual(result.nextUsedCardIds, ['dare-a', 'no-longer-in-cards', 'truth-a']);

  const next = selectEligibleCard({
    cards: [truthA, truthB, dare],
    preferredType: 'truth',
    actorIndex: 0,
    outfits: dressedOutfits(),
    usedCardIds: result.nextUsedCardIds,
    random: () => 0,
  });
  assert.equal(next.didResetPool, false);
  assert.equal(next.card?.id, 'truth-b');
  assert.ok(next.nextUsedCardIds.includes('dare-a'));
});

test('preferred type with no eligible cards returns null instead of changing type', () => {
  const result = selectEligibleCard({
    cards: [cards[0]],
    preferredType: 'dare',
    actorIndex: 0,
    outfits: dressedOutfits(),
    usedCardIds: [],
  });
  assert.equal(result.card, null);
  assert.deepEqual(result.availableTypes, ['truth']);
});

test('system metadata survives legacy edits while explicit overrides stay explicit', () => {
  const system: CardItem = {
    ...cards[3],
    icon: 'blindfold_kiss',
    timerSeconds: 45,
    deck: 'position',
    progression: { difficultyStars: 4, audience: 'both', intimacyGain: 11 },
    position: {
      family: 'handjob',
      recipient: 'both',
      orderGroup: 3,
      rarity: 'luxury',
    },
  };
  const legacyEdit = { ...system, content: 'Edited', icon: 'kiss_surprise' };
  delete legacyEdit.clothingEffect;
  delete legacyEdit.timerSeconds;
  delete legacyEdit.deck;
  delete legacyEdit.progression;
  delete legacyEdit.position;
  const inherited = mergeEditedSystemCard(system, legacyEdit);
  const explicitUndefined = mergeEditedSystemCard(system, {
    ...legacyEdit,
    clothingEffect: undefined,
  });
  const disabled = mergeEditedSystemCard(system, { ...legacyEdit, clothingEffect: null });
  const timerOverride = mergeEditedSystemCard(system, { ...legacyEdit, timerSeconds: 90 });
  const timerDisabled = mergeEditedSystemCard(system, { ...legacyEdit, timerSeconds: null });
  const customIllustration = mergeEditedSystemCard(system, {
    ...legacyEdit,
    icon: 'heart',
    illustrationOverride: true,
  });
  const progressionOverride = mergeEditedSystemCard(system, {
    ...legacyEdit,
    deck: 'standard',
    progression: { difficultyStars: 2, audience: 'female' },
    position: null,
  });

  assert.equal(inherited.content, 'Edited');
  assert.equal(inherited.icon, 'blindfold_kiss');
  assert.deepEqual(inherited.clothingEffect, system.clothingEffect);
  assert.deepEqual(explicitUndefined.clothingEffect, system.clothingEffect);
  assert.equal(disabled.clothingEffect, null);
  assert.equal(inherited.timerSeconds, 45);
  assert.equal(timerOverride.timerSeconds, 90);
  assert.equal(timerDisabled.timerSeconds, null);
  assert.equal(inherited.deck, 'position');
  assert.deepEqual(inherited.progression, system.progression);
  assert.deepEqual(inherited.position, system.position);
  assert.equal(progressionOverride.deck, 'standard');
  assert.deepEqual(progressionOverride.progression, { difficultyStars: 2, audience: 'female' });
  assert.equal(progressionOverride.position, null);
  assert.equal(customIllustration.icon, 'heart');
  assert.deepEqual(system.clothingEffect, { kind: 'remove_garment', target: 'opponent' });
});
