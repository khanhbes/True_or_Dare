import { INITIAL_CARDS } from '../src/data/cards';
import { DEFAULT_OUTFITS, createOutfitState, getRemovableGarments, removeGarment } from '../src/utils/wardrobe';
import { DEFAULT_PROGRESSION_CONFIG, selectJourneyCard } from '../src/utils/progression';
import { getCardClothingFamily } from '../src/utils/clothingJourney';

const sessions = Number(process.argv[2] ?? 10000);
const cards = INITIAL_CARDS.filter((card) => card.deck !== 'position');
let totalCards = 0; let totalClothing = 0; let bothSessions = 0; let extensions = 0;
for (let session = 0; session < sessions; session += 1) {
  let intimacy = 0; let used: string[] = []; let actor: 0 | 1 = 0; let hadBoth = false;
  let outfits = [createOutfitState(DEFAULT_OUTFITS[0]), createOutfitState(DEFAULT_OUTFITS[1])] as [ReturnType<typeof createOutfitState>, ReturnType<typeof createOutfitState>];
  const history: string[] = [];
  for (let turn = 0; turn < 80 && intimacy < 100; turn += 1) {
    const result = selectJourneyCard({ cards, actorIndex: actor, outfits, usedCardIds: used, levels: ['gentle', 'intimate', 'passionate'], intimacyPercent: intimacy, config: DEFAULT_PROGRESSION_CONFIG, clothingHistory: history as never });
    if (!result.card) break;
    used = result.nextUsedCardIds; const card = result.card;
    intimacy = Math.min(100, intimacy + (card.progression?.intimacyGain ?? DEFAULT_PROGRESSION_CONFIG.starGains[card.progression?.difficultyStars ?? 1]));
    const family = getCardClothingFamily(card);
    if (family) {
      totalClothing += 1; history.push(family); const target = family === 'opponent' ? (actor === 0 ? 1 : 0) : actor;
      if (family === 'both') { hadBoth = true; for (const index of [0, 1] as const) { const slot = getRemovableGarments(outfits[index])[0]; if (slot) outfits[index] = removeGarment(outfits[index], slot); } }
      else { const slot = getRemovableGarments(outfits[target])[0]; if (slot) outfits[target] = removeGarment(outfits[target], slot); }
    }
    actor = actor === 0 ? 1 : 0;
  }
  totalCards += used.length; if (hadBoth) bothSessions += 1; if (intimacy >= 100 && outfits.some((outfit) => getRemovableGarments(outfit).length > 0)) extensions += 1;
}
console.log(JSON.stringify({ sessions, averageCards: totalCards / sessions, averageClothingCards: totalClothing / sessions, bothEventRate: bothSessions / sessions, extensionRate: extensions / sessions }, null, 2));
