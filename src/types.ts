export type CardLevel = 'gentle' | 'intimate' | 'passionate';
export type CardType = 'truth' | 'dare';
export type PlayerIndex = 0 | 1;

export type PlayerPresentation = 'male' | 'female';
export type GarmentSlot = 'shirt' | 'pants' | 'bra' | 'underwear';
export type OutfitStage = 'dressed' | 'underwear_only' | 'empty';

export interface GarmentConfig {
  styleId: string;
  color: string;
}

export interface OutfitConfig {
  presentation: PlayerPresentation;
  garments: Partial<Record<GarmentSlot, GarmentConfig>>;
}

export interface OutfitState {
  initial: OutfitConfig;
  remainingSlots: GarmentSlot[];
}

export interface ClothingEffect {
  kind: 'remove_garment';
  target: 'self' | 'opponent';
}

export type ClothingRemovalSource = 'card' | 'penalty';

export interface ClothingRemovalEvent {
  actorPlayerIndex: PlayerIndex;
  targetPlayerIndex: PlayerIndex;
  garmentSlot: GarmentSlot;
  garment: GarmentConfig;
  source: ClothingRemovalSource;
  cardId?: string;
  round: number;
  timestamp: number;
}

export interface CardItem {
  id: string;
  type: CardType;
  level: CardLevel;
  content: string;
  hint?: string;
  timerSeconds?: number; // Optional timer for dares
  isCustom?: boolean;
  icon?: string; // SVG icon name for card illustration
  customImage?: string; // Base64 data URL for custom uploaded icon
  clothingEffect?: ClothingEffect | null;
}

export interface Player {
  name: string;
  avatar: string; // Emoji or icon key
  color: string;
  completedCount: number;
  skippedCount: number;
}

export interface GameSettings {
  levels: CardLevel[];
  roundsMode: 'unlimited' | 'target';
  targetRounds: number;
  privacyDefault: boolean; // Hide content until click
  enableTimer: boolean;
  timerDuration: number; // in seconds
  drawMode: 'random' | 'choose'; // Allow player to pick Truth or Dare first or complete random
  outfits: [OutfitConfig, OutfitConfig];
  penaltyClothingEnabled: boolean;
}

export interface GameState {
  screen: 'intro' | 'setup' | 'game' | 'collection' | 'summary';
  player1: Player;
  player2: Player;
  currentPlayerIndex: 0 | 1;
  currentRound: number;
  selectedCard: CardItem | null;
  cardState: 'deck' | 'shuffling' | 'drawn_hidden' | 'drawn_revealed' | 'completed';
  drawnCardTypeChoice: CardType | null;
  history: {
    card: CardItem;
    player: string;
    action: 'completed' | 'skipped';
    timestamp: number;
  }[];
  favorites: string[]; // card IDs
}
