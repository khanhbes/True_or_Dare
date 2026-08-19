import React, { lazy, Suspense, useState, useEffect, useLayoutEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { ParticleBackground } from './components/ParticleBackground';
import { IntroScreen } from './components/IntroScreen';
import { SetupScreen } from './components/SetupScreen';
import { GameTable } from './components/GameTable';
import { SummaryModal } from './components/SummaryModal';
import { RulesModal } from './components/RulesModal';
import {
  CardItem,
  ClothingRemovalEvent,
  GameEndReason,
  GameSettings,
  IntimacyEvent,
  JourneyPhase,
  LuxuryProgressionConfig,
  OutfitState,
  Player,
  ProgressionConfig,
} from './types';
import { INITIAL_CARDS } from './data/cards';
import { mergeEditedSystemCard, normalizeCardClothingEffect } from './utils/cardSelection';
import { createOutfitState, hydrateGameSettings } from './utils/wardrobe';
import { getCardDeck, hydrateLuxuryProgressionConfig, hydrateProgressionConfig } from './utils/progression';
import { browserCardImageStore, hydrateCardImages, prepareCardsForStorage } from './utils/cardImageStore';
import { DEFAULT_PLAYER_1, DEFAULT_PLAYER_2, loadStoredPlayer } from './utils/playerStorage';

const CardCollection = lazy(async () => {
  const module = await import('./components/CardCollection');
  return { default: module.CardCollection };
});

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
  LUXURY_PROGRESSION_CONFIG: 'tod_couples_luxury_progression_config',
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
const CARD_AUDIENCES = new Set(['male', 'female', 'both', 'current', 'opponent']);
const POSITION_FAMILIES = new Set(['oral', 'blowjob', 'handjob', 'have_sex', 'other']);
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
    (isRecord(effect) && (
      effect.kind === 'swap_garments' ||
      (effect.kind === 'remove_garment' &&
        (effect.target === 'self' || effect.target === 'opponent' ||
          effect.target === 'male' || effect.target === 'female' || effect.target === 'both'))
    ));
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
      isOptionalString(position.customLabel) &&
      typeof position.recipient === 'string' && POSITION_RECIPIENTS.has(position.recipient) &&
      typeof position.orderGroup === 'number' && [1, 2, 3, 4].includes(position.orderGroup) &&
      (position.rarity === 'luxury' || position.rarity === 'mythic') &&
      (position.difficultyStars === undefined ||
        (typeof position.difficultyStars === 'number' && Number.isInteger(position.difficultyStars) &&
          position.difficultyStars >= 1 && position.difficultyStars <= 10)) &&
      (position.luxuryGain === undefined ||
        (typeof position.luxuryGain === 'number' && Number.isFinite(position.luxuryGain) &&
          position.luxuryGain >= 0 && position.luxuryGain <= 100)));
  const appearance = value.appearance;
  const hasValidAppearance =
    appearance === undefined ||
    (isRecord(appearance) &&
      (appearance.iconScale === undefined ||
        (typeof appearance.iconScale === 'number' && Number.isFinite(appearance.iconScale) &&
          appearance.iconScale >= 0.5 && appearance.iconScale <= 1.8)) &&
      (appearance.textScale === undefined ||
        (typeof appearance.textScale === 'number' && Number.isFinite(appearance.textScale) &&
          appearance.textScale >= 0.75 && appearance.textScale <= 1.5)));

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
    isOptionalString(value.customImageId) &&
    (value.illustrationOverride === undefined || typeof value.illustrationOverride === 'boolean') &&
    hasValidAppearance &&
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
    return normalizeCardClothingEffect(normalizedCard);
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
  const [gameEndReason, setGameEndReason] = useState<GameEndReason | null>(null);
  const [gameNavigationLocked, setGameNavigationLocked] = useState(false);
  const [appMode, setAppMode] = useState<AppMode>(loadStoredAppMode);
  const [storageError, setStorageError] = useState<string | null>(null);

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
  const [player1, setPlayer1] = useState<Player>(() => loadStoredPlayer(STORAGE_KEYS.PLAYER1, DEFAULT_PLAYER_1));
  const [player2, setPlayer2] = useState<Player>(() => loadStoredPlayer(STORAGE_KEYS.PLAYER2, DEFAULT_PLAYER_2));

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
  const [luxuryProgressionConfig, setLuxuryProgressionConfig] = useState<LuxuryProgressionConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LUXURY_PROGRESSION_CONFIG);
      return hydrateLuxuryProgressionConfig(saved ? JSON.parse(saved) : null);
    } catch {
      return hydrateLuxuryProgressionConfig(null);
    }
  });

  // Current turn state
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<0 | 1>(0);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [outfitStates, setOutfitStates] = useState<[OutfitState, OutfitState]>(() => [
    createOutfitState(settings.outfits[0], 0),
    createOutfitState(settings.outfits[1], 1),
  ]);
  const [clothingRemovalEvents, setClothingRemovalEvents] = useState<ClothingRemovalEvent[]>([]);
  const [intimacyPercent, setIntimacyPercent] = useState(0);
  const [luxuryIntimacyPercent, setLuxuryIntimacyPercent] = useState(0);
  const [intimacyEvents, setIntimacyEvents] = useState<IntimacyEvent[]>([]);
  const [journeyPhase, setJourneyPhase] = useState<JourneyPhase>('standard');
  const [sessionPositionCardIds, setSessionPositionCardIds] = useState<string[]>([]);
  const [sessionPositionRevealCount, setSessionPositionRevealCount] = useState(0);

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

  useEffect(() => {
    let active = true;
    const hydrateImages = async () => {
      const [customResult, editedResult] = await Promise.all([
        hydrateCardImages(customCards),
        hydrateCardImages(editedCards),
      ]);
      if (!active) return;
      const applyImages = (current: CardItem[], hydrated: CardItem[]) => {
        const byId = new Map(hydrated.map((card) => [card.id, card.customImage] as const));
        return current.map((card) => byId.get(card.id) ? { ...card, customImage: byId.get(card.id) } : card);
      };
      setCustomCards((current) => applyImages(current, customResult.cards));
      setEditedCards((current) => applyImages(current, editedResult.cards));
      const errors = [...customResult.errors, ...editedResult.errors];
      if (errors.length) setStorageError(errors[0]);
    };
    void hydrateImages();
    return () => { active = false; };
    // Only hydrate the metadata loaded during initial render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save changes to localStorage. Image bytes are committed to IndexedDB first;
  // failed migrations retain the legacy base64 value so data is never lost.
  useEffect(() => {
    let active = true;
    void prepareCardsForStorage(customCards).then((result) => {
      if (!active) return;
      try {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_CARDS, JSON.stringify(result.cards));
        if (result.errors.length) setStorageError(result.errors[0]);
      } catch {
        setStorageError('Không đủ dung lượng để lưu bài riêng. Ảnh và nội dung hiện vẫn được giữ trong phiên này.');
      }
    });
    return () => { active = false; };
  }, [customCards]);

  useEffect(() => {
    let active = true;
    void prepareCardsForStorage(editedCards).then((result) => {
      if (!active) return;
      try {
        localStorage.setItem(STORAGE_KEYS.EDITED_CARDS, JSON.stringify(result.cards));
        if (result.errors.length) setStorageError(result.errors[0]);
      } catch {
        setStorageError('Không đủ dung lượng để lưu chỉnh sửa thẻ. Dữ liệu hiện vẫn được giữ trong phiên này.');
      }
    });
    return () => { active = false; };
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

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LUXURY_PROGRESSION_CONFIG, JSON.stringify(luxuryProgressionConfig));
    } catch {}
  }, [luxuryProgressionConfig]);

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
    if (card.customImageId) {
      void browserCardImageStore.delete(card.customImageId).catch(() => {
        setStorageError('Đã xóa lá bài nhưng chưa thể dọn ảnh cũ khỏi bộ nhớ trình duyệt.');
      });
    }
  };

  const openCollection = (returnScreen: 'intro' | 'game') => {
    if (returnScreen === 'game' && gameNavigationLocked) return;
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
    if (updatedCard.deck === 'position' && updatedCard.position?.family === 'have_sex') {
      updatedCard = { ...updatedCard };
      delete updatedCard.clothingEffect;
    }
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
        delete nextRawEdit.customImageId;
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
      createOutfitState(newSettings.outfits[0], 0),
      createOutfitState(newSettings.outfits[1], 1),
    ]);
    setClothingRemovalEvents([]);
    setIntimacyPercent(0);
    setLuxuryIntimacyPercent(0);
    setIntimacyEvents([]);
    setJourneyPhase('standard');
    setSessionPositionCardIds([]);
    setSessionPositionRevealCount(0);
    setGameEndReason(null);
    setShowSummary(false);
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
      createOutfitState(settings.outfits[0], 0),
      createOutfitState(settings.outfits[1], 1),
    ]);
    setClothingRemovalEvents([]);
    setIntimacyPercent(0);
    setLuxuryIntimacyPercent(0);
    setIntimacyEvents([]);
    setJourneyPhase('standard');
    setSessionPositionCardIds([]);
    setSessionPositionRevealCount(0);
    setShowSummary(false);
    setGameEndReason(null);
    setScreen('setup');
  };

  const handleFinishGame = (reason: GameEndReason) => {
    setGameEndReason(reason);
    setShowSummary(true);
  };

  const handleReturnHome = () => {
    setShowSummary(false);
    setGameEndReason(null);
    setScreen('intro');
  };

  const keepGameMounted = screen === 'game' || (screen === 'collection' && collectionReturnScreen === 'game');

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

        {keepGameMounted && (
          <div hidden={screen !== 'game'} aria-hidden={screen !== 'game' || undefined}>
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
            onOpenSummary={() => {
              setGameEndReason(null);
              setShowSummary(true);
            }}
            onFinishGame={handleFinishGame}
            isSuspended={screen !== 'game' || showRules || showSummary}
            onNavigationLockChange={setGameNavigationLocked}
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
            luxuryProgressionConfig={luxuryProgressionConfig}
            intimacyPercent={intimacyPercent}
            luxuryIntimacyPercent={luxuryIntimacyPercent}
            journeyPhase={journeyPhase}
            sessionPositionCardIds={sessionPositionCardIds}
            onIntimacyPercentChange={setIntimacyPercent}
            onLuxuryIntimacyPercentChange={setLuxuryIntimacyPercent}
            onAddIntimacyEvents={(events) => setIntimacyEvents((current) => [...current, ...events])}
            onJourneyPhaseChange={setJourneyPhase}
            onRevealPositionCard={(cardId) => {
              handleUnlockCard(cardId);
              setSessionPositionRevealCount((count) => count + 1);
            }}
            onSessionPositionCardIdsChange={setSessionPositionCardIds}
          />
          </div>
        )}

        {screen === 'collection' && (
          <Suspense fallback={<div className="grid min-h-screen place-items-center text-sm text-rose-200">Đang mở Bộ sưu tập…</div>}>
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
            luxuryProgressionConfig={luxuryProgressionConfig}
            onLuxuryProgressionConfigChange={setLuxuryProgressionConfig}
            onBack={() => setScreen(collectionReturnScreen)}
          />
          </Suspense>
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
          luxuryIntimacyPercent={luxuryIntimacyPercent}
          intimacyEvents={intimacyEvents}
          positionCardsRevealed={sessionPositionRevealCount}
          journeyPhase={journeyPhase}
          onRestart={handleRestartSession}
          onClose={() => {
            if (!gameEndReason) setShowSummary(false);
          }}
          onHome={handleReturnHome}
          terminal={gameEndReason !== null}
          endReason={gameEndReason}
        />
      )}

      <AnimatePresence>
        {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      </AnimatePresence>

      {storageError && (
        <div role="alert" className="fixed bottom-4 left-1/2 z-[90] flex w-[min(92vw,34rem)] -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-rose-300/35 bg-[#1a0b11]/95 px-4 py-3 text-xs text-rose-100 shadow-2xl">
          <span>{storageError}</span>
          <button type="button" onClick={() => setStorageError(null)} className="min-h-10 shrink-0 rounded-full border border-white/15 px-3 font-semibold">Đóng</button>
        </div>
      )}
    </div>
  );
}
