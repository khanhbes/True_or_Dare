import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCatalogPayload, parseStoredCards } from './cardSchema';
import { DEFAULT_LUXURY_PROGRESSION_CONFIG, DEFAULT_PROGRESSION_CONFIG } from './progression';

const card = {
  id: 'custom-1',
  type: 'truth',
  level: 'gentle',
  content: 'Nội dung được giữ nguyên',
  isCustom: true,
} as const;

test('legacy cards survive malformed optional timer metadata', () => {
  const [normalized] = parseStoredCards([{ ...card, timerSeconds: 0 }]);
  assert.equal(normalized.timerSeconds, null);
  assert.equal(normalized.content, card.content);
  assert.equal(parseStoredCards([{ ...card, timerSeconds: 3.5 }])[0].timerSeconds, undefined);
});

test('catalog payload is accepted only when declared counts match validated entities', () => {
  const payload = {
    schemaVersion: 1,
    datasetRevision: 8,
    seededAt: '2026-08-21T00:00:00.000Z',
    updatedAt: '2026-08-21T00:01:00.000Z',
    customCards: [card],
    editedCards: [],
    deletedSystemCardIds: ['system-2'],
    progressionConfig: DEFAULT_PROGRESSION_CONFIG,
    luxuryProgressionConfig: DEFAULT_LUXURY_PROGRESSION_CONFIG,
    assets: [],
    counts: { customCards: 1, editedCards: 0, deletedSystemCards: 1, assets: 0 },
  };
  assert.equal(parseCatalogPayload(payload)?.datasetRevision, 8);
  assert.equal(parseCatalogPayload({ ...payload, counts: { ...payload.counts, customCards: 0 } }), null);
  assert.equal(parseCatalogPayload({ ...payload, customCards: [] }), null);
});

test('duplicate card IDs and deleted IDs make cloud payload invalid instead of erasing cache', () => {
  const base = {
    schemaVersion: 1,
    datasetRevision: 1,
    seededAt: '2026-08-21T00:00:00.000Z',
    updatedAt: '2026-08-21T00:00:00.000Z',
    progressionConfig: DEFAULT_PROGRESSION_CONFIG,
    luxuryProgressionConfig: DEFAULT_LUXURY_PROGRESSION_CONFIG,
    assets: [],
  };
  assert.equal(parseCatalogPayload({
    ...base,
    customCards: [card, card],
    editedCards: [],
    deletedSystemCardIds: [],
    counts: { customCards: 2, editedCards: 0, deletedSystemCards: 0, assets: 0 },
  }), null);
  assert.equal(parseCatalogPayload({
    ...base,
    customCards: [],
    editedCards: [],
    deletedSystemCardIds: ['a', 'a'],
    counts: { customCards: 0, editedCards: 0, deletedSystemCards: 2, assets: 0 },
  }), null);
});
