/**
 * Game route — manages full game state, connecting Setup → GameTable → Summary.
 * Task 1: deserialize GameSettings + Players from route params JSON.
 * Task 2: add playerRewards, rewardEvents, pendingDifficultyBoosts state.
 * Task 5: terminal summary flow (have_sex / pink_complete).
 * Task 8: cloud catalog merged cards.
 */
import React, { useState, useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AppShell } from '@/components/AppShell';
import { GameTable } from '@/screens/GameTable';
import { RulesModal } from '@/components/RulesModal';
import type {
  CardItem,
  CardResolutionEvent,
  ClothingRemovalEvent,
  GameEndReason,
  GameSettings,
  IntimacyEvent,
  JourneyPhase,
  LuxuryProgressionConfig,
  OutfitState,
  PendingDifficultyBoost,
  Player,
  PlayerRewardState,
  PositionSessionStats,
  ProgressionConfig,
  RewardEvent,
} from '@/shared/types';
import type { JourneyDrawProbabilities, LuxuryDrawProbabilities } from '@/shared/utils/progression';
import { INITIAL_CARDS } from '@/shared/data/cards';
import { DEFAULT_PLAYER_1, DEFAULT_PLAYER_2 } from '@/shared/utils/playerStorage';
import { hydrateGameSettings, hydrateOutfitConfig, createOutfitState } from '@/shared/utils/wardrobe';
import {
  DEFAULT_LUXURY_PROGRESSION_CONFIG,
  DEFAULT_PROGRESSION_CONFIG,
} from '@/shared/utils/progression';
import { EMPTY_POSITION_SESSION_STATS } from '@/shared/utils/gameResolution';
import { createRewardStates } from '@/shared/utils/rewards';
import { useCloudCatalog } from '@/shared/utils/useCloudCatalog';

function safeParsePlayer(json: string | undefined, fallback: Player): Player {
  if (!json) return fallback;
  try {
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === 'object' && typeof parsed.name === 'string') {
      return { ...fallback, ...parsed };
    }
  } catch {}
  return fallback;
}

function safeParseSettings(json: string | undefined): GameSettings {
  if (!json) return hydrateGameSettings(null);
  try {
    const parsed = JSON.parse(json);
    return hydrateGameSettings(parsed);
  } catch {}
  return hydrateGameSettings(null);
}

