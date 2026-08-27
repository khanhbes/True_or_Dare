import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { compareCollectionCards } from '../src/utils/cardOrdering';
import type { CardItem, PositionDifficultyStars } from '../src/types';

const sha256 = (value: Uint8Array | string): string =>
  createHash('sha256').update(value).digest('hex');

// Target Star Distribution Mapping for all 52 Position cards
const POSITION_STARS_MAP: Record<string, PositionDifficultyStars> = {
  // Group 1: Oral Sex (3 cards)
  'pos-oral-male': 6,          // Tư thế Idyll
  'pos-close-embrace-2': 7,    // Tư thế Speaker
  'pos-connection-1': 8,       // Tư thế Shinning

  // Group 2: Blowjob (13 cards)
  'custom-1787214401588': 6,   // Tư thế Eraser
  'custom-1787209236371': 6,   // Tư thế Whisper
  'custom-1787495167421': 7,   // Tư thế Standing Service For Women
  'custom-1787209029981': 7,   // Tư thế Zeus
  'custom-1787209509884': 7,   // Tư thế dier
  'pos-blowjob-female': 7,     // Tư thế Hunger
  'pos-guided-touch-4': 8,     // Tư thế Inquisitor
  'pos-blowjob-male': 8,       // Tư thế Forbidden Fruit
  'custom-1787209622650': 8,   // Tư thế Anaconda
  'custom-1787209789032': 8,   // Tư thế Special fellatio
  'custom-1787207987099': 9,   // Tư thế Emmanuel (ngồi lên cổ)
  'pos-blowjob-both': 9,       // Tư thế Superhero (hông lên vai)
  'custom-1787209997733': 9,   // Tư thế Jackhammer (blow + vuốt)

  // Group 3: Handjob / Fingering (15 cards)
  'custom-1787224227727': 6,   // Tư thế Standard
  'custom-1787230294200': 6,   // Tư thế The Cradle
  'pos-handjob-female': 6,     // Tư thế The Rear View
  'pos-oral-both': 6,          // Tư thế The Little Spoon
  'custom-1787314490090': 6,   // Nữ thuram cobe 20s
  'custom-1787314967179': 6,   // Nam thuram caube 20s
  'custom-1787312370490': 7,   // Fingering a woman
  'custom-1787312516275': 7,   // Slightly Different (fingering sau)
  'pos-oral-female': 7,        // Close together (dựa tường)
  'custom-1787314203994': 7,   // Quỳ đối mặt vuốt nhau
  'custom-1787314373222': 7,   // Nằm cạnh nhau vuốt nhau
  'pos-handjob-male': 8,       // The Tittyfuck
  'pos-massage-6': 8,          // London Bridge
  'pos-handjob-both': 8,       // Milking The Bull
  'custom-1787315131793': 8,   // Ngồi đối diện thuram 30s

  // Group 4: Have Sex (21 cards)
  'custom-1787214696681': 7,   // Missionary (Truyền thống)
  'custom-1787214958700': 7,   // Spoon (Úp thìa)
  'custom-1787201733227': 7,   // Mature Lady (Chống bàn)
  'custom-1787213753008': 7,   // Oath (Quỳ ôm sau)
  'custom-1787202068222': 8,   // Lotus Flower (Hoa sen)
  'custom-1787214101711': 8,   // Doggy
  'custom-1787201616676': 8,   // Tight Squeeze
  'custom-1787202632802': 8,   // Unicorn
  'custom-1787213327120': 8,   // Spork
  'custom-1787215106989': 8,   // Candle (Đứng bên vai)
  'custom-1787201390554': 9,   // Princess (Cưỡi ngựa)
  'custom-1787202727381': 9,   // Prison Guard (Đứng giữ tay)
  'custom-1787202937544': 9,   // Captain (Nâng 2 chân)
  'custom-1787202487780': 9,   // Downward Dog
  'custom-1787203074760': 9,   // T Square
  'custom-1787200034578': 9,   // Merger (Ngồi ôm sát)
  'custom-1787197977369': 10,  // Erotic Poster (Ghế xoay)
  'custom-1787200408561': 10,  // Launch Pad (Nắm mắt cá chân)
  'custom-1787200722253': 10,  // Shameless (Chân vào nách)
  'custom-1787201237223': 10,  // Doggy in the Edge (Mép giường)
  'pos-have-sex': 10,          // Gimlet (Khoanh gối sofa)
};

async function rebalance() {
  const root = path.resolve('data/catalog');
  const catalogPath = path.join(root, 'catalog.json');
  const seedPath = path.join(root, 'seed-bundle.json');
  const manifestPath = path.join(root, 'manifest.json');

  const catalog = JSON.parse(await readFile(catalogPath, 'utf8')) as {
    schemaVersion: number;
    sourceCreatedAt: string;
    sourceDatasetRevision: number;
    systemCardCount: number;
    visibleCardCount: number;
    cards: CardItem[];
  };

  const seed = JSON.parse(await readFile(seedPath, 'utf8')) as {
    schemaVersion: number;
    createdAt: string;
    sourceOrigin: string;
    customCards: CardItem[];
    editedCards: CardItem[];
    deletedSystemCardIds: string[];
    progressionConfig: unknown;
    luxuryProgressionConfig: unknown;
    assets: unknown[];
  };

  const updateCardStars = (card: CardItem) => {
    if (POSITION_STARS_MAP[card.id] !== undefined) {
      const newStars = POSITION_STARS_MAP[card.id];
      if (card.position) {
        card.position.difficultyStars = newStars;
      }
    }
  };

  // Update catalog cards
  catalog.cards.forEach(updateCardStars);
  catalog.cards.sort(compareCollectionCards);

  // Update seed bundle cards
  seed.customCards.forEach(updateCardStars);
  seed.customCards.sort(compareCollectionCards);
  seed.editedCards.forEach(updateCardStars);
  seed.editedCards.sort(compareCollectionCards);

  // Write catalog.json & seed-bundle.json
  const catalogBytes = Buffer.from(JSON.stringify(catalog, null, 2));
  const seedBytes = Buffer.from(JSON.stringify(seed, null, 2));
  await writeFile(catalogPath, catalogBytes);
  await writeFile(seedPath, seedBytes);

  // Update manifest checksums
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
    format: string;
    version: number;
    generatedAt: string;
    sourceOrigin: string;
    datasetRevision: number;
    counts: Record<string, number>;
    checksums: Record<string, string>;
  };
  manifest.checksums['catalog.json'] = sha256(catalogBytes);
  manifest.checksums['seed-bundle.json'] = sha256(seedBytes);
  manifest.generatedAt = new Date().toISOString();
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  console.log('Successfully rebalanced 52 position cards:');
  const counts: Record<number, number> = { 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
  for (const c of catalog.cards.filter(c => c.deck === 'position' || c.position)) {
    const s = c.position?.difficultyStars ?? 6;
    counts[s] = (counts[s] || 0) + 1;
  }
  console.log(JSON.stringify(counts, null, 2));
}

rebalance().catch(console.error);
