import assert from 'node:assert/strict';
import test from 'node:test';
import { GarmentSlot, OutfitConfig, PlayerPresentation } from '../types';
import {
  createOutfitState,
  DEFAULT_GAME_SETTINGS,
  GARMENT_SLOT_ORDER,
  getOutfitStage,
  getPresentGarmentSlots,
  getRemovableGarments,
  hydrateGameSettings,
  hydrateOutfitConfig,
  isGarmentRemovable,
  removeGarment,
} from './wardrobe';

const powerSet = <T>(items: readonly T[]): T[][] =>
  items.reduce<T[][]>(
    (subsets, item) => [...subsets, ...subsets.map((subset) => [...subset, item])],
    [[]],
  );

const outfitWithSlots = (
  presentation: PlayerPresentation,
  slots: readonly GarmentSlot[],
): OutfitConfig => {
  const defaults = DEFAULT_GAME_SETTINGS.outfits[presentation === 'male' ? 0 : 1];
  return {
    presentation,
    garments: Object.fromEntries(
      slots.map((slot) => [slot, { ...defaults.garments[slot]! }]),
    ),
  };
};

test('hydrate settings migrates legacy values and supplies outfit defaults', () => {
  const settings = hydrateGameSettings({
    levels: ['gentle'],
    roundsMode: 'target',
    targetRounds: 10,
    privacyDefault: false,
    enableTimer: false,
    timerDuration: 20,
    drawMode: 'choose',
  });

  assert.deepEqual(settings.levels, ['gentle']);
  assert.equal(settings.penaltyClothingEnabled, true);
  assert.equal(Object.keys(settings.outfits[0].garments).length, 3);
  assert.equal(Object.keys(settings.outfits[1].garments).length, 4);
});

test('hydrate preserves an explicitly empty outfit and rejects malformed garments', () => {
  const empty = hydrateOutfitConfig({ garments: {} }, 'male');
  assert.deepEqual(empty.garments, {});

  const invalid = hydrateOutfitConfig({
    garments: {
      shirt: { styleId: 'unknown', color: '#FFFFFF' },
      pants: { styleId: 'jeans', color: 'navy' },
      bra: { styleId: 'classic', color: '#FF6B9D' },
    },
  }, 'male');
  assert.deepEqual(invalid.garments, {});
});

test('hydrate validates presentation, style and six-digit color per garment', () => {
  const male = hydrateOutfitConfig({
    presentation: 'female',
    garments: {
      shirt: { styleId: 'button_shirt', color: '#a1b2c3' },
      pants: { styleId: 'unknown', color: '#263A67' },
      underwear: { styleId: 'boxers', color: '#123' },
      bra: { styleId: 'classic', color: '#FF6B9D' },
    },
  }, 'male');

  assert.equal(male.presentation, 'male');
  assert.deepEqual(male.garments, {
    shirt: { styleId: 'button_shirt', color: '#A1B2C3' },
  });

  const female = hydrateOutfitConfig({
    presentation: 'male',
    garments: {
      shirt: { styleId: 'button_shirt', color: '#FF6B9D' },
      pants: { styleId: 'shorts', color: '#abcdef' },
      bra: { styleId: 'sports_bra', color: '#fff5ec' },
      underwear: { styleId: 'high_waist', color: 'transparent' },
    },
  }, 'female');

  assert.equal(female.presentation, 'female');
  assert.deepEqual(female.garments, {
    pants: { styleId: 'shorts', color: '#ABCDEF' },
    bra: { styleId: 'sports_bra', color: '#FFF5EC' },
  });
});

test('settings hydration forces the male/female tuple and preserves valid explicit values', () => {
  const settings = hydrateGameSettings({
    levels: ['passionate', 'passionate', 'invalid'],
    penaltyClothingEnabled: false,
    outfits: [
      {
        presentation: 'female',
        garments: { underwear: { styleId: 'briefs', color: '#101010' } },
      },
      {
        presentation: 'male',
        garments: { bra: { styleId: 'classic', color: '#f0f0f0' } },
      },
    ],
  });

  assert.deepEqual(settings.levels, ['passionate']);
  assert.equal(settings.penaltyClothingEnabled, false);
  assert.deepEqual(settings.outfits, [
    {
      presentation: 'male',
      garments: { underwear: { styleId: 'briefs', color: '#101010' } },
    },
    {
      presentation: 'female',
      garments: { bra: { styleId: 'classic', color: '#F0F0F0' } },
    },
  ]);
});

for (const presentation of ['male', 'female'] as const) {
  test(`${presentation} supports every allowed outfit subset and missing-layer combination`, () => {
    const allowedSlots = GARMENT_SLOT_ORDER[presentation];
    const subsets = powerSet(allowedSlots);
    const observedCounts = new Set<number>();

    for (const slots of subsets) {
      observedCounts.add(slots.length);
      const state = createOutfitState(outfitWithSlots(presentation, slots));
      const expectedStage = slots.length === 0
        ? 'empty'
        : slots.includes('shirt') || slots.includes('pants')
          ? 'dressed'
          : 'underwear_only';
      const expectedRemovable = slots.filter((slot) =>
        (slot !== 'bra' || !slots.includes('shirt')) &&
        (slot !== 'underwear' || !slots.includes('pants')),
      );

      assert.deepEqual(getPresentGarmentSlots(state), slots, `${presentation}: present ${slots}`);
      assert.equal(getOutfitStage(state), expectedStage, `${presentation}: stage ${slots}`);
      assert.deepEqual(
        getRemovableGarments(state),
        expectedRemovable,
        `${presentation}: removable ${slots}`,
      );

      for (const slot of allowedSlots) {
        const shouldRemove = expectedRemovable.includes(slot);
        assert.equal(isGarmentRemovable(state, slot), shouldRemove);
        const next = removeGarment(state, slot);
        if (shouldRemove) {
          assert.notEqual(next, state);
          assert.deepEqual(
            getPresentGarmentSlots(next),
            slots.filter((candidate) => candidate !== slot),
          );
        } else {
          assert.equal(next, state);
        }
      }
    }

    assert.deepEqual(
      [...observedCounts].sort((left, right) => left - right),
      Array.from({ length: allowedSlots.length + 1 }, (_, index) => index),
    );
    assert.equal(subsets.length, 2 ** allowedSlots.length);
  });
}

test('outer layers expose underwear in the correct order', () => {
  let state = createOutfitState(DEFAULT_GAME_SETTINGS.outfits[1]);
  assert.equal(getOutfitStage(state), 'dressed');
  assert.deepEqual(getRemovableGarments(state), ['shirt', 'pants']);

  const coveredAttempt = removeGarment(state, 'bra');
  assert.equal(coveredAttempt, state);

  state = removeGarment(state, 'shirt');
  assert.deepEqual(getRemovableGarments(state), ['pants', 'bra']);
  state = removeGarment(state, 'pants');
  assert.equal(getOutfitStage(state), 'underwear_only');
  assert.deepEqual(getRemovableGarments(state), ['bra', 'underwear']);
  state = removeGarment(removeGarment(state, 'bra'), 'underwear');
  assert.equal(getOutfitStage(state), 'empty');
});

test('invalid persisted settings fall back to safe defaults', () => {
  const settings = hydrateGameSettings({ levels: ['invalid'], outfits: 'bad' });
  assert.deepEqual(settings.levels, DEFAULT_GAME_SETTINGS.levels);
  assert.equal(settings.outfits[0].presentation, 'male');
  assert.equal(settings.outfits[1].presentation, 'female');
});
