import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve('data/catalog');
const CATALOG_PATH = path.join(ROOT, 'catalog.json');
const SEED_PATH = path.join(ROOT, 'seed-bundle.json');
const MANIFEST_PATH = path.join(ROOT, 'manifest.json');

const POSITION_UPDATES = new Map(Object.entries({
  'pos-handjob-female': { turnAudience: 'both', difficultyStars: 1, family: 'other' },
  'custom-1787230294200': { turnAudience: 'both', difficultyStars: 2, family: 'handjob' },
  'pos-oral-male': { turnAudience: 'both', difficultyStars: 7, family: 'oral' },
  'pos-close-embrace-2': { turnAudience: 'both', difficultyStars: 8, family: 'oral' },
  'pos-connection-1': { turnAudience: 'both', difficultyStars: 9, family: 'oral' },
  'pos-oral-female': { turnAudience: 'male', difficultyStars: 3, family: 'oral' },
  'pos-guided-touch-4': { turnAudience: 'male', difficultyStars: 4, family: 'oral' },
  'pos-blowjob-male': { turnAudience: 'male', difficultyStars: 4, family: 'other' },
  'pos-blowjob-female': { turnAudience: 'male', difficultyStars: 5, family: 'oral' },
  'custom-1787207987099': { turnAudience: 'male', difficultyStars: 5, family: 'oral' },
  'pos-blowjob-both': { turnAudience: 'male', difficultyStars: 6, family: 'oral' },
  'custom-1787214401588': { turnAudience: 'male', difficultyStars: 6, family: 'oral' },
  'custom-1787209509884': { turnAudience: 'female', difficultyStars: 3, family: 'blowjob' },
  'pos-oral-both': { turnAudience: 'female', difficultyStars: 4, family: 'handjob' },
  'custom-1787224227727': { turnAudience: 'female', difficultyStars: 4, family: 'handjob' },
  'custom-1787209236371': { turnAudience: 'female', difficultyStars: 5, family: 'handjob' },
  'custom-1787209789032': { turnAudience: 'female', difficultyStars: 5, family: 'handjob' },
  'custom-1787209029981': { turnAudience: 'female', difficultyStars: 5, family: 'blowjob' },
  'custom-1787209622650': { turnAudience: 'female', difficultyStars: 6, family: 'blowjob' },
  'pos-handjob-male': { turnAudience: 'female', difficultyStars: 6, family: 'other' },
  'pos-handjob-both': { turnAudience: 'female', difficultyStars: 7, family: 'handjob' },
  'custom-1787209997733': { turnAudience: 'female', difficultyStars: 7, family: 'blowjob' },
  'pos-massage-6': { turnAudience: 'female', difficultyStars: 8, family: 'blowjob' },
}));

const audience = (value) => value === 'male' || value === 'female' ? value : 'both';
const migrateCard = (card) => {
  const migrated = structuredClone(card);
  if (migrated.progression) {
    migrated.progression.turnAudience = audience(
      migrated.progression.turnAudience ?? migrated.progression.audience,
    );
    delete migrated.progression.audience;
  }
  if (migrated.position) {
    migrated.position.turnAudience = audience(
      migrated.position.turnAudience ?? migrated.position.recipient,
    );
    delete migrated.position.recipient;
    const update = POSITION_UPDATES.get(migrated.id);
    if (update) Object.assign(migrated.position, update);
  }
  if (migrated.id === 'g-d-14') {
    migrated.timerSeconds = null;
    migrated.gameplayEffect = { kind: 'pass_turn' };
  }
  if (migrated.position?.family === 'have_sex') {
    delete migrated.clothingEffect;
    delete migrated.gameplayEffect;
  }
  return migrated;
};

const collator = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' });
const levelOrder = { gentle: 0, intimate: 1, passionate: 2 };
const typeOrder = { truth: 0, dare: 1 };
const familyOrder = { oral: 0, blowjob: 1, handjob: 2, other: 3, have_sex: 4 };
const audienceOrder = { both: 0, male: 1, female: 2 };
const stars = (card) => card.position?.difficultyStars ?? card.progression?.difficultyStars ?? 1;
const turnAudience = (card) => card.position?.turnAudience ?? card.progression?.turnAudience ?? 'both';
const compareCards = (a, b) => {
  const aPosition = a.deck === 'position';
  const bPosition = b.deck === 'position';
  if (aPosition !== bPosition) return aPosition ? 1 : -1;
  const parts = aPosition
    ? [
        (a.position?.orderGroup ?? 1) - (b.position?.orderGroup ?? 1),
        stars(a) - stars(b),
        familyOrder[a.position?.family ?? 'other'] - familyOrder[b.position?.family ?? 'other'],
        audienceOrder[turnAudience(a)] - audienceOrder[turnAudience(b)],
      ]
    : [
        levelOrder[a.level] - levelOrder[b.level],
        stars(a) - stars(b),
        typeOrder[a.type] - typeOrder[b.type],
        audienceOrder[turnAudience(a)] - audienceOrder[turnAudience(b)],
      ];
  return parts.find((value) => value !== 0) ?? collator.compare(a.id, b.id);
};

const stringify = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const catalog = JSON.parse(await readFile(CATALOG_PATH, 'utf8'));
const seed = JSON.parse(await readFile(SEED_PATH, 'utf8'));
const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));

catalog.cards = catalog.cards.map(migrateCard).sort(compareCards);
seed.customCards = seed.customCards.map(migrateCard).sort(compareCards);
seed.editedCards = seed.editedCards.map(migrateCard).sort(compareCards);
seed.luxuryProgressionConfig = {
  ...seed.luxuryProgressionConfig,
  finalCardChance: seed.luxuryProgressionConfig?.finalCardChance ?? 5,
};
catalog.luxuryProgressionConfig = {
  ...catalog.luxuryProgressionConfig,
  finalCardChance: catalog.luxuryProgressionConfig?.finalCardChance ?? 5,
};

const catalogText = stringify(catalog);
const seedText = stringify(seed);
await writeFile(CATALOG_PATH, catalogText);
await writeFile(SEED_PATH, seedText);

manifest.datasetRevision = Math.max(2, manifest.datasetRevision ?? 0);
manifest.generatedAt = '2026-08-22T00:00:00.000Z';
manifest.checksums['catalog.json'] = sha256(catalogText);
manifest.checksums['seed-bundle.json'] = sha256(seedText);
await writeFile(MANIFEST_PATH, stringify(manifest));

console.log(`Migrated ${catalog.cards.length} cards; preserved ${seed.assets.length} assets.`);
