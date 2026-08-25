import { INITIAL_CARDS } from '../src/data/cards';
import { createCardDirectorState, getCardHeat, recordDirectedCard } from '../src/utils/cardDirector';
import { advanceClothingTurn, createClothingJourney, getActiveOpportunity, getCardClothingFamily, normalizedWardrobeProgress, resolveClothingOpportunity } from '../src/utils/clothingJourney';
import { DEFAULT_PROGRESSION_CONFIG, selectJourneyCard } from '../src/utils/progression';
import { DEFAULT_OUTFITS, createOutfitState, getRemovableGarments, removeGarment } from '../src/utils/wardrobe';

const requestedRuns = process.argv.find((argument) => argument.startsWith('--runs='))?.split('=')[1] ?? process.argv[2];
const sessions = Math.max(1, Number(requestedRuns ?? 10_000) || 10_000);
const cards = INITIAL_CARDS.filter((card) => card.deck !== 'position');
let totalCards = 0; let totalClothing = 0; let bothSessions = 0; let extensions = 0; let earlyHotPairs = 0; let maxWardrobeGap = 0;
const heatTotal = Array.from({ length: 24 }, () => 0); const heatSamples = Array.from({ length: 24 }, () => 0);

for (let session = 0; session < sessions; session += 1) {
  let intimacy = 0; let draws = 0; let used: string[] = []; let actor: 0 | 1 = 0; let hadBoth = false;
  let director = createCardDirectorState(); const heatHistory: number[] = [];
  let clothingJourney = createClothingJourney();
  const outfits = [createOutfitState(DEFAULT_OUTFITS[0]), createOutfitState(DEFAULT_OUTFITS[1])] as [ReturnType<typeof createOutfitState>, ReturnType<typeof createOutfitState>];
  const clothingHistory: string[] = [];
  for (let turn = 0; turn < 80 && intimacy < 100; turn += 1) {
    const opportunity = getActiveOpportunity(clothingJourney, intimacy);
    const result = selectJourneyCard({ cards, actorIndex: actor, outfits, usedCardIds: used, levels: ['gentle', 'intimate', 'passionate'], intimacyPercent: intimacy, config: DEFAULT_PROGRESSION_CONFIG, clothingHistory: clothingHistory as never, preferredClothingFamily: opportunity?.eventType === 'catch_up' ? 'opponent' : opportunity?.eventType ?? null, firstRemoval: clothingJourney.firstRemoval, directorState: director });
    if (!result.card) break;
    const card = result.card; used = result.nextUsedCardIds; director = recordDirectedCard(director, card, true); draws += 1;
    const heat = getCardHeat(card); heatHistory.push(heat);
    if (turn < heatTotal.length) { heatTotal[turn] += heat; heatSamples[turn] += 1; }
    intimacy = Math.min(100, intimacy + (card.progression?.intimacyGain ?? DEFAULT_PROGRESSION_CONFIG.starGains[card.progression?.difficultyStars ?? 1]));
    const family = getCardClothingFamily(card);
    if (family) {
      totalClothing += 1; clothingHistory.push(family); const target = family === 'opponent' ? (actor === 0 ? 1 : 0) : actor;
      if (family === 'both') { hadBoth = true; for (const index of [0, 1] as const) { const slot = getRemovableGarments(outfits[index])[0]; if (slot) outfits[index] = removeGarment(outfits[index], slot); } }
      else { const slot = getRemovableGarments(outfits[target])[0]; if (slot) outfits[target] = removeGarment(outfits[target], slot); }
      if (opportunity) clothingJourney = resolveClothingOpportunity(clothingJourney, opportunity.index, 'completed', family, target);
    }
    maxWardrobeGap = Math.max(maxWardrobeGap, Math.abs(normalizedWardrobeProgress(outfits[0]) - normalizedWardrobeProgress(outfits[1])));
    clothingJourney = advanceClothingTurn(clothingJourney); actor = actor === 0 ? 1 : 0;
  }
  totalCards += draws; if (hadBoth) bothSessions += 1;
  if (heatHistory.slice(0, 8).some((heat, index) => heat >= 7 && heatHistory[index + 1] >= 7)) earlyHotPairs += 1;
  if (intimacy >= 100 && outfits.some((outfit) => getRemovableGarments(outfit).length > 0)) extensions += 1;
}

console.log(JSON.stringify({ sessions, averageCards: totalCards / sessions, averageClothingCards: totalClothing / sessions, bothEventRate: bothSessions / sessions, extensionRate: extensions / sessions, earlyHotPairRate: earlyHotPairs / sessions, maxWardrobeGap, averageHeatByTurn: heatTotal.map((total, index) => heatSamples[index] ? Number((total / heatSamples[index]).toFixed(2)) : null) }, null, 2));
