import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { migratePositionCards } from '../src/utils/positionStarMigration';
import type { CardItem } from '../src/types';

const root = path.resolve(import.meta.dirname, '..');
const source = JSON.parse(await readFile(path.join(root, 'data/catalog/seed-bundle.json'), 'utf8')) as { cards?: CardItem[] };
const cards = source.cards ?? [];
const positions = cards.filter((card) => card.deck === 'position');
const migrated = migratePositionCards(positions);
const legacy = positions.filter((card) => (card.position?.difficultyStars ?? 0) < 6);
const invalid = migrated.filter((card) => !card.position?.difficultyStars || card.position.difficultyStars < 6 || card.position.difficultyStars > 10);

console.log(JSON.stringify({
  totalCards: cards.length,
  positionCards: positions.length,
  legacyBeforeMigration: legacy.length,
  invalidAfterMigration: invalid.length,
  starsAfterMigration: Object.fromEntries([6, 7, 8, 9, 10].map((star) => [star, migrated.filter((card) => card.position?.difficultyStars === star).length])),
}, null, 2));

if (invalid.length > 0) process.exitCode = 1;
