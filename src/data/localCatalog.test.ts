import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve('data/catalog');
const sha256 = (value: Uint8Array): string => createHash('sha256').update(value).digest('hex');

test('materialized local catalog matches its manifest and checksums', async () => {
  const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8')) as {
    counts: Record<string, number>;
    checksums: Record<string, string>;
  };
  assert.equal(manifest.counts.systemCards, 108);
  assert.equal(
    manifest.counts.visibleCards,
    manifest.counts.systemCards - manifest.counts.deletedSystemCards + manifest.counts.customCards,
  );
  const catalog = JSON.parse(await readFile(path.join(root, 'catalog.json'), 'utf8')) as {
    visibleCardCount: number;
    cards: Array<{ id: string }>;
  };
  assert.equal(catalog.visibleCardCount, manifest.counts.visibleCards);
  assert.equal(catalog.cards.length, manifest.counts.visibleCards);
  assert.equal(new Set(catalog.cards.map((card) => card.id)).size, catalog.cards.length);
  const bundle = JSON.parse(await readFile(path.join(root, 'seed-bundle.json'), 'utf8')) as {
    customCards: unknown[];
    editedCards: unknown[];
    deletedSystemCardIds: string[];
    assets: unknown[];
  };
  assert.equal(bundle.customCards.length, manifest.counts.customCards);
  assert.equal(bundle.editedCards.length, manifest.counts.overrides);
  assert.equal(bundle.deletedSystemCardIds.length, manifest.counts.deletedSystemCards);
  assert.equal(bundle.assets.length, manifest.counts.assets);
  for (const [filename, expected] of Object.entries(manifest.checksums)) {
    assert.equal(sha256(await readFile(path.join(root, filename))), expected, filename);
  }
});
