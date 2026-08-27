import { readFile, writeFile } from 'node:fs/promises';
import { derivePositionDifficultyStars, getCardDeck, getCardTurnAudience } from '../src/utils/progression';
import type { CardItem } from '../src/types';

async function main() {
  const catalog = JSON.parse(await readFile('data/catalog/catalog.json', 'utf8')) as {
    cards: CardItem[];
  };
  const positions = catalog.cards.filter(c => getCardDeck(c) === 'position');

  const list = positions.map((c, i) => {
    const stars = derivePositionDifficultyStars(c);
    const fam = c.position?.family;
    const rec = getCardTurnAudience(c);
    const hint = c.hint || '';
    const group = c.position?.orderGroup;
    return {
      index: i + 1,
      id: c.id,
      hint,
      content: c.content,
      family: fam,
      recipient: rec,
      orderGroup: group,
      rarity: c.position?.rarity,
      currentStars: stars,
    };
  });

  await writeFile('scripts/positions_detail.json', JSON.stringify(list, null, 2));
  console.log(`Saved ${list.length} positions to scripts/positions_detail.json`);
}

main().catch(console.error);
