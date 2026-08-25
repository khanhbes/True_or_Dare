import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import type { CardItem } from '../types';
import { compareCollectionCards } from '../utils/cardOrdering';
import { derivePositionDifficultyStars, getCardTurnAudience } from '../utils/progression';

const root = path.resolve('data/catalog');
const sha256 = (value: Uint8Array): string => createHash('sha256').update(value).digest('hex');

test('materialized local catalog matches its manifest and checksums', async () => {
  const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8')) as {
    counts: Record<string, number>; checksums: Record<string, string>;
  };
  const catalog = JSON.parse(await readFile(path.join(root, 'catalog.json'), 'utf8')) as {
    visibleCardCount: number; cards: Array<{ id: string }>;
  };
  const bundle = JSON.parse(await readFile(path.join(root, 'seed-bundle.json'), 'utf8')) as {
    customCards: unknown[]; editedCards: unknown[]; deletedSystemCardIds: string[]; assets: unknown[];
  };
  assert.equal(manifest.counts.systemCards, 108);
  assert.equal(manifest.counts.visibleCards, catalog.visibleCardCount);
  assert.equal(catalog.cards.length, manifest.counts.visibleCards);
  assert.equal(new Set(catalog.cards.map((card) => card.id)).size, catalog.cards.length);
  assert.equal(bundle.customCards.length, manifest.counts.customCards);
  assert.equal(bundle.editedCards.length, manifest.counts.overrides);
  assert.equal(bundle.deletedSystemCardIds.length, manifest.counts.deletedSystemCards);
  assert.equal(bundle.assets.length, manifest.counts.assets);
  for (const [filename, expected] of Object.entries(manifest.checksums)) {
    assert.equal(sha256(await readFile(path.join(root, filename))), expected, filename);
  }
});

test('cloud catalog preserves every downloaded card and canonical collection order', async () => {
  const catalog = JSON.parse(await readFile(path.join(root, 'catalog.json'), 'utf8')) as { cards: CardItem[] };
  assert.ok(catalog.cards.length >= 108);
  assert.equal(new Set(catalog.cards.map((card) => card.id)).size, catalog.cards.length);
  assert.ok(catalog.cards.every((card) => card.content.trim().length > 0));
  assert.deepEqual([...catalog.cards].sort(compareCollectionCards).map((card) => card.id), catalog.cards.map((card) => card.id));
  assert.ok(catalog.cards.every((card) => card.deck === 'position'
    ? Boolean(card.position?.turnAudience ?? card.position?.recipient)
    : Boolean(card.progression?.turnAudience ?? card.progression?.audience)));
});

test('cloud Position cards use normalized 6–10 stars with valid metadata', async () => {
  const catalog = JSON.parse(await readFile(path.join(root, 'catalog.json'), 'utf8')) as { cards: CardItem[] };
  const positions = catalog.cards.filter((card) => card.deck === 'position');
  assert.ok(positions.length > 0);
  assert.ok(positions.every((card) => {
    const stars = derivePositionDifficultyStars(card);
    return stars >= 6 && stars <= 10 &&
      ['male', 'female', 'both'].includes(getCardTurnAudience(card)) &&
      Boolean(card.position?.family) && Boolean(card.position?.orderGroup);
  }));
  assert.ok(new Set(positions.map(derivePositionDifficultyStars)).size >= 3);
});
