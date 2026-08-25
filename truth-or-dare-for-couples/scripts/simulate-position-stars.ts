import { INITIAL_CARDS } from '../src/data/cards';
import { DEFAULT_OUTFITS, createOutfitState } from '../src/utils/wardrobe';
import { DEFAULT_LUXURY_PROGRESSION_CONFIG, derivePositionDifficultyStars, selectLuxuryPositionCard } from '../src/utils/progression';

const runsArgument = process.argv.find((argument) => argument.startsWith('--runs='))?.split('=')[1];
const runs = Math.max(1, Number(runsArgument ?? 10000) || 10000);
const cards = INITIAL_CARDS.filter((card) => card.deck === 'position' && card.position?.family !== 'have_sex');
const outfits = [
  createOutfitState({ ...DEFAULT_OUTFITS[0], garments: {} }),
  createOutfitState({ ...DEFAULT_OUTFITS[1], garments: {} }),
] as const;
const counts = new Map<number, number>([6, 7, 8, 9, 10].map((star) => [star, 0]));

for (let run = 0; run < runs; run += 1) {
  const result = selectLuxuryPositionCard({
    cards,
    actorIndex: (run % 2) as 0 | 1,
    outfits,
    usedCardIds: [],
    luxuryPercent: [10, 30, 50, 70, 90][run % 5],
    config: DEFAULT_LUXURY_PROGRESSION_CONFIG,
  });
  if (result.card) {
    const star = derivePositionDifficultyStars(result.card);
    counts.set(star, (counts.get(star) ?? 0) + 1);
  }
}

console.log(JSON.stringify({ runs, candidates: cards.length, counts: Object.fromEntries(counts) }, null, 2));
