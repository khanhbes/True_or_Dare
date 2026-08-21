import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve('data/catalog');
const sha256 = (value: Uint8Array): string => createHash('sha256').update(value).digest('hex');

test('materialized local catalog contains the exact recovered 157-card snapshot', async () => {
  const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8')) as {
    counts: Record<string, number>;
    checksums: Record<string, string>;
  };
  assert.deepEqual(manifest.counts, {
    systemCards: 108,
    customCards: 51,
    overrides: 38,
    deletedSystemCards: 2,
    visibleCards: 157,
    assets: 43,
  });
  const catalog = JSON.parse(await readFile(path.join(root, 'catalog.json'), 'utf8')) as {
    visibleCardCount: number;
    cards: Array<{ id: string }>;
  };
  assert.equal(catalog.visibleCardCount, 157);
  assert.equal(catalog.cards.length, 157);
  assert.equal(new Set(catalog.cards.map((card) => card.id)).size, 157);
  for (const [filename, expected] of Object.entries(manifest.checksums)) {
    assert.equal(sha256(await readFile(path.join(root, filename))), expected, filename);
  }
});
