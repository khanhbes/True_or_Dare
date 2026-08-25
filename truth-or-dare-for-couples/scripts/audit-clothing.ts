import { INITIAL_CARDS } from '../src/data/cards';
import { CardItem, ClothingIntensity } from '../src/types';
import { getCardClothingFamily, getCardClothingIntensity, getClothingFamilyCounts } from '../src/utils/clothingJourney';
import { deriveDifficultyStars } from '../src/utils/progression';

const standard = INITIAL_CARDS.filter((card) => card.deck !== 'position');
const count = (values: readonly string[]) => Object.fromEntries([...new Set(values)].map((value) => [value, values.filter((item) => item === value).length]));
const clothing = standard.filter((card) => Boolean(card.clothingEffect));
const report = {
  overview: { total: standard.length, truth: standard.filter((card) => card.type === 'truth').length, dare: standard.filter((card) => card.type === 'dare').length, gentle: standard.filter((card) => card.level === 'gentle').length, intimate: standard.filter((card) => card.level === 'intimate').length, passionate: standard.filter((card) => card.level === 'passionate').length },
  difficulty: count(standard.map((card) => String(deriveDifficultyStars(card)))),
  audience: count(standard.map((card) => card.progression?.turnAudience ?? card.progression?.audience ?? 'both')),
  clothing: { related: clothing.length, changing: clothing.length, normal: standard.length - clothing.length },
  family: getClothingFamilyCounts(standard),
  intensity: count(clothing.map((card) => getCardClothingIntensity(card) ?? 'none') as ClothingIntensity[]),
  target: count(clothing.map((card) => card.clothingEffect?.kind === 'swap_garments' ? 'special' : card.clothingEffect?.target ?? 'none')),
  cards: clothing.map((card: CardItem) => ({ id: card.id, family: getCardClothingFamily(card), intensity: getCardClothingIntensity(card), level: card.level, stars: deriveDifficultyStars(card) })),
};
console.log(JSON.stringify(report, null, 2));
