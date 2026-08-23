/**
 * GameTable — Full interactive gameplay table with:
 * - Real-time Player Header & Outfit status
 * - Intimacy Journey progress tracker
 * - Interactive Deck Draw / Choice (Truth or Dare)
 * - Card Flip with haptics & countdown timer
 * - Penalty Prompt modal on skip (if enabled)
 * - Garment removal dialog with visual avatar figure
 * - Dual removal & garment swap support
 * - Session Summary modal integration
 * - pass_turn gameplay effect (g-d-14)
 * - CardResolutionEvent unified tracking
 * - drawProbabilitySnapshot (frozen at draw time)
 * - PositionSessionStats (drawn/opened split)
 * - Preparation flow (position phase clothing removal)
 * - Clothing effect on position cards
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
  FadeIn,
  ZoomIn,
  runOnJS,
} from 'react-native-reanimated';
import {
  Heart,
  Eye,
  CheckCircle2,
  XCircle,
  Timer as TimerIcon,
  Sparkles,
  Trophy,
  Flame,
  HelpCircle,
  BookOpen,
  SkipForward,
} from 'lucide-react-native';
import type {
  CardItem,
  CardResolutionEvent,
  CardType,
  ClothingRemovalEvent,
  GameEndReason,
  GameSettings,
  GarmentSlot,
  IntimacyEvent,
  JourneyPhase,
  LuxuryProgressionConfig,
  OutfitState,
  PendingDifficultyBoost,
  Player,
  PlayerIndex,
  PlayerRewardState,
  PositionSessionStats,
  ProgressionConfig,
  RewardEvent,
} from '@/shared/types';
import { DrawProbabilityPanel } from '@/components/DrawProbabilityPanel';
import { CompletionToast, type CompletionToastData } from '@/components/CompletionToast';
import { GameCard } from '@/components/GameCard';
import { OutfitFigure } from '@/components/OutfitFigure';
import {
  PenaltyPrompt,
  GarmentRemovalDialog,
  DualGarmentRemovalDialog,
  GarmentSwapDialog,
} from '@/components/dialogs';
import { SummaryModal } from '@/components/SummaryModal';
import { COLORS, FONTS, FONT_SIZES } from '@/theme';
import {
  getCardDeck,
  selectJourneyCard,
  selectLuxuryPositionCard,
  calculateCompletedCardIntimacy,
  calculateCompletedPositionLuxury,
  deriveDifficultyStars,
  isStandardJourneyCardEligible,
  getStandardCardPerformerIndex,
  getCardTurnAudience,
  type JourneyDrawProbabilities,
  type LuxuryDrawProbabilities,
} from '@/shared/utils/progression';
import {
  createRewardStates,
  awardStars,
  spendReward,
  refundPendingDifficultyBoost,
  REROLL_STAR_COST,
  DIFFICULTY_BOOST_STAR_COST,
} from '@/shared/utils/rewards';
import { resolveCardTimerSeconds } from '@/shared/utils/cardTimer';
import {
  getOutfitStage,
  getPresentGarmentSlots,
  getRemovableGarments,
  removeGarment,
  swapGarments,
} from '@/shared/utils/wardrobe';
import { getRemovalTargetIndices } from '@/shared/utils/cardSelection';
import {
  appendCardResolutionEvent,
  recordPositionDraw,
  recordPositionOpen,
  applyPositionResolution,
} from '@/shared/utils/gameResolution';
import { soundEngine } from '@/utils/audio';
import { haptics } from '@/utils/haptics';

interface GameTableProps {
  player1: Player;
  player2: Player;
  currentPlayerIndex: 0 | 1;
  currentRound: number;
  settings: GameSettings;
  outfitStates: [OutfitState, OutfitState];
  availableCards: CardItem[];
  favorites: string[];
  onToggleFavorite: (cardId: string) => void;
  onOpenCollection: () => void;
  onOpenRules: () => void;
  onFinishGame: (reason: GameEndReason) => void;
  onUpdatePlayers: (p1: Player, p2: Player) => void;
  onUpdateOutfits: (outfits: [OutfitState, OutfitState]) => void;
  onAddClothingRemovalEvent: (event: ClothingRemovalEvent) => void;
  unlockedCardIds: string[];
  onUnlockCard: (cardId: string) => void;
  onNextTurn: () => void;
  progressionConfig: ProgressionConfig;
  luxuryProgressionConfig: LuxuryProgressionConfig;
  intimacyPercent: number;
  luxuryIntimacyPercent: number;
  journeyPhase: JourneyPhase;
  sessionPositionCardIds: string[];
  onIntimacyPercentChange: (value: number) => void;
  onLuxuryIntimacyPercentChange: (value: number) => void;
  onAddIntimacyEvents: (events: IntimacyEvent[]) => void;
  onJourneyPhaseChange: (phase: JourneyPhase) => void;
  onSessionPositionCardIdsChange: (ids: string[]) => void;
  // New from PLAN.md
  resolutionEvents: CardResolutionEvent[];
  onAddResolutionEvent: (event: CardResolutionEvent) => void;
  positionSessionStats: PositionSessionStats;
  onPositionSessionStatsChange: (stats: PositionSessionStats) => void;
  drawProbabilitySnapshot: JourneyDrawProbabilities | LuxuryDrawProbabilities | null;
  onDrawProbabilitySnapshotChange: (probs: JourneyDrawProbabilities | LuxuryDrawProbabilities | null) => void;
  // Task 2: Reward props
  playerRewards: [PlayerRewardState, PlayerRewardState];
  onPlayerRewardsChange: (rewards: [PlayerRewardState, PlayerRewardState]) => void;
  rewardEvents: RewardEvent[];
  onAddRewardEvent: (event: RewardEvent) => void;
  // Task 3: Pending difficulty boost
  pendingDifficultyBoost: PendingDifficultyBoost | null;
  onPendingDifficultyBoostChange: (boost: PendingDifficultyBoost | null) => void;
  // Task 5: External terminal summary control from game.tsx
  externalShowSummary?: boolean;
  externalSummaryTerminal?: boolean;
  externalSummaryEndReason?: GameEndReason | null;
  onSummaryHome?: () => void;
  onSummaryRestart?: () => void;
  onSummaryClose?: () => void;
}

type CardState = 'deck' | 'drawn_hidden' | 'drawn_revealed' | 'completed';

const JOURNEY_LABELS: Record<JourneyPhase, string> = {
  standard: 'Khởi đầu',
  position_consent: 'Đồng thuận',
  position: 'Nâng cao',
  final: 'Đỉnh cao',
};

const OUTFIT_STAGE_COPY = {
  dressed: 'Đang mặc đồ',
  underwear_only: 'Chỉ còn đồ lót',
  empty: 'Hết đồ',
} as const;

export const GameTable: React.FC<GameTableProps> = ({
  player1,
  player2,
  currentPlayerIndex,
  currentRound,
  settings,
  outfitStates,
  availableCards,
  favorites,
  onToggleFavorite,
  onOpenCollection,
  onOpenRules,
  onFinishGame,
  onUpdatePlayers,
  onUpdateOutfits,
  onAddClothingRemovalEvent,
  unlockedCardIds,
  onUnlockCard,
  onNextTurn,
  progressionConfig,
  luxuryProgressionConfig,
  intimacyPercent,
  luxuryIntimacyPercent,
  journeyPhase,
  sessionPositionCardIds,
  onIntimacyPercentChange,
  onLuxuryIntimacyPercentChange,
  onAddIntimacyEvents,
  onJourneyPhaseChange,
  onSessionPositionCardIdsChange,
  resolutionEvents,
  onAddResolutionEvent,
  positionSessionStats,
  onPositionSessionStatsChange,
  drawProbabilitySnapshot,
  onDrawProbabilitySnapshotChange,
  // Task 2
  playerRewards,
  onPlayerRewardsChange,
  onAddRewardEvent,
  // Task 3
  pendingDifficultyBoost,
  onPendingDifficultyBoostChange,
  // Task 5
  externalShowSummary,
  externalSummaryTerminal,
  externalSummaryEndReason,
  onSummaryHome,
  onSummaryRestart,
  onSummaryClose,
}) => {
  const players = [player1, player2] as const;
  const currentPlayer = players[currentPlayerIndex];
  const opponentIndex = (currentPlayerIndex === 0 ? 1 : 0) as PlayerIndex;

  const [cardState, setCardState] = useState<CardState>('deck');
  const [selectedCard, setSelectedCard] = useState<CardItem | null>(null);
  const [isPrivacyHidden, setIsPrivacyHidden] = useState(settings.privacyDefault);
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  const [showTypeChooser, setShowTypeChooser] = useState(false);
  // Task 2: reroll state
  const [hasRerolledThisTurn, setHasRerolledThisTurn] = useState(false);
  // Task 7: completion toast
  const [toastData, setToastData] = useState<CompletionToastData | null>(null);
  // Task 7: confetti ref
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const confettiRef = useRef<any>(null);
  // Task 9: 3D flip animation
  const flipRotation = useSharedValue(0);
  const [flipContentVisible, setFlipContentVisible] = useState(false);

  // Dialog States
  const [showPenaltyPrompt, setShowPenaltyPrompt] = useState(false);
  const [showGarmentDialog, setShowGarmentDialog] = useState(false);
  const [garmentDialogTarget, setGarmentDialogTarget] = useState<0 | 1>(currentPlayerIndex);
  const [garmentDialogSource, setGarmentDialogSource] = useState<'card' | 'penalty' | 'preparation'>('card');
  const [showDualGarmentDialog, setShowDualGarmentDialog] = useState(false);
  const [showSwapDialog, setShowSwapDialog] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // Preparation flow state
  const [preparationSlotIndex, setPreparationSlotIndex] = useState(0);
  const [preparationSlots, setPreparationSlots] = useState<{ playerIndex: 0 | 1; slot: GarmentSlot }[]>([]);
  const [isInPreparation, setIsInPreparation] = useState(false);

  // Used card IDs for standard cards
  const [usedStandardCardIds, setUsedStandardCardIds] = useState<string[]>([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Progress Bar Animation
  const progressWidth = useSharedValue(intimacyPercent);
  useEffect(() => {
    progressWidth.value = withTiming(intimacyPercent, { duration: 600 });
  }, [intimacyPercent]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${Math.min(100, progressWidth.value)}%` as unknown as number,
  }));

  // Luxury Progress Bar Animation
  const luxuryProgressWidth = useSharedValue(luxuryIntimacyPercent);
  useEffect(() => {
    luxuryProgressWidth.value = withTiming(luxuryIntimacyPercent, { duration: 600 });
  }, [luxuryIntimacyPercent]);

  const luxuryProgressStyle = useAnimatedStyle(() => ({
    width: `${Math.min(100, luxuryProgressWidth.value)}%` as unknown as number,
  }));

  // Check if both players are fully undressed → trigger preparation if entering position
  useEffect(() => {
    if (
      journeyPhase === 'position_consent' &&
      outfitStates.every((o) => getOutfitStage(o) === 'empty')
    ) {
      onJourneyPhaseChange('position');
    }
  }, [journeyPhase, outfitStates]);

  // Task 9: 3D Flip animated style
  const flipAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 800 }, { rotateY: `${flipRotation.value}deg` }],
  }));

  const doFlip3D = (onMidpoint: () => void) => {
    flipRotation.value = 0;
    flipRotation.value = withSequence(
      withTiming(90, { duration: 300, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onMidpoint)();
      }),
      withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) }),
    );
  };

  // --- Draw Card (standard) ---
  const drawStandardCard = useCallback(
    (typeChoice?: CardType) => {
      soundEngine.playShuffle();
      setHasRerolledThisTurn(false);
      // Bug 3 fix: filter by settings.levels (not all levels)
      // Task 3: pass difficultyBoost from pendingDifficultyBoost
      const isBoostActive =
        pendingDifficultyBoost !== null &&
        pendingDifficultyBoost.targetPlayerIndex === currentPlayerIndex;
      const result = selectJourneyCard({
        cards: availableCards,
        preferredType: typeChoice ?? null,
        actorIndex: currentPlayerIndex,
        outfits: outfitStates,
        usedCardIds: usedStandardCardIds,
        levels: settings.levels,
        intimacyPercent,
        config: progressionConfig,
        difficultyBoost: isBoostActive,
      });

      // Task 3: clear pending boost after draw
      if (isBoostActive) {
        onPendingDifficultyBoostChange(null);
      }

      // Bug 4 fix: save snapshot at draw time
      onDrawProbabilitySnapshotChange(result.probabilities);

      if (!result.card) {
        setShowSummaryModal(true);
        return;
      }

      setUsedStandardCardIds(result.nextUsedCardIds);
      setSelectedCard(result.card);
      setCardState('drawn_hidden');
      setIsPrivacyHidden(settings.privacyDefault);
    },
    [
      availableCards,
      intimacyPercent,
      progressionConfig,
      outfitStates,
      currentPlayerIndex,
      settings.privacyDefault,
      settings.levels,
      usedStandardCardIds,
      pendingDifficultyBoost,
      onDrawProbabilitySnapshotChange,
      onPendingDifficultyBoostChange,
    ],
  );

  // --- Draw Card (luxury / position) ---
  const drawPositionCard = useCallback(() => {
    soundEngine.playShuffle();
    const positionCards = availableCards.filter((c) => getCardDeck(c) === 'position');
    const result = selectLuxuryPositionCard({
      cards: positionCards,
      actorIndex: currentPlayerIndex,
      outfits: outfitStates,
      usedCardIds: sessionPositionCardIds,
      luxuryPercent: luxuryIntimacyPercent,
      config: luxuryProgressionConfig,
    });

    onDrawProbabilitySnapshotChange(result.probabilities);

    if (!result.card) {
      setShowSummaryModal(true);
      return;
    }

    onSessionPositionCardIdsChange(result.nextUsedCardIds);
    // Bug 5 fix: increase "drawn" stat here (not opened)
    onPositionSessionStatsChange(recordPositionDraw(positionSessionStats));
    setSelectedCard(result.card);
    setCardState('drawn_hidden');
    setIsPrivacyHidden(settings.privacyDefault);
  }, [
    availableCards,
    luxuryIntimacyPercent,
    luxuryProgressionConfig,
    outfitStates,
    currentPlayerIndex,
    settings.privacyDefault,
    sessionPositionCardIds,
    positionSessionStats,
    onSessionPositionCardIdsChange,
    onPositionSessionStatsChange,
    onDrawProbabilitySnapshotChange,
  ]);

  const handleDraw = () => {
    if (journeyPhase === 'position') {
      drawPositionCard();
    } else if (settings.drawMode === 'choose') {
      setShowTypeChooser(true);
    } else {
      drawStandardCard();
    }
  };

  // Reveal Card — Task 9: 3D flip animation
  const revealCard = () => {
    soundEngine.playCardFlip();

    // Bug 5 fix: increase "opened" stat here (not at draw)
    if (selectedCard && getCardDeck(selectedCard) === 'position') {
      onPositionSessionStatsChange(recordPositionOpen(positionSessionStats));
    }

    // 3D flip: phase 1 (0→90°), at midpoint swap content, phase 2 (90→0°)
    doFlip3D(() => {
      setCardState('drawn_revealed');
      setIsPrivacyHidden(false);
      if (selectedCard) {
        const timerSeconds = resolveCardTimerSeconds(selectedCard, settings);
        if (timerSeconds) {
          setTimerRemaining(timerSeconds);
          timerRef.current = setInterval(() => {
            setTimerRemaining((prev) => {
              if (prev === null || prev <= 1) {
                if (timerRef.current) clearInterval(timerRef.current);
                haptics.warning();
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      }
    });
  };

  // Advance turn helper
  const advanceTurn = () => {
    setSelectedCard(null);
    setCardState('deck');
    setTimerRemaining(null);
    setHasRerolledThisTurn(false);
    flipRotation.value = 0;
    onDrawProbabilitySnapshotChange(null);
    onNextTurn();
  };

  // Open clothing dialog based on card clothingEffect
  const triggerClothingDialog = (card: CardItem, afterCallback: () => void): boolean => {
    const deck = getCardDeck(card);
    const performerIndex = deck === 'standard'
      ? getStandardCardPerformerIndex(card, currentPlayerIndex)
      : currentPlayerIndex;
    const targetIndices = getRemovalTargetIndices(card, performerIndex);

    if (card.clothingEffect?.kind === 'swap_garments') {
      const r0 = getRemovableGarments(outfitStates[0]);
      const r1 = getRemovableGarments(outfitStates[1]);
      if (r0.length > 0 && r1.length > 0) {
        setShowSwapDialog(true);
        return true;
      }
    } else if (card.clothingEffect?.kind === 'remove_garment') {
      if (targetIndices.length === 2) {
        const r0 = getRemovableGarments(outfitStates[targetIndices[0]]);
        const r1 = getRemovableGarments(outfitStates[targetIndices[1]]);
        if (r0.length > 0 && r1.length > 0) {
          setShowDualGarmentDialog(true);
          return true;
        }
      } else if (targetIndices.length === 1) {
        const targetIdx = targetIndices[0];
        const removable = getRemovableGarments(outfitStates[targetIdx]);
        if (removable.length > 0) {
          setGarmentDialogTarget(targetIdx as 0 | 1);
          setGarmentDialogSource('card');
          setShowGarmentDialog(true);
          return true;
        }
      }
    }
    return false;
  };

  // Complete Card — Bug 6: check pass_turn, Bug 1: clothing effect on position cards
  // (This function is only called on normal "Hoàn thành")
  const completeCard = () => {
    if (!selectedCard) return;
    if (timerRef.current) clearInterval(timerRef.current);
    soundEngine.playComplete();

    const deck = getCardDeck(selectedCard);

    // Update player completed count
    const updatedPlayers = [...players] as [Player, Player];
    updatedPlayers[currentPlayerIndex] = {
      ...updatedPlayers[currentPlayerIndex],
      completedCount: updatedPlayers[currentPlayerIndex].completedCount + 1,
    };
    onUpdatePlayers(updatedPlayers[0], updatedPlayers[1]);

    // CardResolutionEvent tracking
    const resolutionId = `${selectedCard.id}_${currentRound}_${Date.now()}`;
    const event: CardResolutionEvent = {
      id: resolutionId,
      cardId: selectedCard.id,
      playerIndex: currentPlayerIndex,
      status: 'completed',
      deck: deck,
      round: currentRound,
      timestamp: Date.now(),
    };
    onAddResolutionEvent(event);

    // Position stats update
    if (deck === 'position') {
      onPositionSessionStatsChange(applyPositionResolution(positionSessionStats, event));
    }

    // Calculate intimacy/luxury gain + Task 2: award stars
    let toastIntimacyGain: number | undefined;
    let toastStarGain: number | undefined;
    let toastLuxuryGain: number | undefined;

    if (deck === 'standard') {
      const gainResult = calculateCompletedCardIntimacy(intimacyPercent, selectedCard, progressionConfig, false);
      const gain = gainResult.totalApplied;
      toastIntimacyGain = gain;
      const newPercent = Math.min(100, intimacyPercent + gain);
      onIntimacyPercentChange(newPercent);
      onAddIntimacyEvents([
        {
          cardId: selectedCard.id,
          amount: gain,
          source: 'completed_card',
          track: 'standard',
          round: currentRound,
          timestamp: Date.now(),
        },
      ]);
      // Check if standard intimacy reaches 100% → trigger position phase
      if (newPercent >= 100 && journeyPhase === 'standard') {
        onJourneyPhaseChange('position_consent');
        // Task 3: refund pending boost if intimacy hits 100
        if (pendingDifficultyBoost) {
          const refunded = refundPendingDifficultyBoost(playerRewards, pendingDifficultyBoost);
          onPlayerRewardsChange(refunded);
          onPendingDifficultyBoostChange(null);
        }
      }

      // Task 2: award stars
      const stars = deriveDifficultyStars(selectedCard);
      toastStarGain = stars;
      const nextRewards = awardStars(playerRewards, currentPlayerIndex, stars);
      onPlayerRewardsChange(nextRewards);
      onAddRewardEvent({
        kind: 'earned_stars',
        playerIndex: currentPlayerIndex,
        amount: stars,
        round: currentRound,
        timestamp: Date.now(),
        cardId: selectedCard.id,
      });
    } else if (deck === 'position') {
      // Task 1 fix: use calculateCompletedPositionLuxury instead of hardcode luxuryGain ?? 10
      const luxuryResult = calculateCompletedPositionLuxury(
        luxuryIntimacyPercent,
        selectedCard,
        luxuryProgressionConfig,
      );
      toastLuxuryGain = luxuryResult.totalApplied;
      const newLuxury = luxuryResult.nextPercent;
      onLuxuryIntimacyPercentChange(newLuxury);
      if (newLuxury >= 100) {
        onJourneyPhaseChange('final');
      }
    }

    onUnlockCard(selectedCard.id);

    // Task 7: show confetti + toast
    try { confettiRef.current?.start(); } catch {}
    setToastData({
      intimacyGain: toastIntimacyGain,
      starGain: toastStarGain,
      luxuryGain: toastLuxuryGain,
      isPosition: deck === 'position',
    });

    // Bug 1 fix: check clothing effect on position cards too (no cardRemovalBonus for position)
    const hadDialog = triggerClothingDialog(selectedCard, () => {
      setCardState('completed');
      setTimeout(advanceTurn, 1200);
    });

    if (!hadDialog) {
      setCardState('completed');
      setTimeout(advanceTurn, 1200);
    }
  };

  // Pass card — Bug 6: pass_turn effect
  const passCard = () => {
    if (!selectedCard) return;
    if (timerRef.current) clearInterval(timerRef.current);
    haptics.light();

    // No star/intimacy gain for pass_turn
    const resolutionId = `${selectedCard.id}_${currentRound}_passed_${Date.now()}`;
    const event: CardResolutionEvent = {
      id: resolutionId,
      cardId: selectedCard.id,
      playerIndex: currentPlayerIndex,
      status: 'passed',
      deck: getCardDeck(selectedCard),
      round: currentRound,
      timestamp: Date.now(),
    };
    onAddResolutionEvent(event);

    // Advance turn directly (no penalty, no star award)
    advanceTurn();
  };

  // Skip Card Handler
  const handleSkip = () => {
    if (!selectedCard) return;
    if (timerRef.current) clearInterval(timerRef.current);
    soundEngine.playSkip();

    // ResolutionEvent for skip
    const resolutionId = `${selectedCard.id}_${currentRound}_skipped_${Date.now()}`;
    const event: CardResolutionEvent = {
      id: resolutionId,
      cardId: selectedCard.id,
      playerIndex: currentPlayerIndex,
      status: 'skipped',
      deck: getCardDeck(selectedCard),
      round: currentRound,
      timestamp: Date.now(),
    };
    onAddResolutionEvent(event);

    // Position stats update
    if (getCardDeck(selectedCard) === 'position') {
      onPositionSessionStatsChange(applyPositionResolution(positionSessionStats, event));
    }

    const removable = getRemovableGarments(outfitStates[currentPlayerIndex]);
    if (settings.penaltyClothingEnabled && removable.length > 0) {
      setShowPenaltyPrompt(true);
    } else {
      finalizeSkip();
    }
  };

  const finalizeSkip = () => {
    const updatedPlayers = [...players] as [Player, Player];
    updatedPlayers[currentPlayerIndex] = {
      ...updatedPlayers[currentPlayerIndex],
      skippedCount: updatedPlayers[currentPlayerIndex].skippedCount + 1,
    };
    onUpdatePlayers(updatedPlayers[0], updatedPlayers[1]);
    setShowPenaltyPrompt(false);
    advanceTurn();
  };

  // Garment confirmed removal
  const handleGarmentConfirmed = (slot: GarmentSlot) => {
    soundEngine.playGarmentRemoved();
    const nextOutfits = [...outfitStates] as [OutfitState, OutfitState];
    nextOutfits[garmentDialogTarget] = removeGarment(
      nextOutfits[garmentDialogTarget],
      slot,
    );
    onUpdateOutfits(nextOutfits);

    onAddClothingRemovalEvent({
      cardId: selectedCard?.id ?? (isInPreparation ? 'preparation' : 'penalty'),
      garmentSlot: slot,
      garment: outfitStates[garmentDialogTarget].initial.garments[slot] ?? { styleId: '', color: '' },
      actorPlayerIndex: currentPlayerIndex,
      targetPlayerIndex: garmentDialogTarget,
      source: isInPreparation ? 'preparation' : garmentDialogSource === 'card' ? 'card' : 'penalty',
      round: currentRound,
      timestamp: Date.now(),
    });

    setShowGarmentDialog(false);

    if (isInPreparation) {
      // Continue preparation flow
      advancePreparation(slot, garmentDialogTarget);
    } else if (garmentDialogSource === 'penalty') {
      finalizeSkip();
    } else {
      setCardState('completed');
      setTimeout(advanceTurn, 800);
    }
  };

  // --- Preparation flow ---
  const startPreparation = () => {
    // Collect all garments from both players that need removal
    const slots: { playerIndex: 0 | 1; slot: GarmentSlot }[] = [];
    for (const playerIdx of [0, 1] as const) {
      const removable = getPresentGarmentSlots(outfitStates[playerIdx]);
      for (const slot of removable) {
        slots.push({ playerIndex: playerIdx, slot });
      }
    }

    if (slots.length === 0) {
      onJourneyPhaseChange('position');
      return;
    }

    setPreparationSlots(slots);
    setPreparationSlotIndex(0);
    setIsInPreparation(true);
    // Show first garment removal
    const first = slots[0];
    setGarmentDialogTarget(first.playerIndex);
    setGarmentDialogSource('card' as 'card'); // preparation handled via isInPreparation flag
    setShowGarmentDialog(true);
  };

  const advancePreparation = (_confirmedSlot: GarmentSlot, _playerIdx: number) => {
    const nextIndex = preparationSlotIndex + 1;
    if (nextIndex >= preparationSlots.length) {
      // All done
      setIsInPreparation(false);
      onJourneyPhaseChange('position');
      return;
    }
    setPreparationSlotIndex(nextIndex);
    const nextItem = preparationSlots[nextIndex];
    setGarmentDialogTarget(nextItem.playerIndex);
    setGarmentDialogSource('card' as 'card');
    setShowGarmentDialog(true);
  };

  const cancelPreparation = () => {
    setIsInPreparation(false);
    setShowGarmentDialog(false);
    // Stay in position_consent (don't advance to position)
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const isPassTurn = selectedCard?.gameplayEffect?.kind === 'pass_turn';
  const isPositionPhase = journeyPhase === 'position' || journeyPhase === 'final';
  const isHaveSexCard = selectedCard?.position?.family === 'have_sex';

  // Task 2: Reroll handler
  const handleReroll = () => {
    if (!selectedCard || hasRerolledThisTurn) return;
    const nextRewards = spendReward(playerRewards, currentPlayerIndex, 'reroll');
    if (!nextRewards) return; // insufficient balance

    onPlayerRewardsChange(nextRewards);
    onAddRewardEvent({
      kind: 'rerolled_card',
      playerIndex: currentPlayerIndex,
      amount: REROLL_STAR_COST,
      round: currentRound,
      timestamp: Date.now(),
      cardId: selectedCard.id,
    });

    // Record rerolled event for the old card
    const resolutionId = `${selectedCard.id}_${currentRound}_rerolled_${Date.now()}`;
    onAddResolutionEvent({
      id: resolutionId,
      cardId: selectedCard.id,
      playerIndex: currentPlayerIndex,
      status: 'rerolled',
      deck: getCardDeck(selectedCard),
      round: currentRound,
      timestamp: Date.now(),
    });

    setHasRerolledThisTurn(true);
    // Draw a new card, excluding the rerolled card
    soundEngine.playShuffle();
    const result = selectJourneyCard({
      cards: availableCards,
      actorIndex: currentPlayerIndex,
      outfits: outfitStates,
      usedCardIds: usedStandardCardIds,
      excludedCardIds: [selectedCard.id],
      levels: settings.levels,
      intimacyPercent,
      config: progressionConfig,
    });
    if (result.card) {
      setSelectedCard(result.card);
      setUsedStandardCardIds(result.nextUsedCardIds);
      setCardState('drawn_revealed');
    }
  };

  // Task 3: Difficulty Boost handler
  const handleBoost = () => {
    if (pendingDifficultyBoost !== null) return; // already pending
    const nextRewards = spendReward(playerRewards, currentPlayerIndex, 'difficulty_boost');
    if (!nextRewards) return;

    onPlayerRewardsChange(nextRewards);
    onAddRewardEvent({
      kind: 'queued_difficulty_boost',
      playerIndex: currentPlayerIndex,
      amount: DIFFICULTY_BOOST_STAR_COST,
      round: currentRound,
      timestamp: Date.now(),
    });
    onPendingDifficultyBoostChange({
      ownerPlayerIndex: currentPlayerIndex,
      targetPlayerIndex: opponentIndex,
      queuedRound: currentRound,
    });
  };

  // Task 5: Have Sex card — final_viewed
  const handleHaveSexViewed = () => {
    if (!selectedCard) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const resolutionId = `${selectedCard.id}_${currentRound}_final_${Date.now()}`;
    onAddResolutionEvent({
      id: resolutionId,
      cardId: selectedCard.id,
      playerIndex: currentPlayerIndex,
      status: 'final_viewed',
      deck: getCardDeck(selectedCard),
      round: currentRound,
      timestamp: Date.now(),
    });
    onFinishGame('have_sex');
  };

  return (
    <ScrollView className="flex-1" contentContainerStyle={styles.container}>
      {/* Top Header: Current player & Actions */}
      <View style={styles.topHeader}>
        <View style={styles.playerInfo}>
          <Text style={styles.playerAvatar}>{currentPlayer.avatar}</Text>
          <View>
            <Text style={styles.playerName}>{currentPlayer.name}</Text>
            <Text style={styles.playerMeta}>
              Lượt {currentRound} · {currentPlayer.completedCount}✓ · {currentPlayer.skippedCount}✗
            </Text>
            {/* Task 2: star balance */}
            <Text style={styles.starBalance}>
              ⭐ {playerRewards[currentPlayerIndex].starBalance}
            </Text>
          </View>
        </View>

        <View style={styles.headerButtons}>
          <Pressable onPress={onOpenRules} style={styles.iconBtn}>
            <HelpCircle size={16} color={COLORS.neutral400} />
          </Pressable>
          <Pressable onPress={onOpenCollection} style={styles.iconBtn}>
            <BookOpen size={16} color={COLORS.neutral400} />
          </Pressable>
          <Pressable onPress={() => setShowSummaryModal(true)} style={styles.iconBtn}>
            <Trophy size={16} color={COLORS.gold} />
          </Pressable>
        </View>
      </View>

      {/* Intimacy Journey Progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressLabels}>
          <Text style={styles.journeyPhaseText}>
            Hành trình: {JOURNEY_LABELS[journeyPhase]}
          </Text>
          <Text style={styles.progressPercent}>{Math.round(intimacyPercent)}%</Text>
        </View>
        <View style={styles.progressBarTrack}>
          <Animated.View style={[styles.progressBarFill, progressStyle]} />
        </View>
      </View>

      {/* Luxury progress bar (position phase) */}
      {isPositionPhase && (
        <View style={styles.progressSection}>
          <View style={styles.progressLabels}>
            <Text style={[styles.journeyPhaseText, { color: '#f4e8ff' }]}>
              Tư thế: {positionSessionStats.drawn} rút · {positionSessionStats.opened} mở
            </Text>
            <Text style={[styles.progressPercent, { color: '#d4b8ff' }]}>
              {Math.round(luxuryIntimacyPercent)}%
            </Text>
          </View>
          <View style={styles.progressBarTrack}>
            <Animated.View style={[styles.progressBarFill, luxuryProgressStyle, { backgroundColor: '#a855f7' }]} />
          </View>
        </View>
      )}

      {/* Position consent prompt — Task 5: add 'Kết thúc tại đây' button */}
      {journeyPhase === 'position_consent' && cardState === 'deck' && !isInPreparation && (
        <Animated.View entering={FadeIn.duration(400)} style={styles.consentBox}>
          <Text style={styles.consentTitle}>✨ Sẵn sàng cho pha Tư thế?</Text>
          <Text style={styles.consentDesc}>
            Để vào pha Tư thế, cả hai người cần cởi hết đồ trước.
          </Text>
          <Pressable onPress={startPreparation} style={styles.consentBtn}>
            <Text style={styles.consentBtnText}>Bắt đầu chuẩn bị</Text>
          </Pressable>
          {/* Task 5: end here button */}
          <Pressable onPress={() => onFinishGame('pink_complete')} style={[styles.consentBtn, { backgroundColor: '#db2777' }]}>
            <Text style={styles.consentBtnText}>🏁 Kết thúc tại đây</Text>
          </Pressable>
          <Pressable onPress={() => onJourneyPhaseChange('standard')} style={styles.consentSkipBtn}>
            <Text style={styles.consentSkipBtnText}>Chưa sẵn sàng</Text>
          </Pressable>
        </Animated.View>
      )}

      {/* Player Wardrobe Figures Dock */}
      <View style={styles.figuresDock}>
        {players.map((player, idx) => {
          const stage = getOutfitStage(outfitStates[idx]);
          const count = getPresentGarmentSlots(outfitStates[idx]).length;
          const isActive = idx === currentPlayerIndex;

          return (
            <View
              key={idx}
              style={[
                styles.figureCard,
                isActive && styles.figureCardActive,
              ]}
            >
              <OutfitFigure
                outfit={outfitStates[idx].initial}
                state={outfitStates[idx]}
                active={isActive}
                compact
                width={80}
                height={140}
              />
              <Text style={styles.dockPlayerName} numberOfLines={1}>
                {player.avatar} {player.name}
              </Text>
              <Text
                style={[
                  styles.dockStageText,
                  stage === 'empty'
                    ? { color: COLORS.neutral400 }
                    : stage === 'underwear_only'
                    ? { color: '#fcd34d' }
                    : { color: '#fda4af' },
                ]}
              >
                {OUTFIT_STAGE_COPY[stage]} ({count})
              </Text>
              {/* Task 3: boost pending indicator */}
              {pendingDifficultyBoost?.targetPlayerIndex === idx && (
                <Text style={styles.boostIndicator}>🔥 Boost đang chờ</Text>
              )}
              {/* Task 2: star balance per player */}
              <Text style={styles.dockStarBalance}>⭐ {playerRewards[idx].starBalance}</Text>
            </View>
          );
        })}
      </View>

      {/* Task 6: Draw Probability Panel */}
      {!isPositionPhase && (
        <DrawProbabilityPanel
          cardState={cardState}
          journeyPhase={journeyPhase}
          availableCards={availableCards}
          actorIndex={currentPlayerIndex}
          outfits={outfitStates}
          usedCardIds={usedStandardCardIds}
          levels={settings.levels}
          intimacyPercent={intimacyPercent}
          config={progressionConfig}
          pendingDifficultyBoost={!!pendingDifficultyBoost}
          snapshot={drawProbabilitySnapshot}
        />
      )}

      {/* Main Card Area */}
      <View style={styles.cardCenterArea}>
        {cardState === 'deck' && !showTypeChooser && journeyPhase !== 'position_consent' && (
          <Animated.View entering={FadeIn.duration(400)} style={styles.deckStackWrapper}>
            <View style={styles.deckVisualStack}>
              {[2, 1, 0].map((offset) => (
                <View
                  key={offset}
                  style={[
                    styles.deckLayerCard,
                    {
                      top: offset * 4,
                      left: offset * 2,
                      backgroundColor: offset === 0 ? '#1a0810' : '#0d0407',
                    },
                  ]}
                >
                  {offset === 0 && (
                    <>
                      <Flame size={36} color={COLORS.gold} style={{ marginBottom: 6 }} />
                      <Text style={styles.deckTitle}>
                        {isPositionPhase ? '✦ Rút Tư Thế' : 'Rút Lá Bài'}
                      </Text>
                      <Text style={styles.deckSubtitle}>
                        {availableCards.length} lá còn lại
                      </Text>
                    </>
                  )}
                </View>
              ))}
            </View>

            <Pressable
              onPress={handleDraw}
              style={({ pressed }) => [
                styles.drawBtn,
                isPositionPhase && { backgroundColor: '#7c3aed' },
                { transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}
            >
              <Sparkles size={18} color={isPositionPhase ? '#fff' : '#171717'} />
              <Text style={[styles.drawBtnText, isPositionPhase && { color: '#fff' }]}>
                {isPositionPhase ? 'Rút Tư Thế' : 'Rút Lá Bài'}
              </Text>
            </Pressable>

            {/* Task 3: Boost button — standard phase, deck state */}
            {!isPositionPhase && journeyPhase === 'standard' && (
              <Pressable
                onPress={handleBoost}
                disabled={
                  playerRewards[currentPlayerIndex].starBalance < DIFFICULTY_BOOST_STAR_COST ||
                  pendingDifficultyBoost !== null
                }
                style={({ pressed }) => [
                  styles.boostBtn,
                  (playerRewards[currentPlayerIndex].starBalance < DIFFICULTY_BOOST_STAR_COST ||
                    pendingDifficultyBoost !== null) && { opacity: 0.45 },
                  { transform: [{ scale: pressed ? 0.96 : 1 }] },
                ]}
              >
                <Text style={styles.boostBtnText}>
                  🔥 Boost (+{DIFFICULTY_BOOST_STAR_COST}⭐)
                </Text>
              </Pressable>
            )}
          </Animated.View>
        )}

        {/* Type Choice */}
        {showTypeChooser && (
          <Animated.View entering={ZoomIn.duration(300)} style={styles.typeChooserWrapper}>
            <Text style={styles.typeChooserTitle}>Chọn Thể Loại</Text>
            <Pressable
              onPress={() => {
                setShowTypeChooser(false);
                drawStandardCard('truth');
              }}
              style={({ pressed }) => [
                styles.typeBtn,
                styles.typeBtnTruth,
                { transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}
            >
              <Text style={styles.typeBtnTruthText}>💬 Sự Thật</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setShowTypeChooser(false);
                drawStandardCard('dare');
              }}
              style={({ pressed }) => [
                styles.typeBtn,
                styles.typeBtnDare,
                { transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}
            >
              <Text style={styles.typeBtnDareText}>🔥 Thử Thách</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Drawn Card Display — Task 9: 3D flip animation */}
        {selectedCard && cardState !== 'deck' && (
          <Animated.View style={[styles.drawnCardWrapper, flipAnimatedStyle]}>
            <GameCard
              card={selectedCard}
              size="lg"
              showContent={!isPrivacyHidden}
              isFavorited={favorites.includes(selectedCard.id)}
              onToggleFavorite={onToggleFavorite}
              onPress={cardState === 'drawn_hidden' ? revealCard : undefined}
            />

            {/* Privacy Reveal Button */}
            {cardState === 'drawn_hidden' && isPrivacyHidden && (
              <Pressable onPress={revealCard} style={styles.revealBtn}>
                <Eye size={16} color={COLORS.rose} />
                <Text style={styles.revealBtnText}>Xem nội dung thẻ</Text>
              </Pressable>
            )}

            {/* Timer countdown — hidden for pass_turn */}
            {!isPassTurn && timerRemaining !== null && timerRemaining > 0 && (
              <View style={styles.timerRow}>
                <TimerIcon size={16} color="#fcd34d" />
                <Text
                  style={[
                    styles.timerCountdown,
                    timerRemaining <= 5 && { color: '#ef4444' },
                  ]}
                >
                  {timerRemaining}s
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            {cardState === 'drawn_revealed' && (
              <View style={styles.cardActionsRow}>
                {/* Task 5: Have Sex card — single button */}
                {isHaveSexCard ? (
                  <Pressable
                    onPress={handleHaveSexViewed}
                    style={({ pressed }) => [
                      styles.haveSexBtn,
                      { transform: [{ scale: pressed ? 0.96 : 1 }] },
                    ]}
                  >
                    <Heart size={18} color="#fff" />
                    <Text style={styles.haveSexBtnText}>Đã xem · Kết thúc ván</Text>
                  </Pressable>
                ) : isPassTurn ? (
                  /* Bug 6 fix: pass_turn → "Chuyển lượt" button */
                  <Pressable
                    onPress={passCard}
                    style={({ pressed }) => [
                      styles.passTurnBtn,
                      { transform: [{ scale: pressed ? 0.96 : 1 }] },
                    ]}
                  >
                    <SkipForward size={18} color="#fff" />
                    <Text style={styles.passTurnBtnText}>Chuyển lượt</Text>
                  </Pressable>
                ) : (
                  <>
                    <Pressable
                      onPress={completeCard}
                      style={({ pressed }) => [
                        styles.completeBtn,
                        { transform: [{ scale: pressed ? 0.96 : 1 }] },
                      ]}
                    >
                      <CheckCircle2 size={18} color="#fff" />
                      <Text style={styles.completeBtnText}>Hoàn thành</Text>
                    </Pressable>

                    <Pressable
                      onPress={handleSkip}
                      style={({ pressed }) => [
                        styles.skipBtn,
                        { transform: [{ scale: pressed ? 0.96 : 1 }] },
                      ]}
                    >
                      <XCircle size={18} color="#fda4af" />
                      <Text style={styles.skipBtnText}>Bỏ qua</Text>
                    </Pressable>
                  </>
                )}
              </View>
            )}

            {/* Task 2: Reroll button — only on drawn_revealed, standard deck, once per turn */}
            {cardState === 'drawn_revealed' &&
              !isHaveSexCard && !isPassTurn &&
              getCardDeck(selectedCard) === 'standard' && (
              <Pressable
                onPress={handleReroll}
                disabled={
                  hasRerolledThisTurn ||
                  playerRewards[currentPlayerIndex].starBalance < REROLL_STAR_COST
                }
                style={({ pressed }) => [
                  styles.rerollBtn,
                  (hasRerolledThisTurn ||
                    playerRewards[currentPlayerIndex].starBalance < REROLL_STAR_COST) && { opacity: 0.4 },
                  { transform: [{ scale: pressed ? 0.96 : 1 }] },
                ]}
              >
                <Text style={styles.rerollBtnText}>
                  {hasRerolledThisTurn ? '✓ Đã đổi' : `🔄 Đổi thẻ (${REROLL_STAR_COST}⭐)`}
                </Text>
              </Pressable>
            )}

            {/* Completion celebratory state */}
            {cardState === 'completed' && (
              <Animated.View entering={ZoomIn.duration(400)} style={styles.celebrationBox}>
                <Sparkles size={28} color={COLORS.gold} />
                <Text style={styles.celebrationText}>Tuyệt vời! Chuyển lượt...</Text>
              </Animated.View>
            )}
          </Animated.View>
        )}
      </View>

      {/* End Game */}
      <Pressable
        onPress={() => setShowSummaryModal(true)}
        style={styles.endGameBtn}
      >
        <Text style={styles.endGameBtnText}>Kết thúc ván chơi</Text>
      </Pressable>

      {/* Penalty Prompt Dialog */}
      <PenaltyPrompt
        visible={showPenaltyPrompt}
        playerName={currentPlayer.name}
        playerAvatar={currentPlayer.avatar}
        cardType={selectedCard?.type ?? 'truth'}
        penaltyEnabled={settings.penaltyClothingEnabled}
        canRemoveGarment={getRemovableGarments(outfitStates[currentPlayerIndex]).length > 0}
        onReturn={() => setShowPenaltyPrompt(false)}
        onChooseGarment={() => {
          setShowPenaltyPrompt(false);
          setGarmentDialogTarget(currentPlayerIndex);
          setGarmentDialogSource('penalty');
          setShowGarmentDialog(true);
        }}
        onContinueWithoutPenalty={finalizeSkip}
      />

      {/* Garment Removal Dialog */}
      <GarmentRemovalDialog
        visible={showGarmentDialog}
        targetName={players[garmentDialogTarget].name}
        outfitState={outfitStates[garmentDialogTarget]}
        source={garmentDialogSource}
        onConfirm={handleGarmentConfirmed}
        onCancel={() => {
          if (garmentDialogSource === 'preparation') {
            cancelPreparation();
          } else {
            setShowGarmentDialog(false);
          }
        }}
        onContinueWithoutRemoval={() => {
          setShowGarmentDialog(false);
          if (garmentDialogSource === 'preparation') {
            cancelPreparation();
          } else if (garmentDialogSource === 'penalty') {
            finalizeSkip();
          } else {
            advanceTurn();
          }
        }}
      />

      {/* Dual Garment Removal Dialog */}
      <DualGarmentRemovalDialog
        visible={showDualGarmentDialog}
        playerNames={[player1.name, player2.name]}
        outfitStates={outfitStates}
        onConfirm={(slot1, slot2) => {
          const next = [...outfitStates] as [OutfitState, OutfitState];
          next[0] = removeGarment(next[0], slot1);
          next[1] = removeGarment(next[1], slot2);
          onUpdateOutfits(next);
          setShowDualGarmentDialog(false);
          setCardState('completed');
          setTimeout(advanceTurn, 800);
        }}
        onCancel={() => setShowDualGarmentDialog(false)}
        onContinueWithoutRemoval={() => {
          setShowDualGarmentDialog(false);
          advanceTurn();
        }}
      />

      {/* Garment Swap Dialog */}
      <GarmentSwapDialog
        visible={showSwapDialog}
        playerNames={[player1.name, player2.name]}
        outfitStates={outfitStates}
        onConfirm={(slot1, slot2) => {
          const res = swapGarments(outfitStates, slot1, slot2);
          if (res) onUpdateOutfits(res.outfits);
          setShowSwapDialog(false);
          setCardState('completed');
          setTimeout(advanceTurn, 800);
        }}
        onCancel={() => setShowSwapDialog(false)}
      />

      {/* Task 5: Summary Modal — uses external show/terminal from game.tsx for terminal events */}
      <SummaryModal
        visible={showSummaryModal || (externalShowSummary ?? false)}
        player1={player1}
        player2={player2}
        totalRounds={currentRound}
        favoritesCount={favorites.length}
        outfitStates={outfitStates}
        intimacyPercent={intimacyPercent}
        journeyPhase={journeyPhase}
        positionSessionStats={positionSessionStats}
        endReason={externalSummaryEndReason ?? undefined}
        terminal={externalSummaryTerminal ?? false}
        onRestart={() => {
          setShowSummaryModal(false);
          if (onSummaryRestart) {
            onSummaryRestart();
          } else {
            onFinishGame('manual');
          }
        }}
        onClose={() => {
          if (externalSummaryTerminal) return; // terminal can't close
          setShowSummaryModal(false);
          if (onSummaryClose) onSummaryClose();
        }}
        onHome={() => {
          setShowSummaryModal(false);
          if (onSummaryHome) {
            onSummaryHome();
          } else {
            onFinishGame('manual');
          }
        }}
      />

      {/* Task 7: Confetti cannon — fires on card completion */}
      <ConfettiCannon
        ref={confettiRef}
        count={60}
        origin={{ x: 0, y: 0 }}
        autoStart={false}
        fadeOut
        fallSpeed={2500}
        colors={['#D4AF37', '#FF6B9D', '#fff', '#a78bfa', '#34d399']}
      />

      {/* Task 7: Completion toast */}
      <CompletionToast data={toastData} onDismiss={() => setToastData(null)} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playerAvatar: {
    fontSize: 26,
  },
  playerName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: '#fff',
  },
  playerMeta: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 11,
    color: COLORS.neutral400,
  },
  // Task 2
  starBalance: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: COLORS.gold,
    marginTop: 2,
  },
  // Task 2 + 3 dock items
  dockStarBalance: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 9,
    color: COLORS.gold,
    marginTop: 2,
  },
  boostIndicator: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    color: '#fb923c',
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSection: {
    marginBottom: 14,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  journeyPhaseText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: COLORS.rose,
  },
  progressPercent: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: COLORS.gold,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: COLORS.rose,
  },
  consentBox: {
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.35)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  consentTitle: {
    fontFamily: FONTS.serifBold,
    fontSize: 18,
    color: '#c4b5fd',
    textAlign: 'center',
  },
  consentDesc: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
    color: COLORS.neutral400,
    textAlign: 'center',
  },
  consentBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 9999,
    backgroundColor: '#7c3aed',
    marginTop: 6,
  },
  consentBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: '#fff',
  },
  consentSkipBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  consentSkipBtnText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: COLORS.neutral400,
  },
  figuresDock: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  figureCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 8,
  },
  figureCardActive: {
    borderColor: 'rgba(255, 107, 157, 0.5)',
    backgroundColor: 'rgba(255, 107, 157, 0.08)',
  },
  dockPlayerName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: '#fff',
    marginTop: 4,
  },
  dockStageText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 9,
    marginTop: 2,
  },
  cardCenterArea: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 280,
    marginBottom: 20,
  },
  deckStackWrapper: {
    alignItems: 'center',
    gap: 16,
  },
  deckVisualStack: {
    width: 180,
    height: 250,
    position: 'relative',
  },
  deckLayerCard: {
    position: 'absolute',
    width: 180,
    height: 250,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 157, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  deckTitle: {
    fontFamily: FONTS.serifBold,
    fontSize: 18,
    color: COLORS.gold,
    textAlign: 'center',
  },
  deckSubtitle: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 11,
    color: COLORS.neutral400,
    marginTop: 4,
  },
  drawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 9999,
    backgroundColor: COLORS.goldGradientMid,
    shadowColor: COLORS.gold,
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  drawBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: '#171717',
  },
  typeChooserWrapper: {
    alignItems: 'center',
    gap: 14,
  },
  typeChooserTitle: {
    fontFamily: FONTS.serifBold,
    fontSize: 18,
    color: COLORS.gold,
    marginBottom: 6,
  },
  typeBtn: {
    width: 200,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  typeBtnTruth: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  typeBtnTruthText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: '#93c5fd',
  },
  typeBtnDare: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderColor: 'rgba(244, 63, 94, 0.4)',
  },
  typeBtnDareText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: '#fda4af',
  },
  drawnCardWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  revealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9999,
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  revealBtnText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: '#fda4af',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  timerCountdown: {
    fontFamily: FONTS.bodyBold,
    fontSize: 20,
    color: '#fcd34d',
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 9999,
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  completeBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: '#fff',
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 9999,
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.35)',
  },
  skipBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: '#fda4af',
  },
  passTurnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 9999,
    backgroundColor: 'rgba(71, 85, 105, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    shadowColor: '#475569',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  passTurnBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: '#cbd5e1',
  },
  celebrationBox: {
    alignItems: 'center',
    marginTop: 16,
  },
  celebrationText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: COLORS.gold,
    marginTop: 4,
  },
  endGameBtn: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  endGameBtnText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: COLORS.neutral400,
  },
  // Task 2: Reroll button
  rerollBtn: {
    alignSelf: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.35)',
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
  },
  rerollBtnText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: '#c4b5fd',
  },
  // Task 3: Boost button
  boostBtn: {
    alignSelf: 'center',
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.35)',
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
  },
  boostBtnText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: '#fb923c',
  },
  // Task 5: Have Sex button
  haveSexBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 9999,
    backgroundColor: '#db2777',
    shadowColor: '#db2777',
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  haveSexBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: '#fff',
  },
});
