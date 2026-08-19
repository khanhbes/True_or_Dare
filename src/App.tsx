import React, { useState, useEffect, useLayoutEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { ParticleBackground } from './components/ParticleBackground';
import { IntroScreen } from './components/IntroScreen';
import { SetupScreen } from './components/SetupScreen';
import { GameTable } from './components/GameTable';
import { CardCollection } from './components/CardCollection';
import { SummaryModal } from './components/SummaryModal';
import { RulesModal } from './components/RulesModal';
import {
  CardItem,
  ClothingRemovalEvent,
  GameSettings,
  IntimacyEvent,
  JourneyPhase,
  OutfitState,
  Player,
  ProgressionConfig,
} from './types';
import { INITIAL_CARDS } from './data/cards';
import { mergeEditedSystemCard } from './utils/cardSelection';
import { createOutfitState, hydrateGameSettings } from './utils/wardrobe';
import { getCardDeck, hydrateProgressionConfig } from './utils/progression';

const STORAGE_KEYS = {
  CUSTOM_CARDS: 'tod_couples_custom_cards',
  EDITED_CARDS: 'tod_couples_edited_cards',
  FAVORITES: 'tod_couples_favorites',
  SETTINGS: 'tod_couples_settings',
  PLAYER1: 'tod_couples_player1',
  PLAYER2: 'tod_couples_player2',
  APP_MODE: 'tod_couples_app_mode',
  UNLOCKED_CARDS: 'tod_couples_unlocked_cards',
  DELETED_SYSTEM_CARDS: 'tod_couples_deleted_system_cards',
  PROGRESSION_CONFIG: 'tod_couples_progression_config',
};

type AppMode = 'player' | 'developer';

const loadStoredAppMode = (): AppMode => {
  try {
    return localStorage.getItem(STORAGE_KEYS.APP_MODE) === 'developer' ? 'developer' : 'player';
  } catch {
    return 'player';
  }
};

const CARD_LEVELS = new Set(['gentle', 'intimate', 'passionate']);
const CARD_TYPES = new Set(['truth', 'dare']);
const CARD_DECKS = new Set(['standard', 'position']);
const CARD_AUDIENCES = new Set(['male', 'female', 'both']);
const POSITION_FAMILIES = new Set(['oral', 'blowjob', 'handjob', 'have_sex']);
const POSITION_RECIPIENTS = new Set(['male', 'female', 'both']);
const OUTFIT_STAGES = new Set(['dressed', 'underwear_only', 'empty']);
const MAX_CARD_TIMER_SECONDS = 3600;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isOptionalString = (value: unknown): boolean =>
  value === undefined || typeof value === 'string';

const isStoredCard = (value: unknown): value is CardItem => {
  if (!isRecord(value)) return false;

  const effect = value.clothingEffect;
  const hasValidEffect =
    effect === undefined ||
    effect === null ||
    (isRecord(effect) &&
      effect.kind === 'remove_garment' &&
      (effect.target === 'self' || effect.target === 'opponent'));
  const hasValidTimer =
    value.timerSeconds === undefined ||
    value.timerSeconds === null ||
    (typeof value.timerSeconds === 'number' &&
      Number.isFinite(value.timerSeconds));
  const progression = value.progression;
  const validStages = (stages: unknown) =>
    stages === undefined ||
    (Array.isArray(stages) && stages.every((stage) => typeof stage === 'string' && OUTFIT_STAGES.has(stage)));
  const hasValidProgression =
    progression === undefined ||
    progression === null ||
    (isRecord(progression) &&
      typeof progression.difficultyStars === 'number' &&
      Number.isInteger(progression.difficultyStars) &&
      progression.difficultyStars >= 1 &&
      progression.difficultyStars <= 5 &&
      typeof progression.audience === 'string' &&
      CARD_AUDIENCES.has(progression.audience) &&
      (progression.intimacyGain === undefined ||
        (typeof progression.intimacyGain === 'number' &&
          Number.isFinite(progression.intimacyGain) &&
          progression.intimacyGain >= 0 &&
          progression.intimacyGain <= 100)) &&
      validStages(progression.actorStages) &&
      validStages(progression.partnerStages));
  const position = value.position;
  const hasValidPosition =
    position === undefined ||
    position === null ||
    (isRecord(position) &&
      typeof position.family === 'string' && POSITION_FAMILIES.has(position.family) &&
      typeof position.recipient === 'string' && POSITION_RECIPIENTS.has(position.recipient) &&
      typeof position.orderGroup === 'number' && [1, 2, 3, 4].includes(position.orderGroup) &&
      (position.rarity === 'luxury' || position.rarity === 'mythic'));

  return (
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    typeof value.type === 'string' &&
    CARD_TYPES.has(value.type) &&
    typeof value.level === 'string' &&
    CARD_LEVELS.has(value.level) &&
    typeof value.content === 'string' &&
    isOptionalString(value.hint) &&
    hasValidTimer &&
    (value.deck === undefined || (typeof value.deck === 'string' && CARD_DECKS.has(value.deck))) &&
    hasValidProgression &&
    hasValidPosition &&
    (value.isCustom === undefined || typeof value.isCustom === 'boolean') &&
    isOptionalString(value.icon) &&
    isOptionalString(value.customImage) &&
    (value.illustrationOverride === undefined || typeof value.illustrationOverride === 'boolean') &&
    hasValidEffect
  );
};

const loadStoredArray = <T,>(
  key: string,
  isValid: (value: unknown) => value is T,
): T[] => {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.filter(isValid) : [];
  } catch {
    return [];
  }
};

