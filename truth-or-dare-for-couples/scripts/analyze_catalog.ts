import { readFile } from 'node:fs/promises';
import { deriveDifficultyStars, derivePositionDifficultyStars, getCardDeck, getCardTurnAudience } from '../src/utils/progression';
import type { CardItem } from '../src/types';

async function main() {
  const catalog = JSON.parse(await readFile('data/catalog/catalog.json', 'utf8')) as {
    visibleCardCount: number;
    cards: CardItem[];
  };
  const cards = catalog.cards;

  const summary = {
    total: cards.length,
    systemCards: cards.filter(c => !c.isCustom).length,
    customCards: cards.filter(c => c.isCustom).length,
    byDeck: { standard: 0, position: 0 } as Record<string, number>,
    standardByLevel: { gentle: 0, intimate: 0, passionate: 0 } as Record<string, number>,
    standardByType: { truth: 0, dare: 0 } as Record<string, number>,
    standardByStars: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 } as Record<string, number>,
    standardByAudience: { male: 0, female: 0, both: 0 } as Record<string, number>,
    standardByClothingEffect: {} as Record<string, number>,
    standardLevelTypeMatrix: {} as Record<string, Record<string, number>>,
    standardLevelStarMatrix: {} as Record<string, Record<string, number>>,
    positionByFamily: { oral: 0, blowjob: 0, handjob: 0, have_sex: 0, other: 0 } as Record<string, number>,
    positionByStars: { '6': 0, '7': 0, '8': 0, '9': 0, '10': 0 } as Record<string, number>,
    positionByAudience: { male: 0, female: 0, both: 0 } as Record<string, number>,
    positionByRarity: {} as Record<string, number>,
    positionFamilyStarMatrix: {} as Record<string, Record<string, number>>,
    cardsWithImages: cards.filter(c => Boolean(c.customImage || c.customImageId)).length,
    cardsWithTimers: cards.filter(c => Boolean(c.timerSeconds)).length,
  };

  for (const c of cards) {
    const deck = getCardDeck(c);
    summary.byDeck[deck] = (summary.byDeck[deck] || 0) + 1;

    if (deck === 'standard') {
      summary.standardByLevel[c.level] = (summary.standardByLevel[c.level] || 0) + 1;
      summary.standardByType[c.type] = (summary.standardByType[c.type] || 0) + 1;
      const stars = String(deriveDifficultyStars(c));
      summary.standardByStars[stars] = (summary.standardByStars[stars] || 0) + 1;
      const aud = getCardTurnAudience(c);
      summary.standardByAudience[aud] = (summary.standardByAudience[aud] || 0) + 1;
      const ce = c.clothingEffect ? (c.clothingEffect.kind === 'remove_garment' ? c.clothingEffect.target : c.clothingEffect.kind) : 'none';
      summary.standardByClothingEffect[ce] = (summary.standardByClothingEffect[ce] || 0) + 1;

      if (!summary.standardLevelTypeMatrix[c.level]) summary.standardLevelTypeMatrix[c.level] = { truth: 0, dare: 0 };
      summary.standardLevelTypeMatrix[c.level][c.type] = (summary.standardLevelTypeMatrix[c.level][c.type] || 0) + 1;

      if (!summary.standardLevelStarMatrix[c.level]) summary.standardLevelStarMatrix[c.level] = {};
      summary.standardLevelStarMatrix[c.level][stars] = (summary.standardLevelStarMatrix[c.level][stars] || 0) + 1;
    } else {
      const fam = c.position?.family || 'other';
      summary.positionByFamily[fam] = (summary.positionByFamily[fam] || 0) + 1;
      const pStars = String(derivePositionDifficultyStars(c));
      summary.positionByStars[pStars] = (summary.positionByStars[pStars] || 0) + 1;
      const pAud = getCardTurnAudience(c);
      summary.positionByAudience[pAud] = (summary.positionByAudience[pAud] || 0) + 1;
      const rarity = c.position?.rarity || 'standard';
      summary.positionByRarity[rarity] = (summary.positionByRarity[rarity] || 0) + 1;

      if (!summary.positionFamilyStarMatrix[fam]) summary.positionFamilyStarMatrix[fam] = {};
      summary.positionFamilyStarMatrix[fam][pStars] = (summary.positionFamilyStarMatrix[fam][pStars] || 0) + 1;
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch(console.error);