export default function GameRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    settingsJson?: string;
    p1Json?: string;
    p2Json?: string;
  }>();

  // Task 1: Deserialize settings + players from JSON params
  const [settings] = useState<GameSettings>(() => safeParseSettings(params.settingsJson));

  const [player1, setPlayer1] = useState<Player>(() =>
    safeParsePlayer(params.p1Json, DEFAULT_PLAYER_1),
  );

  const [player2, setPlayer2] = useState<Player>(() =>
    safeParsePlayer(params.p2Json, DEFAULT_PLAYER_2),
  );

  // Task 1: outfitStates from hydrated settings.outfits (not hydrateGameSettings(null))
  const [outfitStates, setOutfitStates] = useState<[OutfitState, OutfitState]>([
    createOutfitState(settings.outfits[0], 0),
    createOutfitState(settings.outfits[1], 1),
  ]);

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<0 | 1>(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [unlockedCardIds, setUnlockedCardIds] = useState<string[]>([]);
  const [showRules, setShowRules] = useState(false);

  // Task 5: terminal summary state
  const [showSummary, setShowSummary] = useState(false);
  const [summaryTerminal, setSummaryTerminal] = useState(false);
  const [summaryEndReason, setSummaryEndReason] = useState<GameEndReason | null>(null);

  // Task 8: Cloud catalog merged cards
  const { cards: cloudCards } = useCloudCatalog();
  // Task 1: filter by settings.levels from user (not default)
  const [availableCards] = useState<CardItem[]>(() =>
    INITIAL_CARDS.filter((c) => settings.levels.includes(c.level)),
  );
  // Prefer cloud cards if available, else fall back to local filtered
  const mergedCards = cloudCards.length > 0
    ? cloudCards.filter((c) => settings.levels.includes(c.level))
    : availableCards;

  // Progression state
  const [intimacyPercent, setIntimacyPercent] = useState(0);
  const [luxuryIntimacyPercent, setLuxuryIntimacyPercent] = useState(0);
  const [journeyPhase, setJourneyPhase] = useState<JourneyPhase>('standard');
  const [sessionPositionCardIds, setSessionPositionCardIds] = useState<string[]>([]);
  const [intimacyEvents, setIntimacyEvents] = useState<IntimacyEvent[]>([]);
  const [clothingEvents, setClothingEvents] = useState<ClothingRemovalEvent[]>([]);

  const [resolutionEvents, setResolutionEvents] = useState<CardResolutionEvent[]>([]);
  const [positionSessionStats, setPositionSessionStats] = useState<PositionSessionStats>(
    EMPTY_POSITION_SESSION_STATS,
  );
  const [drawProbabilitySnapshot, setDrawProbabilitySnapshot] =
    useState<JourneyDrawProbabilities | LuxuryDrawProbabilities | null>(null);

  const [progressionConfig] = useState<ProgressionConfig>(DEFAULT_PROGRESSION_CONFIG);
  const [luxuryProgressionConfig] = useState<LuxuryProgressionConfig>(
    DEFAULT_LUXURY_PROGRESSION_CONFIG,
  );

  // Task 2: Reward states
  const [playerRewards, setPlayerRewards] = useState<[PlayerRewardState, PlayerRewardState]>(
    createRewardStates(),
  );
  const [rewardEvents, setRewardEvents] = useState<RewardEvent[]>([]);

  // Task 3: Pending difficulty boost
  const [pendingDifficultyBoost, setPendingDifficultyBoost] =
    useState<PendingDifficultyBoost | null>(null);

  const handleToggleFavorite = useCallback((cardId: string) => {
    setFavorites((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId],
    );
  }, []);

  const handleNextTurn = useCallback(() => {
    setCurrentPlayerIndex((prev) => (prev === 0 ? 1 : 0));
    setCurrentRound((prev) => prev + 1);
  }, []);

  // Task 5: terminal game finish — show summary first, navigate only on user action
  const handleFinishGame = useCallback(
    (reason: GameEndReason) => {
      setSummaryEndReason(reason);
      setSummaryTerminal(true);
      setShowSummary(true);
    },
    [],
  );

  const handleSummaryHome = useCallback(() => {
    setShowSummary(false);
    router.replace('/');
  }, [router]);

  const handleSummaryRestart = useCallback(() => {
    setShowSummary(false);
    router.replace('/');
  }, [router]);

  return (
    <AppShell>
      <GameTable
        player1={player1}
        player2={player2}
        currentPlayerIndex={currentPlayerIndex}
        currentRound={currentRound}
        settings={settings}
        outfitStates={outfitStates}
        availableCards={mergedCards}
        favorites={favorites}
        onToggleFavorite={handleToggleFavorite}
        onOpenCollection={() => router.push('/collection')}
        onOpenRules={() => setShowRules(true)}
        onFinishGame={handleFinishGame}
        onUpdatePlayers={(p1, p2) => {
          setPlayer1(p1);
          setPlayer2(p2);
        }}
        onUpdateOutfits={setOutfitStates}
        onAddClothingRemovalEvent={(e) => setClothingEvents((prev) => [...prev, e])}
        unlockedCardIds={unlockedCardIds}
        onUnlockCard={(id) => setUnlockedCardIds((prev) => [...prev, id])}
        onNextTurn={handleNextTurn}
        progressionConfig={progressionConfig}
        luxuryProgressionConfig={luxuryProgressionConfig}
        intimacyPercent={intimacyPercent}
        luxuryIntimacyPercent={luxuryIntimacyPercent}
        journeyPhase={journeyPhase}
        sessionPositionCardIds={sessionPositionCardIds}
        onIntimacyPercentChange={setIntimacyPercent}
        onLuxuryIntimacyPercentChange={setLuxuryIntimacyPercent}
        onAddIntimacyEvents={(events) => setIntimacyEvents((prev) => [...prev, ...events])}
        onJourneyPhaseChange={setJourneyPhase}
        onSessionPositionCardIdsChange={setSessionPositionCardIds}
        resolutionEvents={resolutionEvents}
        onAddResolutionEvent={(event) =>
          setResolutionEvents((prev) => {
            if (prev.some((e) => e.id === event.id)) return prev;
            return [...prev, event];
          })
        }
        positionSessionStats={positionSessionStats}
        onPositionSessionStatsChange={setPositionSessionStats}
        drawProbabilitySnapshot={drawProbabilitySnapshot}
        onDrawProbabilitySnapshotChange={setDrawProbabilitySnapshot}
        // Task 2 & 3: reward props
        playerRewards={playerRewards}
        onPlayerRewardsChange={setPlayerRewards}
        rewardEvents={rewardEvents}
        onAddRewardEvent={(e) => setRewardEvents((prev) => [...prev, e])}
        pendingDifficultyBoost={pendingDifficultyBoost}
        onPendingDifficultyBoostChange={setPendingDifficultyBoost}
        // Task 5: terminal summary control
        externalShowSummary={showSummary}
        externalSummaryTerminal={summaryTerminal}
        externalSummaryEndReason={summaryEndReason}
        onSummaryHome={handleSummaryHome}
        onSummaryRestart={handleSummaryRestart}
        onSummaryClose={() => {
          if (!summaryTerminal) setShowSummary(false);
        }}
      />
      <RulesModal visible={showRules} onClose={() => setShowRules(false)} />
    </AppShell>
  );
}
