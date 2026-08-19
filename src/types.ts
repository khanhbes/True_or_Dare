export type CardLevel = 'gentle' | 'intimate' | 'passionate';
export type CardType = 'truth' | 'dare';
export type PlayerIndex = 0 | 1;
export type CardDeck = 'standard' | 'position';
export type DifficultyStars = 1 | 2 | 3 | 4 | 5;
export type CardAudience = 'male' | 'female' | 'both';
export type PositionFamily = 'oral' | 'blowjob' | 'handjob' | 'have_sex';
export type PositionRecipient = 'male' | 'female' | 'both';
export type PositionRarity = 'luxury' | 'mythic';

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

export interface CardProgressionMetadata {
  difficultyStars: DifficultyStars;
  /** Standard-card eligibility for the player whose turn it is. */
  audience: CardAudience;
  /** Overrides the global gain for this star rating when supplied. */
  intimacyGain?: number;
  actorStages?: OutfitStage[];
  partnerStages?: OutfitStage[];
}

export interface PositionMetadata {
  family: PositionFamily;
  recipient: PositionRecipient;
  /** Oral=1, blowjob=2, handjob=3, final rare card=4. */
  orderGroup: 1 | 2 | 3 | 4;
  rarity: PositionRarity;
}

export interface ProgressionBand {
  minPercent: number;
  maxPercent: number;
  typeWeights: Record<CardType, number>;
  starWeights: Record<DifficultyStars, number>;
}

export interface ProgressionConfig {
  bands: ProgressionBand[];
  starGains: Record<DifficultyStars, number>;
  cardRemovalBonus: number;
}

export type JourneyPhase = 'standard' | 'position_consent' | 'position' | 'final';

export interface IntimacyEvent {
  cardId: string;
  amount: number;
  source: 'completed_card' | 'card_clothing_removal';
  round: number;
  timestamp: number;
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
  /**
   * Optional per-card countdown for dares.
   * `undefined` inherits built-in metadata during edit merging, while `null`
   * records that a developer explicitly disabled the timer for this card.
   */
  timerSeconds?: number | null;
  isCustom?: boolean;
  icon?: string; // SVG icon name for card illustration
  customImage?: string; // Base64 data URL for custom uploaded icon
  /** Marks a deliberate illustration override on an edited built-in card. */
  illustrationOverride?: boolean;
  clothingEffect?: ClothingEffect | null;
  /** Missing means a legacy/custom standard card. */
  deck?: CardDeck;
  progression?: CardProgressionMetadata | null;
  position?: PositionMetadata | null;
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