const loadStoredCards = (key: string): CardItem[] => {
  const seenIds = new Set<string>();
  return loadStoredArray(key, isStoredCard).map((card) => {
    const normalizedCard = { ...card };
    if (typeof normalizedCard.timerSeconds === 'number') {
      if (normalizedCard.timerSeconds <= 0) {
        // Older editor versions could store zero. Preserve its intended
        // "disabled" meaning with the explicit sentinel used by system edits.
        normalizedCard.timerSeconds = null;
      } else if (
        !Number.isInteger(normalizedCard.timerSeconds) ||
        normalizedCard.timerSeconds > MAX_CARD_TIMER_SECONDS
      ) {
        // Keep the card instead of dropping user content because one legacy
        // timer field was malformed. An absent value simply means no timer.
        delete normalizedCard.timerSeconds;
      }
    }
    return normalizedCard;
  }).filter((card) => {
    if (seenIds.has(card.id)) return false;
    seenIds.add(card.id);
    return true;
  });
};

const loadStoredStringArray = (key: string): string[] => Array.from(new Set(
  loadStoredArray(
    key,
    (value): value is string => typeof value === 'string' && value.trim().length > 0,
  ),
));

export default function App() {
  const [screen, setScreen] = useState<'intro' | 'setup' | 'game' | 'collection'>('intro');
  const [collectionReturnScreen, setCollectionReturnScreen] = useState<'intro' | 'game'>('intro');
  const [showSummary, setShowSummary] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [appMode, setAppMode] = useState<AppMode>(loadStoredAppMode);

  // Every view is a full-page destination. Reset the document scroll before
  // paint so entering the game from the bottom of Setup never clips its header.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  // Load custom cards from localStorage
  const [customCards, setCustomCards] = useState<CardItem[]>(() =>
    loadStoredCards(STORAGE_KEYS.CUSTOM_CARDS)
  );

  const [editedCards, setEditedCards] = useState<CardItem[]>(() =>
    loadStoredCards(STORAGE_KEYS.EDITED_CARDS)
  );

  // Load favorited card IDs
  const [favorites, setFavorites] = useState<string[]>(() =>
    loadStoredStringArray(STORAGE_KEYS.FAVORITES)
  );
  const [unlockedCardIds, setUnlockedCardIds] = useState<string[]>(() =>
    loadStoredStringArray(STORAGE_KEYS.UNLOCKED_CARDS)
  );
  const [deletedSystemCardIds, setDeletedSystemCardIds] = useState<string[]>(() =>
    loadStoredStringArray(STORAGE_KEYS.DELETED_SYSTEM_CARDS)
  );

  // Players
  const [player1, setPlayer1] = useState<Player>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PLAYER1);
      return saved
        ? JSON.parse(saved)
        : { name: 'Anh', avatar: '👨‍💼', color: '#FF6B9D', completedCount: 0, skippedCount: 0 };
    } catch {
      return { name: 'Anh', avatar: '👨‍💼', color: '#FF6B9D', completedCount: 0, skippedCount: 0 };
    }
  });

  const [player2, setPlayer2] = useState<Player>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PLAYER2);
      return saved
        ? JSON.parse(saved)
        : { name: 'Em', avatar: '👩‍💼', color: '#D4AF37', completedCount: 0, skippedCount: 0 };
    } catch {
      return { name: 'Em', avatar: '👩‍💼', color: '#D4AF37', completedCount: 0, skippedCount: 0 };
    }
  });

  // Settings
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return hydrateGameSettings(saved ? JSON.parse(saved) : null);
    } catch {
      return hydrateGameSettings(null);
    }
  });
  const [progressionConfig, setProgressionConfig] = useState<ProgressionConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROGRESSION_CONFIG);
      return hydrateProgressionConfig(saved ? JSON.parse(saved) : null);
    } catch {
      return hydrateProgressionConfig(null);
    }
  });

  // Current turn state
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<0 | 1>(0);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [outfitStates, setOutfitStates] = useState<[OutfitState, OutfitState]>(() => [
    createOutfitState(settings.outfits[0]),
    createOutfitState(settings.outfits[1]),
  ]);
  const [clothingRemovalEvents, setClothingRemovalEvents] = useState<ClothingRemovalEvent[]>([]);
  const [intimacyPercent, setIntimacyPercent] = useState(0);
  const [intimacyEvents, setIntimacyEvents] = useState<IntimacyEvent[]>([]);
  const [journeyPhase, setJourneyPhase] = useState<JourneyPhase>('standard');
  const [sessionPositionCardIds, setSessionPositionCardIds] = useState<string[]>([]);

  // Combine built-in cards + custom cards
  const editedCardMap = new Map<string, CardItem>(
    editedCards.map((card) => [card.id, card] as const),
  );
  const allCards = [
    ...INITIAL_CARDS
      .filter((card) => !deletedSystemCardIds.includes(card.id))
      .map((card) => mergeEditedSystemCard(card, editedCardMap.get(card.id))),
    ...customCards,
  ];

  // Filter available cards by active levels selected in settings
  const availableCards = allCards.filter(
    (card) => getCardDeck(card) === 'position' || settings.levels.includes(card.level),
  );

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_CARDS, JSON.stringify(customCards));
    } catch {}
  }, [customCards]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.EDITED_CARDS, JSON.stringify(editedCards));
    } catch {}
  }, [editedCards]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    } catch {}
  }, [favorites]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.APP_MODE, appMode);
    } catch {}
  }, [appMode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.UNLOCKED_CARDS, JSON.stringify(unlockedCardIds));
    } catch {}
  }, [unlockedCardIds]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DELETED_SYSTEM_CARDS, JSON.stringify(deletedSystemCardIds));
    } catch {}
  }, [deletedSystemCardIds]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PLAYER1, JSON.stringify(player1));
      localStorage.setItem(STORAGE_KEYS.PLAYER2, JSON.stringify(player2));
    } catch {}
  }, [player1, player2]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROGRESSION_CONFIG, JSON.stringify(progressionConfig));
    } catch {}
  }, [progressionConfig]);

  // Favorite toggle
  const handleToggleFavorite = (cardId: string) => {
    setFavorites((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

  // Add custom card
  const handleAddCustomCard = (newCard: CardItem) => {
    setCustomCards((prev) => [newCard, ...prev]);
  };

  const handleUnlockCard = (cardId: string) => {
    setUnlockedCardIds((current) => current.includes(cardId) ? current : [...current, cardId]);
  };

  const handleDeleteCard = (card: CardItem) => {
    if (card.position?.family === 'have_sex') return;
    const cardId = card.id;
    if (card.isCustom) {
      setCustomCards((current) => current.filter((item) => item.id !== cardId));
    } else {
      setDeletedSystemCardIds((current) => current.includes(cardId) ? current : [...current, cardId]);
      setEditedCards((current) => current.filter((item) => item.id !== cardId));
    }
    setFavorites((current) => current.filter((id) => id !== cardId));
    setUnlockedCardIds((current) => current.filter((id) => id !== cardId));
  };

  const openCollection = (returnScreen: 'intro' | 'game') => {
    setCollectionReturnScreen(returnScreen);
    setScreen('collection');
  };

  const handleUpdateCard = (
    updatedCard: CardItem,
    {
      clothingEffectTouched,
      illustrationTouched,
      timerTouched,
      progressionTouched,
      positionTouched,
    }: {
      clothingEffectTouched: boolean;
      illustrationTouched: boolean;
      timerTouched: boolean;
      progressionTouched: boolean;
      positionTouched: boolean;
    },
  ) => {
    if (updatedCard.isCustom) {
      setCustomCards((prev) => prev.map((card) => card.id === updatedCard.id ? updatedCard : card));
      return;
    }
    setEditedCards((prev) => {
      const previousRawEdit = prev.find((card) => card.id === updatedCard.id);
      const nextRawEdit = { ...updatedCard };

      if (illustrationTouched) {
        nextRawEdit.illustrationOverride = true;
      } else if (previousRawEdit?.illustrationOverride) {
        nextRawEdit.illustrationOverride = true;
        nextRawEdit.icon = previousRawEdit.icon;
        nextRawEdit.customImage = previousRawEdit.customImage;
      } else {
        // Legacy edits copied the old built-in illustration into localStorage.
        // Leave it absent so the latest curated system icon can flow through.
        delete nextRawEdit.icon;
        delete nextRawEdit.customImage;
        delete nextRawEdit.illustrationOverride;
      }

      if (!clothingEffectTouched) {
        if (previousRawEdit?.clothingEffect !== undefined) {
          nextRawEdit.clothingEffect = previousRawEdit.clothingEffect;
        } else {
          // The effect shown in the editor came from the built-in card. Keep the
          // persisted field absent so future system metadata can still flow through.
          delete nextRawEdit.clothingEffect;
        }
      }

      if (!timerTouched) {
        if (
          previousRawEdit &&
          Object.prototype.hasOwnProperty.call(previousRawEdit, 'timerSeconds')
        ) {
          nextRawEdit.timerSeconds = previousRawEdit.timerSeconds;
        } else {
          // The effective value shown in the editor came from the built-in
          // card. Keep it absent in storage so future curated values flow in.
          delete nextRawEdit.timerSeconds;
        }
      }

      if (!progressionTouched) {
        if (previousRawEdit && Object.prototype.hasOwnProperty.call(previousRawEdit, 'progression')) {
          nextRawEdit.progression = previousRawEdit.progression;
        } else {
          delete nextRawEdit.progression;
        }
      }

      if (!positionTouched) {
        if (previousRawEdit && Object.prototype.hasOwnProperty.call(previousRawEdit, 'position')) {
          nextRawEdit.position = previousRawEdit.position;
          nextRawEdit.deck = previousRawEdit.deck;
        } else {
          delete nextRawEdit.position;
          delete nextRawEdit.deck;
        }
      }

      return [nextRawEdit, ...prev.filter((card) => card.id !== updatedCard.id)];
    });
  };

  // Start game handler
  const handleStartGame = (p1: Player, p2: Player, newSettings: GameSettings) => {
    setPlayer1(p1);
    setPlayer2(p2);
    setSettings(newSettings);
    setCurrentPlayerIndex(0);
    setCurrentRound(1);
    setOutfitStates([
      createOutfitState(newSettings.outfits[0]),
      createOutfitState(newSettings.outfits[1]),
    ]);
    setClothingRemovalEvents([]);
    setIntimacyPercent(0);
    setIntimacyEvents([]);
    setJourneyPhase('standard');
    setSessionPositionCardIds([]);
    setScreen('game');
  };

  // Turn rotation
  const handleNextTurn = () => {
    setCurrentPlayerIndex((prev) => (prev === 0 ? 1 : 0));
    setCurrentRound((prev) => prev + 1);
  };

  // Restart new session
  const handleRestartSession = () => {
    setPlayer1((prev) => ({ ...prev, completedCount: 0, skippedCount: 0 }));
    setPlayer2((prev) => ({ ...prev, completedCount: 0, skippedCount: 0 }));
    setCurrentPlayerIndex(0);
    setCurrentRound(1);
    setOutfitStates([
      createOutfitState(settings.outfits[0]),
      createOutfitState(settings.outfits[1]),
    ]);
    setClothingRemovalEvents([]);
    setIntimacyPercent(0);
    setIntimacyEvents([]);
    setJourneyPhase('standard');
    setSessionPositionCardIds([]);
    setShowSummary(false);
    setScreen('setup');
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Romantic Ambient Particle Background */}
      <ParticleBackground />

      {/* Main Screen Views */}
      <main className="relative z-10">
        {screen === 'intro' && (
          <IntroScreen
            mode={appMode}
            onModeChange={setAppMode}
            onStart={() => appMode === 'developer' ? openCollection('intro') : setScreen('setup')}
            onOpenCollection={() => openCollection('intro')}
            onOpenRules={() => setShowRules(true)}
          />
        )}

        {screen === 'setup' && (
          <SetupScreen
            initialPlayer1={player1}
            initialPlayer2={player2}
            initialSettings={settings}
            onBack={() => setScreen('intro')}
            onOpenRules={() => setShowRules(true)}
            onStartGame={handleStartGame}
          />
        )}

        {screen === 'game' && (
          <GameTable
            player1={player1}
            player2={player2}
            currentPlayerIndex={currentPlayerIndex}
            currentRound={currentRound}
            settings={settings}
            outfitStates={outfitStates}
            availableCards={availableCards}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onOpenCollection={() => openCollection('game')}
            onOpenRules={() => setShowRules(true)}
            onOpenSummary={() => setShowSummary(true)}
            onFinishGame={() => setShowSummary(true)}
            onUpdatePlayers={(p1, p2) => {
              setPlayer1(p1);
              setPlayer2(p2);
            }}
            onUpdateOutfits={setOutfitStates}
            onAddClothingRemovalEvent={(event) => {
              setClothingRemovalEvents((events) => [...events, event]);
            }}
            unlockedCardIds={unlockedCardIds}
            onUnlockCard={handleUnlockCard}
            onNextTurn={handleNextTurn}
            progressionConfig={progressionConfig}
            intimacyPercent={intimacyPercent}
            journeyPhase={journeyPhase}
            sessionPositionCardIds={sessionPositionCardIds}
            onIntimacyPercentChange={setIntimacyPercent}
            onAddIntimacyEvents={(events) => setIntimacyEvents((current) => [...current, ...events])}
            onJourneyPhaseChange={setJourneyPhase}
            onRevealPositionCard={(cardId) => {
              setSessionPositionCardIds((current) => current.includes(cardId) ? current : [...current, cardId]);
              handleUnlockCard(cardId);
            }}
          />
        )}

        {screen === 'collection' && (
          <CardCollection
            cards={allCards}
            mode={appMode}
            unlockedCardIds={unlockedCardIds}
            backDestination={collectionReturnScreen === 'game' ? 'game' : 'home'}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onAddCustomCard={handleAddCustomCard}
            onUpdateCard={handleUpdateCard}
            onDeleteCard={handleDeleteCard}
            progressionConfig={progressionConfig}
            onProgressionConfigChange={setProgressionConfig}
            onBack={() => setScreen(collectionReturnScreen)}
          />
        )}
      </main>

      {/* Summary Stats Modal */}
      {showSummary && (
        <SummaryModal
          player1={player1}
          player2={player2}
          totalRounds={currentRound}
          favoritesCount={favorites.length}
          outfitStates={outfitStates}
          removalEvents={clothingRemovalEvents}
          intimacyPercent={intimacyPercent}
          intimacyEvents={intimacyEvents}
          positionCardsRevealed={sessionPositionCardIds.length}
          journeyPhase={journeyPhase}
          onRestart={handleRestartSession}
          onClose={() => setShowSummary(false)}
        />
      )}

      <AnimatePresence>
        {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      </AnimatePresence>
    </div>
  );
}
