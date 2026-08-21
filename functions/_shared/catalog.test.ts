import assert from 'node:assert/strict';
import test from 'node:test';
import { CATALOG_SCHEMA_VERSION, validateRecoveryBundle } from './catalog';
import { DEFAULT_LUXURY_PROGRESSION_CONFIG, DEFAULT_PROGRESSION_CONFIG } from '../../src/utils/progression';

const customCard = {
  id: 'custom-position-1',
  type: 'dare',
  level: 'passionate',
  deck: 'position',
  content: 'Không thay đổi nội dung',
  isCustom: true,
  position: {
    family: 'other',
    customLabel: 'Riêng',
    recipient: 'both',
    orderGroup: 2,
    rarity: 'luxury',
    difficultyStars: 6,
  },
} as const;

test('recovery bundle keeps cards, overrides, deletions and asset references', () => {
  const bundle = validateRecoveryBundle({
    schemaVersion: CATALOG_SCHEMA_VERSION,
    createdAt: '2026-08-21T00:00:00.000Z',
    customCards: [customCard],
    editedCards: [{ ...customCard, id: 'system-1', isCustom: false }],
    deletedSystemCardIds: ['system-2'],
    progressionConfig: DEFAULT_PROGRESSION_CONFIG,
    luxuryProgressionConfig: DEFAULT_LUXURY_PROGRESSION_CONFIG,
    assets: [{ id: 'card-image:custom-position-1', sha256: 'a'.repeat(64), mimeType: 'image/png', size: 12 }],
  });
  assert.ok(bundle);
  assert.equal(bundle.customCards[0].content, customCard.content);
  assert.deepEqual(bundle.deletedSystemCardIds, ['system-2']);
  assert.equal(bundle.assets.length, 1);
});

test('recovery validation rejects duplicate IDs and malformed checksums', () => {
  const common = {
    schemaVersion: CATALOG_SCHEMA_VERSION,
    createdAt: '2026-08-21T00:00:00.000Z',
    editedCards: [],
    deletedSystemCardIds: [],
    progressionConfig: DEFAULT_PROGRESSION_CONFIG,
    luxuryProgressionConfig: DEFAULT_LUXURY_PROGRESSION_CONFIG,
  };
  assert.equal(validateRecoveryBundle({
    ...common,
    customCards: [customCard, customCard],
    assets: [],
  }), null);
  assert.equal(validateRecoveryBundle({
    ...common,
    customCards: [customCard],
    assets: [{ id: 'x', sha256: 'broken', mimeType: 'image/png', size: 1 }],
  }), null);
});
