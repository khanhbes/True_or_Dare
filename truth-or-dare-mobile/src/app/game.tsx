/**
 * Game route — manages full game state, connecting Setup → GameTable → Summary.
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
  Player,
  PositionSessionStats,
  ProgressionConfig,
} from '@/shared/types';
import type { JourneyDrawProbabilities, LuxuryDrawProbabilities } from '@/shared/utils/progression';
import { INITIAL_CARDS } from '@/shared/data/cards';
import { DEFAULT_PLAYER_1, DEFAULT_PLAYER_2 } from '@/shared/utils/playerStorage';
import { hydrateGameSettings, createOutfitState } from '@/shared/utils/wardrobe';
import {
  DEFAULT_LUXURY_PROGRESSION_CONFIG,
  DEFAULT_PROGRESSION_CONFIG,
} from '@/shared/utils/progression';
import { EMPTY_POSITION_SESSION_STATS } from '@/shared/utils/gameResolution';

export default function GameRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    p1Name?: string;
    p1Avatar?: string;
    p2Name?: string;
    p2Avatar?: string;
  }>();

  // Game state
  const [player1, setPlayer1] = useState<Player>({
    ...DEFAULT_PLAYER_1,
    name: params.p1Name || DEFAULT_PLAYER_1.name,
    avatar: params.p1Avatar || DEFAULT_PLAYER_1.avatar,
  });

  const [player2, setPlayer2] = useState<Player>({
    ...DEFAULT_PLAYER_2,
    name: params.p2Name || DEFAULT_PLAYER_2.name,
    avatar: params.p2Avatar || DEFAULT_PLAYER_2.avatar,
  });

  const [settings] = useState<GameSettings>(hydrateGameSettings(null));
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<0 | 1>(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [outfitStates, setOutfitStates] = useState<[OutfitState, OutfitState]>([
    createOutfitState(settings.outfits[0], 0),
    createOutfitState(settings.outfits[1], 1),
  ]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [unlockedCardIds, setUnlockedCardIds] = useState<string[]>([]);
  const [availableCards] = useState<CardItem[]>(
    INITIAL_CARDS.filter((c) => settings.levels.includes(c.level)),
  );
  const [showRules, setShowRules] = useState(false);

  // Progression state
  const [intimacyPercent, setIntimacyPercent] = useState(0);
  const [luxuryIntimacyPercent, setLuxuryIntimacyPercent] = useState(0);
  const [journeyPhase, setJourneyPhase] = useState<JourneyPhase>('standard');
  const [sessionPositionCardIds, setSessionPositionCardIds] = useState<string[]>([]);
  const [intimacyEvents, setIntimacyEvents] = useState<IntimacyEvent[]>([]);
  const [clothingEvents, setClothingEvents] = useState<ClothingRemovalEvent[]>([]);

  // New state from PLAN.md
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

  const handleToggleFavorite = useCallback((cardId: string) => {
    setFavorites((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId],
    );
  }, []);

  const handleNextTurn = useCallback(() => {
    setCurrentPlayerIndex((prev) => (prev === 0 ? 1 : 0));
    setCurrentRound((prev) => prev + 1);
  }, []);

  const handleFinishGame = useCallback(
    (_reason: GameEndReason) => {
      router.replace('/');
    },
    [router],
  );

  return (
    <AppShell>
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
      />
      <RulesModal visible={showRules} onClose={() => setShowRules(false)} />
    </AppShell>
  );
}
