import { readFile, writeFile } from 'node:fs/promises';

const catalogPath = new URL('../data/catalog/catalog.json', import.meta.url);
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));

const baseHeat = { gentle: 2, intimate: 5, passionate: 8 };
let changed = 0;

for (const card of catalog.cards ?? []) {
  const phaseTag = card.phaseTag ?? card.progression?.phaseTag ?? card.level;
  const heat = card.heat ?? card.progression?.heat
    ?? Math.min(10, (baseHeat[phaseTag] ?? 5) + (card.clothingEffect ? 1 : 0));
  if (card.phaseTag !== phaseTag || card.heat !== heat) {
    card.phaseTag = phaseTag;
    card.heat = heat;
    changed += 1;
  }
}

await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Card Director metadata: updated ${changed} cards.`);
