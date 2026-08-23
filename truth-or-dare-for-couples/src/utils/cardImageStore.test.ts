import assert from 'node:assert/strict';
import test from 'node:test';
import type { CardItem } from '../types';
import type { CardImageStore } from './cardImageStore';
import { prepareCardsForStorage } from './cardImageStore';

const card: CardItem = {
  id: 'custom-image', type: 'dare', level: 'gentle', content: 'Ảnh riêng', isCustom: true,
  customImage: 'data:image/png;base64,iVBORw0KGgo=',
};

test('base64 is removed only after IndexedDB-compatible storage succeeds', async () => {
  const saved = new Map<string, Blob>();
  const store: CardImageStore = {
    async put(id, value) { saved.set(id, value); },
    async get(id) { return saved.get(id) ?? null; },
    async delete(id) { saved.delete(id); },
  };
  const result = await prepareCardsForStorage([card], store);
  assert.equal(result.errors.length, 0);
  assert.equal(result.cards[0].customImage, undefined);
  assert.equal(result.cards[0].customImageId, 'card-image:custom-image');
  assert.ok(saved.has('card-image:custom-image'));
});

test('quota or IndexedDB failure retains the legacy base64 image', async () => {
  const failingStore: CardImageStore = {
    async put() { throw new Error('QuotaExceededError'); },
    async get() { return null; },
    async delete() {},
  };
  const result = await prepareCardsForStorage([card], failingStore);
  assert.equal(result.cards[0].customImage, card.customImage);
  assert.equal(result.cards[0].customImageId, undefined);
  assert.equal(result.errors.length, 1);
});
