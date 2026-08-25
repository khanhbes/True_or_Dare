import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import type { CardItem, PositionDifficultyStars } from '../types';
import { compareCollectionCards } from '../utils/cardOrdering';
import { derivePositionDifficultyStars, getCardTurnAudience } from '../utils/progression';

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

test('gameplay metadata migration preserves all 157 card texts and canonical order', async () => {
  const catalog = JSON.parse(await readFile(path.join(root, 'catalog.json'), 'utf8')) as { cards: CardItem[] };
  const contentHash = sha256(Buffer.from(JSON.stringify(
    catalog.cards.map(({ id, content }) => [id, content]),
  )));
  assert.equal(contentHash, '6562c337f7773084053767a7251258f8140a406c6f3cf25fd7564cc9ce55a78d');
  assert.deepEqual([...catalog.cards].sort(compareCollectionCards).map((card) => card.id), catalog.cards.map((card) => card.id));
  assert.ok(catalog.cards.every((card) => card.deck === 'position'
    ? Boolean(card.position?.turnAudience)
    : Boolean(card.progression?.turnAudience)));
  const passCard = catalog.cards.find((card) => card.id === 'g-d-14');
  assert.equal(passCard?.timerSeconds, null);
  assert.equal(passCard?.gameplayEffect?.kind, 'pass_turn');
});

test('the migrated non-final Position pool covers 6–10 stars for both turns', async () => {
  const catalog = JSON.parse(await readFile(path.join(root, 'catalog.json'), 'utf8')) as { cards: CardItem[] };
  const positions = catalog.cards.filter((card) =>
    card.deck === 'position' && card.position?.family !== 'have_sex',
  );
  const expected = [6, 7, 8, 9, 10];
  const starsFor = (audience: 'male' | 'female') => [...new Set(
    positions
      .filter((card) => ['both', audience].includes(getCardTurnAudience(card)))
      .map(derivePositionDifficultyStars),
  )].sort((a, b) => a - b) as PositionDifficultyStars[];
  assert.deepEqual(starsFor('male'), expected);
  assert.deepEqual(starsFor('female'), expected);
});

test('all 23 non-final Position cards keep the approved audience, stars and family', async () => {
  const catalog = JSON.parse(await readFile(path.join(root, 'catalog.json'), 'utf8')) as { cards: CardItem[] };
  const expected = new Map<string, [string, number, string]>([
    ['pos-handjob-female', ['both', 6, 'other']],
    ['custom-1787230294200', ['both', 7, 'handjob']],
    ['pos-oral-male', ['both', 7, 'oral']],
    ['pos-close-embrace-2', ['both', 8, 'oral']],
    ['pos-connection-1', ['both', 9, 'oral']],
    ['pos-oral-female', ['male', 8, 'oral']],
    ['pos-guided-touch-4', ['male', 4, 'oral']],
    ['pos-blowjob-male', ['male', 4, 'other']],
    ['pos-blowjob-female', ['male', 5, 'oral']],
    ['custom-1787207987099', ['male', 5, 'oral']],
    ['pos-blowjob-both', ['male', 6, 'oral']],
    ['custom-1787214401588', ['male', 6, 'oral']],
    ['custom-1787209509884', ['female', 3, 'blowjob']],
    ['pos-oral-both', ['female', 4, 'handjob']],
    ['custom-1787224227727', ['female', 4, 'handjob']],
    ['custom-1787209236371', ['female', 5, 'handjob']],
    ['custom-1787209789032', ['female', 5, 'handjob']],
    ['custom-1787209029981', ['female', 5, 'blowjob']],
    ['custom-1787209622650', ['female', 6, 'blowjob']],
    ['pos-handjob-male', ['female', 6, 'other']],
    ['pos-handjob-both', ['female', 7, 'handjob']],
    ['custom-1787209997733', ['female', 7, 'blowjob']],
    ['pos-massage-6', ['female', 8, 'blowjob']],
  ]);
  assert.equal(expected.size, 23);
  for (const [id, metadata] of expected) {
    const card = catalog.cards.find((item) => item.id === id);
    assert.ok(card, id);
    const normalizedMetadata: [string, number, string] = [
      metadata[0], metadata[1] < 6 ? metadata[1] + 5 : metadata[1], metadata[2],
    ];
    assert.deepEqual(
      [getCardTurnAudience(card), derivePositionDifficultyStars(card), card.position?.family],
      normalizedMetadata,
      id,
    );
  }
});
