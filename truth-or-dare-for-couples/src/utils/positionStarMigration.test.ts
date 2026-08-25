import test from 'node:test';
import assert from 'node:assert/strict';
import { migratePositionCard, migratePositionSnapshot, migratePositionStar, POSITION_STAR_SCHEMA_VERSION } from './positionStarMigration';
import type { CardItem } from '../types';

const card = (deck: CardItem['deck'], stars: number): CardItem => ({
  id: `test-${deck}-${stars}`, type: 'dare', level: 'intimate', content: 'x', deck,
  position: deck === 'position' ? { family: 'other', rarity: 'luxury', orderGroup: 1, difficultyStars: stars as never } : undefined,
});

test('Position legacy stars map to 6–10 and migration is idempotent', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(migratePositionStar), [6, 7, 8, 9, 10, 6, 7, 8, 9, 10]);
  const migrated = migratePositionCard(card('position', 1));
  assert.equal(migrated.position?.difficultyStars, 6);
  assert.equal(migratePositionCard(migrated).position?.difficultyStars, 6);
});

test('Standard cards are unchanged and invalid Position stars are rejected', () => {
  const standard = card('standard', 1);
  assert.equal(migratePositionCard(standard), standard);
  assert.throws(() => migratePositionStar(0));
  assert.throws(() => migratePositionStar(11));
});

test('saved snapshots migrate once and preserve unrelated fields', () => {
  const migrated = migratePositionSnapshot({ cards: [card('position', 2)], note: 'keep' });
  assert.equal(migrated?.positionStarSchemaVersion, POSITION_STAR_SCHEMA_VERSION);
  assert.equal(migrated?.cards[0].position?.difficultyStars, 7);
  assert.equal(migratePositionSnapshot(migrated)?.cards[0].position?.difficultyStars, 7);
  assert.equal(migrated?.note, 'keep');
});
