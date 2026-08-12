import React, { useState, useEffect, useLayoutEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { ParticleBackground } from './components/ParticleBackground';
import { IntroScreen } from './components/IntroScreen';
import { SetupScreen } from './components/SetupScreen';
import { GameTable } from './components/GameTable';
import { CardCollection } from './components/CardCollection';
import { SummaryModal } from './components/SummaryModal';
import { RulesModal } from './components/RulesModal';
import { CardItem, ClothingRemovalEvent, GameSettings, OutfitState, Player } from './types';
import { INITIAL_CARDS } from './data/cards';
import { mergeEditedSystemCard } from './utils/cardSelection';
import { createOutfitState, hydrateGameSettings } from './utils/wardrobe';

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
    (typeof value.timerSeconds === 'number' &&
      Number.isFinite(value.timerSeconds) &&
      value.timerSeconds >= 0);

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
    (value.isCustom === undefined || typeof value.isCustom === 'boolean') &&
    isOptionalString(value.icon) &&
    isOptionalString(value.customImage) &&
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
  return loadStoredArray(key, isStoredCard).filter((card) => {
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

  // Current turn state
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<0 | 1>(0);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [outfitStates, setOutfitStates] = useState<[OutfitState, OutfitState]>(() => [
    createOutfitState(settings.outfits[0]),
    createOutfitState(settings.outfits[1]),
  ]);
  const [clothingRemovalEvents, setClothingRemovalEvents] = useState<ClothingRemovalEvent[]>([]);

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
  const availableCards = allCards.filter((card) => settings.levels.includes(card.level));

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
    { clothingEffectTouched }: { clothingEffectTouched: boolean },
  ) => {
    if (updatedCard.isCustom) {
      setCustomCards((prev) => prev.map((card) => card.id === updatedCard.id ? updatedCard : card));
      return;
    }
    setEditedCards((prev) => {
      const previousRawEdit = prev.find((card) => card.id === updatedCard.id);
      const nextRawEdit = { ...updatedCard };

      if (!clothingEffectTouched) {
        if (previousRawEdit?.clothingEffect !== undefined) {
          nextRawEdit.clothingEffect = previousRawEdit.clothingEffect;
        } else {
          // The effect shown in the editor came from the built-in card. Keep the
          // persisted field absent so future system metadata can still flow through.
          delete nextRawEdit.clothingEffect;
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
