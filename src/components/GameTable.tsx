import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Heart,
  Volume2,
  VolumeX,
  BookOpen,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Timer as TimerIcon,
  RotateCcw,
  Sparkles,
  Trophy,
  ChevronRight,
  Flame,
  HelpCircle,
  Zap,
  LockOpen,
  Percent,
} from 'lucide-react';
import {
  CardItem,
  CardType,
  ClothingRemovalEvent,
  GarmentSlot,
  GameSettings,
  IntimacyEvent,
  JourneyPhase,
  LuxuryProgressionConfig,
  OutfitState,
  Player,
  PlayerIndex,
  ProgressionConfig,
} from '../types';
import { LEVEL_INFO } from '../data/cards';
import { soundEngine } from '../utils/audio';
import { getCardIcon, autoAssignIcon } from './CardIcons';
import { PenaltyPrompt } from './PenaltyPrompt';
import { GarmentRemovalDialog } from './GarmentRemovalDialog';
import { GarmentSwapDialog } from './GarmentSwapDialog';
import { OutfitFigure } from './OutfitFigure';
import {
  getTargetIndex,
} from '../utils/cardSelection';
import {
  GARMENT_LABELS,
  getOutfitStage,
  getEquippedGarment,
  getPresentGarmentSlots,
  getRemovableGarments,
  removeGarment,
  swapGarments,
} from '../utils/wardrobe';
import { resolveCardTimerSeconds } from '../utils/cardTimer';
import {
  DIFFICULTY_STARS,
  calculateCompletedCardIntimacy,
  calculateCompletedPositionLuxury,
  deriveDifficultyStars,
  derivePositionDifficultyStars,
  getCardAudience,
  getCardDeck,
  getJourneyDrawProbabilities,
  isStandardJourneyCardEligible,
  selectJourneyCard,
  POSITION_DIFFICULTY_STARS,
  selectLuxuryPositionCard,
} from '../utils/progression';

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
  onOpenSummary: () => void;
  onFinishGame: () => void;
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
  onRevealPositionCard: (cardId: string) => void;
  onSessionPositionCardIdsChange: (cardIds: string[]) => void;
}

interface PlayerOutfitStatusProps {
  player: Player;
  outfitState: OutfitState;
  active: boolean;
  mobile?: boolean;
}

const OUTFIT_STAGE_COPY = {
  dressed: 'Đang mặc đồ',
  underwear_only: 'Chỉ còn đồ lót',
  empty: 'Hết đồ đã chọn',
} as const;

const AUDIENCE_LABELS = { male: 'Nam', female: 'Nữ', both: 'Cả hai' } as const;
const POSITION_RECIPIENT_LABELS = { male: 'Nam nhận', female: 'Nữ nhận', both: 'Cả hai' } as const;
const POSITION_FAMILY_LABELS = {
  oral: 'Oral sex',
  blowjob: 'Blow',
  handjob: 'Hand',
  have_sex: 'Have sex',
  other: 'Tư thế khác',
} as const;

const getPositionFamilyLabel = (card: CardItem) =>
  card.position?.family === 'other'
    ? card.position.customLabel?.trim() || POSITION_FAMILY_LABELS.other
    : card.position
      ? POSITION_FAMILY_LABELS[card.position.family]
      : '';

const PlayerOutfitStatus: React.FC<PlayerOutfitStatusProps> = ({
  player,
  outfitState,
  active,
  mobile = false,
}) => {
  const stage = getOutfitStage(outfitState);
  const count = getPresentGarmentSlots(outfitState).length;

  return (
    <aside
      className={`game-player-outfit relative overflow-hidden rounded-2xl border px-2.5 py-2.5 text-center transition-all ${mobile ? 'game-player-outfit--mobile' : ''} ${
        active
          ? 'border-rose-400/50 bg-rose-500/[0.08] shadow-[0_0_24px_rgba(255,107,157,0.14)]'
          : 'border-white/10 bg-black/20 opacity-80'
      }`}
      aria-label={`${player.name}: ${OUTFIT_STAGE_COPY[stage]}, còn ${count} món`}
    >
      <OutfitFigure
        outfit={outfitState.initial}
        state={outfitState}
        active={active}
        compact
        className={mobile ? 'game-outfit-dock' : 'game-outfit-side'}
        ariaLabel={`Hình trang phục hiện tại của ${player.name}`}
      />
      <div className={mobile ? '-mt-1' : 'mt-1'}>
        <div className="truncate text-xs font-bold text-white">{player.avatar} {player.name}</div>
        <div className={`mt-0.5 text-[10px] font-medium ${stage === 'empty' ? 'text-neutral-400' : stage === 'underwear_only' ? 'text-amber-300' : 'text-rose-200'}`}>
          {OUTFIT_STAGE_COPY[stage]} · {count} món
        </div>
      </div>
    </aside>
  );
};

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
  onOpenSummary,
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
  onRevealPositionCard,
  onSessionPositionCardIdsChange,
}) => {
  const [isMusicOn, setIsMusicOn] = useState(soundEngine.isMusicOn());
  const [isMuted, setIsMuted] = useState(soundEngine.getMuted());
  const shouldReduceMotion = useReducedMotion();
  const [showPenaltyPrompt, setShowPenaltyPrompt] = useState(false);
  const [usedCardIds, setUsedCardIds] = useState<string[]>([]);
  const [drawError, setDrawError] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState<string>('');
  const [unlockNotice, setUnlockNotice] = useState<string | null>(null);
  const [intimacyGainNotice, setIntimacyGainNotice] = useState<string | null>(null);
  const [removalRequest, setRemovalRequest] = useState<{
    source: 'card' | 'penalty';
    targetIndex: PlayerIndex;
  } | null>(null);
  const [showSwapDialog, setShowSwapDialog] = useState(false);

  // Card draw state machine
  const [drawState, setDrawState] = useState<
    'idle' | 'selecting_type' | 'shuffling' | 'drawing' | 'drawn'
  >('idle');
  const [activeCard, setActiveCard] = useState<CardItem | null>(null);
  const [isRevealed, setIsRevealed] = useState<boolean>(!settings.privacyDefault);
  const [cardFlipped, setCardFlipped] = useState<boolean>(false);

  // Timer state for Dares
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const didPlayTimerAlarmRef = useRef(false);
  const completionCommittedRef = useRef(false);

  const currentPlayer = currentPlayerIndex === 0 ? player1 : player2;
  const availableDrawTypes = (['truth', 'dare'] as const).filter((type) =>
    availableCards.some(
      (card) => card.type === type && isStandardJourneyCardEligible(card, currentPlayerIndex, outfitStates),
    ),
  );
  const drawProbabilities = getJourneyDrawProbabilities({
    cards: availableCards,
    actorIndex: currentPlayerIndex,
    outfits: outfitStates,
    usedCardIds,
    levels: settings.levels,
    intimacyPercent,
    config: progressionConfig,
  });
  const luxuryDrawProbabilities = selectLuxuryPositionCard({
    cards: availableCards,
    actorIndex: currentPlayerIndex,
    outfits: outfitStates,
    usedCardIds: sessionPositionCardIds,
    luxuryPercent: luxuryIntimacyPercent,
    config: luxuryProgressionConfig,
    random: () => 0,
  }).probabilities;
  const chance = (value: number) => `${Math.round(value * 100)}%`;

  // Countdown uses one disposable timeout per second. The alarm is handled by
  // the guarded transition effect below, outside the state updater, so React
  // Strict Mode cannot accidentally schedule it twice.
  useEffect(() => {
    if (!isTimerRunning || timerSeconds === null || timerSeconds <= 0) return;

    const currentSeconds = timerSeconds;
    const timeout = window.setTimeout(() => {
      if (currentSeconds <= 5 && currentSeconds > 1) {
        soundEngine.playTick();
      }
      setTimerSeconds((latestSeconds) =>
        latestSeconds === currentSeconds ? Math.max(0, currentSeconds - 1) : latestSeconds,
      );
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [isTimerRunning, timerSeconds]);

  useEffect(() => {
    if (timerSeconds !== 0 || didPlayTimerAlarmRef.current) return;

    didPlayTimerAlarmRef.current = true;
    setIsTimerRunning(false);
    soundEngine.playTimerAlarm(3000);
    setLiveMessage('Hết giờ. Chuông đang báo trong khoảng 3 giây.');
  }, [timerSeconds]);

  useEffect(
    () => () => {
      soundEngine.stopTimerAlarm();
    },
    [],
  );

  useEffect(() => {
    if (!unlockNotice) return;
    const timeout = window.setTimeout(() => setUnlockNotice(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [unlockNotice]);

  useEffect(() => {
    if (!intimacyGainNotice) return;
    const timeout = window.setTimeout(() => setIntimacyGainNotice(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [intimacyGainNotice]);

  // Audio Toggles
  const handleToggleMusic = () => {
    const next = soundEngine.toggleBackgroundMusic();
    setIsMusicOn(next);
  };

  const handleToggleMute = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  const handleTimerControl = () => {
    if (timerSeconds === 0) {
      const resetSeconds = resolveCardTimerSeconds(activeCard, settings);
      if (resetSeconds === null) return;

      soundEngine.stopTimerAlarm();
      didPlayTimerAlarmRef.current = false;
      setTimerSeconds(resetSeconds);
      setIsTimerRunning(true);
      setLiveMessage('Đã bắt đầu đếm lại thời gian.');
      return;
    }

    setIsTimerRunning((running) => !running);
  };

  // Initiate Draw Process
  const handleStartDraw = () => {
    soundEngine.playTick();
    setDrawError(null);
    if (availableDrawTypes.length === 0) {
      setDrawError('Không còn thẻ phù hợp với cấp độ và trang phục hiện tại.');
      return;
    }
    if (settings.drawMode === 'choose') {
      setDrawState('selecting_type');
    } else {
      executeDrawCard(null);
    }
  };

  const executeDrawCard = (preferredType: CardType | null) => {
    const selection = selectJourneyCard({
      cards: availableCards,
      preferredType,
      actorIndex: currentPlayerIndex,
      outfits: outfitStates,
      usedCardIds,
      levels: settings.levels,
      intimacyPercent,
      config: progressionConfig,
    });

    if (!selection.card) {
      setDrawError(
        preferredType
          ? `Không còn thẻ ${preferredType === 'truth' ? 'Sự Thật' : 'Thử Thách'} phù hợp.`
          : 'Không còn thẻ phù hợp với trạng thái trang phục hiện tại.',
      );
      setDrawState(preferredType ? 'selecting_type' : 'idle');
      return;
    }

    const randomCard = selection.card;
    completionCommittedRef.current = false;
    setUsedCardIds(selection.nextUsedCardIds);
    setDrawError(null);
    setDrawState('shuffling');
    soundEngine.playShuffle();

    setTimeout(() => {
      setActiveCard(randomCard);
      setDrawState('drawing');
      setIsRevealed(!settings.privacyDefault);
      setCardFlipped(false);

      // Trigger 3D flip animation
      setTimeout(() => {
        setCardFlipped(true);
        soundEngine.playCardFlip();
        setDrawState('drawn');

        // A card may override, disable or inherit the configured duration for
        // its Truth/Action type.
        const cardTimerSeconds = resolveCardTimerSeconds(randomCard, settings);
        if (cardTimerSeconds !== null) {
          soundEngine.stopTimerAlarm();
          didPlayTimerAlarmRef.current = false;
          setTimerSeconds(cardTimerSeconds);
          setIsTimerRunning(false);
        } else {
          soundEngine.stopTimerAlarm();
          didPlayTimerAlarmRef.current = false;
          setTimerSeconds(null);
          setIsTimerRunning(false);
        }
      }, 500);
    }, 900);
  };

  const fireCompletionFeedback = () => {
    soundEngine.playCompleteSound();
    if (!shouldReduceMotion) {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FF6B9D', '#D4AF37', '#FF1493', '#FFF'],
      });
    }
  };

  const finalizeCompletedTurn = (includeCardRemovalBonus = false) => {
    if (!activeCard || completionCommittedRef.current) return;
    completionCommittedRef.current = true;
    fireCompletionFeedback();
    if (!unlockedCardIds.includes(activeCard.id)) {
      onUnlockCard(activeCard.id);
      setUnlockNotice(`Đã mở khóa lá bài mới trong Bộ sưu tập`);
    }
    const gain = calculateCompletedCardIntimacy(
      intimacyPercent,
      activeCard,
      progressionConfig,
      includeCardRemovalBonus,
    );
    const nextIntimacy = gain.nextPercent;
    const appliedTotal = gain.totalApplied;
    const appliedBase = gain.baseApplied;
    const appliedRemoval = gain.removalApplied;
    const now = Date.now();
    const events: IntimacyEvent[] = [];
    if (appliedBase > 0) {
      events.push({
        cardId: activeCard.id,
        amount: appliedBase,
        source: 'completed_card',
        track: 'standard',
        round: currentRound,
        timestamp: now,
      });
    }
    if (appliedRemoval > 0) {
      events.push({
        cardId: activeCard.id,
        amount: appliedRemoval,
        source: 'card_clothing_removal',
        track: 'standard',
        round: currentRound,
        timestamp: now,
      });
    }
    onIntimacyPercentChange(nextIntimacy);
    if (events.length > 0) onAddIntimacyEvents(events);
    setIntimacyGainNotice(
      `+${appliedTotal}% thân mật${appliedRemoval > 0 ? ` · gồm +${appliedRemoval}% bỏ đồ` : ''}`,
    );
    if (currentPlayerIndex === 0) {
      onUpdatePlayers(
        { ...player1, completedCount: player1.completedCount + 1 },
        player2
      );
    } else {
      onUpdatePlayers(player1, {
        ...player2,
        completedCount: player2.completedCount + 1,
      });
    }
    if (nextIntimacy >= 100) {
      soundEngine.stopTimerAlarm();
      setIsTimerRunning(false);
      setTimerSeconds(null);
      setActiveCard(null);
      setDrawState('idle');
      setCardFlipped(false);
      setIsRevealed(true);
      onJourneyPhaseChange('position_consent');
      return;
    }
    advanceNextTurn();
  };

  const finalizeCompletedPosition = () => {
    if (!activeCard || completionCommittedRef.current) return;
    completionCommittedRef.current = true;
    fireCompletionFeedback();
    if (!unlockedCardIds.includes(activeCard.id)) {
      onUnlockCard(activeCard.id);
      setUnlockNotice('Đã mở khóa lá Tư thế mới trong Bộ sưu tập');
    }
    const gain = calculateCompletedPositionLuxury(
      luxuryIntimacyPercent,
      activeCard,
      luxuryProgressionConfig,
    );
    onLuxuryIntimacyPercentChange(gain.nextPercent);
    if (gain.totalApplied > 0) {
      onAddIntimacyEvents([{
        cardId: activeCard.id,
        amount: gain.totalApplied,
        source: 'completed_card',
        track: 'luxury',
        round: currentRound,
        timestamp: Date.now(),
      }]);
    }
    setIntimacyGainNotice(`+${gain.totalApplied}% Luxury · ${derivePositionDifficultyStars(activeCard)}★`);
    revealPositionCard([activeCard.id], gain.nextPercent);
  };

  const finalizeCardCompletion = (includeCardRemovalBonus = false) => {
    if (activeCard && getCardDeck(activeCard) === 'position') finalizeCompletedPosition();
    else finalizeCompletedTurn(includeCardRemovalBonus);
  };

  const finalizeSkippedTurn = () => {
    setShowPenaltyPrompt(false);
    if (currentPlayerIndex === 0) {
      onUpdatePlayers(
        { ...player1, skippedCount: player1.skippedCount + 1 },
        player2,
      );
    } else {
      onUpdatePlayers(player1, {
        ...player2,
        skippedCount: player2.skippedCount + 1,
      });
    }
    advanceNextTurn();
  };

  // Action: Complete Challenge
  const handleComplete = () => {
    soundEngine.stopTimerAlarm();
    setIsTimerRunning(false);
    if (activeCard?.clothingEffect?.kind === 'swap_garments') {
      setShowSwapDialog(true);
      return;
    }
    if (activeCard?.clothingEffect?.kind === 'remove_garment') {
      const targetIndex = getTargetIndex(activeCard.clothingEffect, currentPlayerIndex);
      if (getRemovableGarments(outfitStates[targetIndex]).length > 0) {
        setRemovalRequest({ source: 'card', targetIndex });
        return;
      }
    }
    finalizeCardCompletion();
  };

  // Action: Skip Challenge
  const handleSkip = () => {
    soundEngine.playTick();
    soundEngine.stopTimerAlarm();
    setIsTimerRunning(false);
    setShowPenaltyPrompt(true);
  };

  const handlePenaltyGarmentChoice = () => {
    setShowPenaltyPrompt(false);
    setRemovalRequest({ source: 'penalty', targetIndex: currentPlayerIndex });
  };

  const handleCancelRemoval = () => {
    const wasPenalty = removalRequest?.source === 'penalty';
    setRemovalRequest(null);
    setShowSwapDialog(false);
    if (wasPenalty) setShowPenaltyPrompt(true);
  };

  const handleConfirmRemoval = (slot: GarmentSlot) => {
    if (!removalRequest) return;
    const targetState = outfitStates[removalRequest.targetIndex];
    const garment = getEquippedGarment(targetState, slot);
    const nextTargetState = removeGarment(targetState, slot);
    if (!garment || nextTargetState === targetState) return;

    const nextOutfits: [OutfitState, OutfitState] = [outfitStates[0], outfitStates[1]];
    nextOutfits[removalRequest.targetIndex] = nextTargetState;
    onUpdateOutfits(nextOutfits);
    const targetName = removalRequest.targetIndex === 0 ? player1.name : player2.name;
    setLiveMessage(
      `${targetName} đã bỏ ${GARMENT_LABELS[slot].toLocaleLowerCase('vi')}, còn ${getPresentGarmentSlots(nextTargetState).length} món.`,
    );
    onAddClothingRemovalEvent({
      actorPlayerIndex: currentPlayerIndex,
      targetPlayerIndex: removalRequest.targetIndex,
      garmentSlot: slot,
      garment: { styleId: garment.styleId, color: garment.color },
      garmentId: garment.id,
      action: 'removed',
      source: removalRequest.source,
      cardId: removalRequest.source === 'card' ? activeCard?.id : undefined,
      round: currentRound,
      timestamp: Date.now(),
    });

    const source = removalRequest.source;
    setRemovalRequest(null);
    if (source === 'card') finalizeCardCompletion(true);
    else finalizeSkippedTurn();
  };

  const handleContinueWithoutRemoval = () => {
    if (!removalRequest) return;
    const source = removalRequest.source;
    setRemovalRequest(null);
    if (source === 'card') finalizeCardCompletion();
    else finalizeSkippedTurn();
  };

  const handleConfirmSwap = (firstSlot: GarmentSlot, secondSlot: GarmentSlot) => {
    if (!activeCard) return;
    const result = swapGarments(outfitStates, firstSlot, secondSlot);
    if (!result) {
      setLiveMessage('Không thể đổi hai món đã chọn. Trang phục được giữ nguyên.');
      return;
    }
    onUpdateOutfits(result.outfits);
    const now = Date.now();
    result.transferred.forEach((garment, fromIndex) => {
      const targetPlayerIndex = fromIndex as PlayerIndex;
      onAddClothingRemovalEvent({
        actorPlayerIndex: currentPlayerIndex,
        targetPlayerIndex,
        toPlayerIndex: (targetPlayerIndex === 0 ? 1 : 0),
        garmentSlot: garment.slot,
        garment: { styleId: garment.styleId, color: garment.color },
        garmentId: garment.id,
        action: 'transferred',
        source: 'card',
        cardId: activeCard.id,
        round: currentRound,
        timestamp: now,
      });
    });
    result.replaced.forEach((garment, targetIndex) => {
      if (!garment) return;
      onAddClothingRemovalEvent({
        actorPlayerIndex: currentPlayerIndex,
        targetPlayerIndex: targetIndex as PlayerIndex,
        garmentSlot: garment.slot,
        garment: { styleId: garment.styleId, color: garment.color },
        garmentId: garment.id,
        action: 'replaced',
        source: 'card',
        cardId: activeCard.id,
        round: currentRound,
        timestamp: now,
      });
    });
    setShowSwapDialog(false);
    setLiveMessage(`${player1.name} và ${player2.name} đã đổi ${GARMENT_LABELS[firstSlot].toLocaleLowerCase('vi')} với ${GARMENT_LABELS[secondSlot].toLocaleLowerCase('vi')}.`);
    finalizeCardCompletion(true);
  };

  const advanceNextTurn = () => {
    soundEngine.stopTimerAlarm();
    didPlayTimerAlarmRef.current = false;
    setLiveMessage('');
    setDrawState('idle');
    setActiveCard(null);
    setCardFlipped(false);
    setIsRevealed(!settings.privacyDefault);
    setTimerSeconds(null);
    setIsTimerRunning(false);
    setDrawError(null);
    setRemovalRequest(null);
    setShowPenaltyPrompt(false);
    completionCommittedRef.current = false;

    onNextTurn();
  };

  const revealPositionCard = (
    additionalExcludedIds: readonly string[] = [],
    luxuryOverride = luxuryIntimacyPercent,
  ) => {
    const selection = selectLuxuryPositionCard({
      cards: availableCards,
      actorIndex: currentPlayerIndex,
      outfits: outfitStates,
      usedCardIds: [...sessionPositionCardIds, ...additionalExcludedIds],
      luxuryPercent: luxuryOverride,
      config: luxuryProgressionConfig,
    });
    const nextCard = selection.card;
    if (!nextCard) {
      setActiveCard(null);
      setDrawState('idle');
      setDrawError(selection.missingFinalCard
        ? 'Tim Luxury đã đầy nhưng chưa có lá Have Sex 10★. Bạn có thể mở Developer hoặc kết thúc ván.'
        : 'Không còn lá Tư thế phù hợp với trang phục hiện tại.');
      return;
    }
    soundEngine.stopTimerAlarm();
    completionCommittedRef.current = false;
    setTimerSeconds(resolveCardTimerSeconds(nextCard, settings));
    setIsTimerRunning(false);
    setActiveCard(nextCard);
    setIsRevealed(true);
    setCardFlipped(false);
    setDrawState('drawing');
    setDrawError(null);
    onSessionPositionCardIdsChange(selection.nextUsedCardIds);
    onRevealPositionCard(nextCard.id);
    onJourneyPhaseChange(nextCard.position?.family === 'have_sex' ? 'final' : 'position');
    soundEngine.playShuffle();
    window.setTimeout(() => {
      setCardFlipped(true);
      setDrawState('drawn');
      soundEngine.playCardFlip();
    }, 420);
  };

  const handleEnterPositionJourney = () => revealPositionCard();

  const handlePositionAdvance = (completed: boolean) => {
    if (!activeCard) return;
    if (completed) {
      handleComplete();
      return;
    }
    soundEngine.playTick();
    revealPositionCard([activeCard.id]);
  };

  useEffect(() => {
    if ((journeyPhase === 'position' || journeyPhase === 'final') && !activeCard) {
      revealPositionCard();
    }
    // `activeCard` is deliberately omitted: this only restores the shared
    // position stage after returning from another full-page view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeyPhase]);

  const isFavorited = activeCard ? favorites.includes(activeCard.id) : false;
  const activeDeck = activeCard ? getCardDeck(activeCard) : 'standard';
  const isPositionCard = activeDeck === 'position';
  const isFinalPositionCard = activeCard?.position?.family === 'have_sex';
  const completionActionLabel = activeCard?.clothingEffect?.kind === 'swap_garments'
    ? 'Chọn 2 món để đổi'
    : activeCard?.clothingEffect?.kind === 'remove_garment'
      ? `Chọn 1 món của ${getTargetIndex(activeCard.clothingEffect, currentPlayerIndex) === 0 ? player1.name : player2.name}`
      : 'Đã hoàn thành';
  const canApplyPenaltyGarment = getRemovableGarments(outfitStates[currentPlayerIndex]).length > 0;

  return (
    <div className="relative z-10 max-w-7xl mx-auto px-4 py-4 min-h-[92vh] flex flex-col justify-between">
      {/* HEADER: Top Bar Stats & Controls */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 glass-dark rounded-2xl px-4 py-3 border border-rose-500/20 shadow-lg">
        {/* Current Turn Badge */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-md border"
            style={{
              borderColor: currentPlayerIndex === 0 ? '#FF6B9D' : '#D4AF37',
              backgroundColor:
                currentPlayerIndex === 0 ? 'rgba(255,107,157,0.15)' : 'rgba(212,175,55,0.15)',
            }}
          >
            {currentPlayer.avatar}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-neutral-400">
              Đang tới lượt
            </div>
            <div className="font-serif-romantic text-base font-bold text-white flex items-center gap-1.5">
              <span>{currentPlayer.name}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            </div>
          </div>
        </div>

        {/* Round Progress Bar */}
        <div className="flex flex-col items-center">
          <div className="text-xs text-amber-200/90 font-medium mb-1 flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Lượt {currentRound}
              {settings.roundsMode === 'target' ? ` / ${settings.targetRounds}` : ''}
            </span>
          </div>
          {settings.roundsMode === 'target' && (
            <div className="w-28 sm:w-36 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gold-gradient transition-all duration-500"
                style={{
                  width: `${Math.min(100, (currentRound / settings.targetRounds) * 100)}%`,
                }}
              />
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleMute}
            aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900/80 border border-neutral-700/60 text-neutral-300 hover:text-white transition-all"
            title="Âm thanh"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>

          <button
            type="button"
            onClick={onOpenRules}
            aria-label="Cách chơi và luật phạt"
            title="Cách chơi & luật phạt"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900/80 border border-neutral-700/60 text-rose-300 hover:border-rose-400/50 hover:text-rose-100 transition-all"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenCollection}
            aria-label="Mở bộ sưu tập thẻ"
            className="flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl bg-neutral-900/80 px-3 border border-neutral-700/60 text-amber-300 hover:text-amber-100 transition-all text-xs"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Bộ sưu tập</span>
          </button>

          <button
            onClick={onOpenSummary}
            aria-label="Mở tổng kết và thống kê"
            className="flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl bg-rose-950/60 px-3 border border-rose-500/30 text-rose-300 hover:text-rose-100 transition-all text-xs"
          >
            <Trophy className="w-4 h-4 text-rose-400" />
            <span className="hidden sm:inline">Thống kê</span>
          </button>
        </div>
      </div>

      <section className="mt-3 px-1" aria-label="Tiến trình thân mật hai giai đoạn">
        <div className="mb-1.5 flex items-end justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="relative grid h-8 w-8 place-items-center" aria-hidden="true">
              <Heart className="absolute h-7 w-7 fill-rose-500/80 text-rose-300" />
              {journeyPhase !== 'standard' && (
                <Heart className="absolute h-5 w-5 fill-[#d7b1ff]/35 text-[#f0d7ff] drop-shadow-[0_0_7px_rgba(232,164,140,.55)]" />
              )}
            </span>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-200/75">Hành trình thân mật</span>
              <p className="mt-0.5 text-[10px] text-neutral-500">
                {journeyPhase === 'standard' ? 'Hoàn thành để mở Tim Luxury' : 'Tim hồng đã đầy · đang tích lũy Luxury'}
              </p>
            </div>
          </div>
          <strong className={`font-serif-romantic text-xl ${journeyPhase === 'standard' ? 'text-rose-200' : 'text-[#f1d6ff]'}`}>
            {journeyPhase === 'standard' ? intimacyPercent : luxuryIntimacyPercent}%
          </strong>
        </div>
        <div className="relative h-3 overflow-hidden rounded-full border border-white/10 bg-black/35">
          <motion.div
            initial={false}
            animate={{ width: `${intimacyPercent}%` }}
            transition={{ duration: shouldReduceMotion ? 0.08 : 0.7, ease: 'easeOut' }}
            role="progressbar"
            aria-label={`Tim hồng ${intimacyPercent} phần trăm`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={intimacyPercent}
            className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,#fb7185,#f9a8d4,#e2c275)] shadow-[0_0_18px_rgba(251,113,133,.35)]"
          />
          {journeyPhase !== 'standard' && (
            <motion.div
              initial={false}
              animate={{ width: `${luxuryIntimacyPercent}%` }}
              transition={{ duration: shouldReduceMotion ? 0.08 : 0.8, ease: 'easeOut' }}
              role="progressbar"
              aria-label={`Tim Luxury ${luxuryIntimacyPercent} phần trăm`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={luxuryIntimacyPercent}
              className="luxury-heart-fill absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,#e8a48c,#d7b1ff,#f4e8ff,#cda95c)] shadow-[0_0_20px_rgba(215,177,255,.5)]"
            />
          )}
        </div>
      </section>

      <section
        aria-label="Tỉ lệ xuất hiện thẻ ở lượt hiện tại"
        className="mt-3 grid gap-2 border-b border-white/[0.07] px-1 pb-3 text-[10px] text-neutral-400 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-4 sm:text-xs"
      >
        <div className="flex items-center gap-2 font-semibold text-neutral-300">
          <Percent className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
          <span>Tỉ lệ lượt này</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:justify-end">
          {journeyPhase === 'standard' ? (
            <>
              <span>Sự thật <strong className="text-blue-200">{chance(drawProbabilities.types.truth)}</strong></span>
              <span>Thử thách <strong className="text-rose-200">{chance(drawProbabilities.types.dare)}</strong></span>
              <span aria-hidden="true" className="hidden text-white/15 sm:inline">|</span>
              {DIFFICULTY_STARS.map((star) => (
                <span key={star} className={drawProbabilities.stars[star] <= 0 ? 'opacity-35' : ''}>
                  {star}★ <strong className="text-amber-200">{chance(drawProbabilities.stars[star])}</strong>
                </span>
              ))}
            </>
          ) : POSITION_DIFFICULTY_STARS.map((star) => (
            <span key={star} className={luxuryDrawProbabilities.stars[star] <= 0 ? 'opacity-25' : ''}>
              {star}★ <strong className="text-[#ead2ff]">{chance(luxuryDrawProbabilities.stars[star])}</strong>
            </span>
          ))}
        </div>
      </section>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {drawError || liveMessage || `${currentPlayer.name} đang tới lượt, còn ${getPresentGarmentSlots(outfitStates[currentPlayerIndex]).length} món đồ.`}
      </p>

      {drawError && (
        <div className="mx-auto mt-3 max-w-xl rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2.5 text-center text-xs font-medium text-amber-200" role="status">
          {drawError}
        </div>
      )}

      <AnimatePresence>
        {(unlockNotice || intimacyGainNotice) && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            role="status"
            className="mx-auto mt-3 flex max-w-md items-center gap-2 rounded-full border border-emerald-400/35 bg-emerald-950/80 px-4 py-2 text-xs font-semibold text-emerald-100 shadow-[0_0_22px_rgba(52,211,153,.12)]"
          >
            <LockOpen className="h-4 w-4 shrink-0 text-emerald-300" />
            {intimacyGainNotice || unlockNotice}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="game-outfit-mobile" aria-label="Trang phục hiện tại của hai người chơi">
        <PlayerOutfitStatus player={player1} outfitState={outfitStates[0]} active={currentPlayerIndex === 0} mobile />
        <PlayerOutfitStatus player={player2} outfitState={outfitStates[1]} active={currentPlayerIndex === 1} mobile />
      </div>

      {/* MAIN GAME TABLE AREA */}
      <div className="game-table-stage my-auto py-6">
        <div className="game-outfit-desktop">
          <PlayerOutfitStatus player={player1} outfitState={outfitStates[0]} active={currentPlayerIndex === 0} />
        </div>
        <div className="game-table-stage__center">
        {journeyPhase === 'position_consent' && (
          <motion.section
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            aria-labelledby="position-consent-title"
            className="position-gate w-full max-w-md overflow-hidden rounded-[1.75rem] border border-[#e2c275]/40 bg-[linear-gradient(160deg,rgba(7,11,24,.98),rgba(16,34,64,.94))] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,.45)]"
          >
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[#e2c275]/50 bg-[#e2c275]/10 text-2xl text-[#f7e7b0]">
              ✦
            </div>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.24em] text-[#e2c275]/75">Mốc 100%</p>
            <h2 id="position-consent-title" className="mt-2 font-serif-romantic text-3xl font-bold text-[#fff4d6]">
              Bộ Tư thế đã mở
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-xs leading-relaxed text-slate-300">
              Chỉ tiếp tục nếu cả hai vẫn tự nguyện. Mỗi lá đều có thể bỏ qua, đổi ý hoặc dừng mà không bị phạt.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={onFinishGame}
                className="min-h-12 rounded-full border border-white/15 bg-black/20 px-4 text-xs font-semibold text-slate-300 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                Kết thúc tại đây
              </button>
              <button
                type="button"
                onClick={handleEnterPositionJourney}
                className="min-h-12 rounded-full bg-[linear-gradient(135deg,#f7e7b0,#cda95c)] px-4 text-xs font-bold text-[#08101f] shadow-[0_0_24px_rgba(226,194,117,.25)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f7e7b0] motion-reduce:transform-none"
              >
                Cả hai đồng ý, tiếp tục
              </button>
            </div>
            <p className="mt-4 text-[10px] font-medium text-[#f7e7b0]/65">Nghe “Dừng” là dừng ngay.</p>
          </motion.section>
        )}

        {(journeyPhase === 'position' || journeyPhase === 'final') && !activeCard && drawState === 'idle' && (
          <section className="w-full max-w-md rounded-[1.5rem] border border-[#d7b1ff]/25 bg-[linear-gradient(160deg,rgba(10,12,25,.96),rgba(35,20,46,.9))] p-6 text-center" aria-labelledby="position-empty-title">
            <Heart className="mx-auto h-10 w-10 text-[#e8a48c]" aria-hidden="true" />
            <h2 id="position-empty-title" className="mt-3 font-serif-romantic text-2xl font-bold text-[#f1d6ff]">Chưa có lá phù hợp</h2>
            <p className="mt-2 text-xs leading-relaxed text-neutral-400">{drawError || 'Bạn có thể bổ sung thẻ Tư thế trong Developer hoặc kết thúc ván an toàn.'}</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={onOpenCollection} className="min-h-12 rounded-full border border-[#d7b1ff]/25 px-4 text-xs font-semibold text-[#ead2ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7b1ff]">Mở Developer</button>
              <button type="button" onClick={onFinishGame} className="min-h-12 rounded-full bg-[linear-gradient(135deg,#f4e8ff,#e8a48c)] px-4 text-xs font-bold text-[#120717] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4e8ff]">Kết thúc ván</button>
            </div>
          </section>
        )}

        {/* MODE A: IDLE / DRAW DECK VIEW */}
        {journeyPhase === 'standard' && drawState === 'idle' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center max-w-md w-full"
          >
            {/* 3D Stacked Tarot Card Deck */}
            <div className="relative w-56 h-80 sm:w-64 sm:h-92 my-6 cursor-pointer group" onClick={handleStartDraw}>
              {/* Stack effect layers */}
              <div className="absolute inset-0 rounded-2xl bg-neutral-900 border border-amber-500/20 shadow-2xl transform -rotate-6 translate-y-2 opacity-50"></div>
              <div className="absolute inset-0 rounded-2xl bg-neutral-900 border border-amber-500/30 shadow-2xl transform rotate-3 -translate-y-1 opacity-70"></div>

              {/* Top Card Back with Metallic Gold Filigree Pattern */}
              <motion.div
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ duration: 0.3 }}
                className="relative w-full h-full rounded-2xl p-4 bg-gradient-to-br from-[#2a0e14] via-[#1a080d] to-[#0d0407] border-4 border-[#D4AF37] gold-glow flex flex-col items-center justify-between overflow-hidden"
              >
                {/* Filigree corner decorations */}
                <div className="absolute top-2 left-2 text-[#D4AF37] opacity-80 text-xs">✦</div>
                <div className="absolute top-2 right-2 text-[#D4AF37] opacity-80 text-xs">✦</div>
                <div className="absolute bottom-2 left-2 text-[#D4AF37] opacity-80 text-xs">✦</div>
                <div className="absolute bottom-2 right-2 text-[#D4AF37] opacity-80 text-xs">✦</div>

                {/* Inner Pattern Frame */}
                <div className="w-full h-full border-2 border-[#D4AF37]/50 rounded-xl p-3 flex flex-col items-center justify-between card-pattern">
                  <div className="text-[#D4AF37] text-xs tracking-[0.2em] serif-title font-bold uppercase">
                    TRUTH OR DARE
                  </div>

                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500/20 via-rose-500/20 to-[#7A1F2B]/40 border-2 border-[#D4AF37] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                    <Flame className="w-8 h-8 text-[#D4AF37] drop-shadow-[0_0_12px_rgba(212,175,55,0.8)]" />
                  </div>

                  <div className="text-[#FF6B9D] text-xs tracking-[0.2em] serif-title pink-glow uppercase font-medium">
                    CẶP ĐÔI
                  </div>
                </div>
              </motion.div>
            </div>

            <p className="text-sm text-neutral-300 font-light mb-6 flex items-center gap-1.5 justify-center">
              <span>Đến lượt</span>
              <span className="font-bold text-amber-300">{currentPlayer.name}</span>
              <span>rút lá bài tình yêu</span>
            </p>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStartDraw}
              className="px-8 py-3.5 rounded-full font-bold text-base text-neutral-950 bg-gold-gradient shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:shadow-[0_0_30px_rgba(255,107,157,0.5)] transition-all cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5 fill-neutral-950" />
              <span>Rút Bài Ngay</span>
            </motion.button>
          </motion.div>
        )}

        {/* MODE B: SELECT TYPE (If Choose mode is active) */}
        {journeyPhase === 'standard' && drawState === 'selecting_type' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center max-w-md w-full glass-wine rounded-3xl p-6 border border-amber-500/30"
          >
            <h3 className="font-serif-romantic text-2xl font-bold text-amber-300 mb-2">
              Lựa Chọn Của {currentPlayer.name}
            </h3>
            <p className="text-xs text-neutral-300 mb-6">
              Bạn muốn chọn câu hỏi Sự Thật hay nhận thử thách Thách?
            </p>

            <div className="grid grid-cols-2 gap-4 w-full">
              <motion.button
                whileHover={availableDrawTypes.includes('truth') ? { scale: 1.03 } : undefined}
                whileTap={availableDrawTypes.includes('truth') ? { scale: 0.97 } : undefined}
                disabled={!availableDrawTypes.includes('truth')}
                onClick={() => executeDrawCard('truth')}
                className="p-5 rounded-2xl bg-gradient-to-b from-blue-950/80 to-indigo-950/80 border border-blue-400/50 hover:border-blue-300 flex flex-col items-center gap-2 cursor-pointer shadow-lg disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-blue-400/50"
              >
                <HelpCircle className="w-8 h-8 text-blue-300" />
                <span className="font-serif-romantic font-bold text-lg text-white">Sự Thật</span>
                <span className="text-[10px] text-blue-200">
                  {availableDrawTypes.includes('truth') ? 'Trả lời thành thật' : 'Không còn thẻ phù hợp'}
                </span>
              </motion.button>

              <motion.button
                whileHover={availableDrawTypes.includes('dare') ? { scale: 1.03 } : undefined}
                whileTap={availableDrawTypes.includes('dare') ? { scale: 0.97 } : undefined}
                disabled={!availableDrawTypes.includes('dare')}
                onClick={() => executeDrawCard('dare')}
                className="p-5 rounded-2xl bg-gradient-to-b from-rose-950/80 to-red-950/80 border border-rose-400/50 hover:border-rose-300 flex flex-col items-center gap-2 cursor-pointer shadow-lg disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-rose-400/50"
              >
                <Zap className="w-8 h-8 text-rose-300" />
                <span className="font-serif-romantic font-bold text-lg text-white">Thử Thách</span>
                <span className="text-[10px] text-rose-200">
                  {availableDrawTypes.includes('dare') ? 'Thực hiện hành động' : 'Không còn thẻ phù hợp'}
                </span>
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* MODE C: SHUFFLING ANIMATION */}
        {journeyPhase === 'standard' && drawState === 'shuffling' && (
          <div className="flex flex-col items-center py-12">
            <motion.div
              animate={{
                rotateY: [0, 180, 360],
                rotateZ: [-5, 5, -5],
                scale: [1, 1.1, 1],
              }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
              className="w-48 h-72 rounded-2xl bg-gradient-to-br from-amber-600 to-rose-900 border-2 border-amber-300 shadow-2xl flex items-center justify-center"
            >
              <Sparkles className="w-12 h-12 text-amber-200 animate-spin" />
            </motion.div>
            <p className="mt-6 text-sm text-amber-300 font-serif-romantic italic animate-pulse">
              Đang xáo trộn các lá bài bí mật...
            </p>
          </div>
        )}

        {/* MODE D: DRAWN CARD 3D FLIP DISPLAY */}
        {(drawState === 'drawing' || drawState === 'drawn') && activeCard && (
          <div className="w-full max-w-md flex flex-col items-center">
            {/* 3D Perspective Card Container */}
            <div className="perspective-1000 w-full my-2">
              <motion.div
                initial={{ rotateY: 180, scale: 0.8 }}
                animate={{
                  rotateY: cardFlipped ? 0 : 180,
                  scale: 1,
                }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="transform-style-3d relative w-full"
                style={{ minHeight: '420px' }}
              >
                {/* CARD BACK SIDE */}
                <div className="backface-hidden absolute inset-0 rotate-y-180 rounded-2xl p-6 bg-gradient-to-br from-[#2a0e14] via-[#1a080d] to-[#0d0407] border-2 border-[#D4AF37] shadow-2xl flex flex-col items-center justify-center">
                  <Flame className="w-16 h-16 text-amber-400 animate-pulse" />
                </div>

                {/* CARD FRONT SIDE - New Design */}
                <div className={`backface-hidden absolute inset-0 game-card ${
                  isFinalPositionCard
                    ? 'card-position-rare'
                    : isPositionCard
                      ? 'card-position'
                      : `card-${activeCard.level}`
                } ${!isPositionCard && activeCard.level !== 'gentle' ? 'card-wave-pattern' : ''}`}
                  style={{ borderRadius: '16px' }}
                >
                  {/* Corner decorations for intimate/passionate */}
                  {!isFinalPositionCard && activeCard.level !== 'gentle' && (
                    <>
                      <span className="card-corner-deco top-2 left-2.5">♠ ♥</span>
                      <span className="card-corner-deco top-2 right-2.5">♦ ♣</span>
                      <span className="card-corner-deco bottom-2 left-2.5">♥ ♠</span>
                      <span className="card-corner-deco bottom-2 right-2.5">♣ ♦</span>
                    </>
                  )}

                  <div className="card-content-layer flex flex-col h-full p-5 sm:p-6">
                    {/* Card Header Tag & Level */}
                    <div className="flex items-start justify-between gap-2 pb-3 border-b border-white/10">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {isPositionCard && activeCard.position ? (
                          <>
                            <span className="rounded-full border border-[#e2c275]/45 bg-[#e2c275]/10 px-3 py-1 text-xs font-bold text-[#f7e7b0]">
                              ✦ {getPositionFamilyLabel(activeCard).toUpperCase()}
                            </span>
                            <span className="rounded-full border border-white/15 bg-black/20 px-2.5 py-1 text-[10px] text-slate-200">
                              {POSITION_RECIPIENT_LABELS[activeCard.position.recipient]}
                            </span>
                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                              isFinalPositionCard
                                ? 'border-[#e8a48c]/55 bg-[#d7b1ff]/10 text-[#f4e8ff]'
                                : 'border-[#e2c275]/35 bg-[#e2c275]/10 text-[#f7e7b0]'
                            }`}>
                              {derivePositionDifficultyStars(activeCard)}★
                            </span>
                          </>
                        ) : (
                          <>
                            <span
                              className={`text-xs px-3 py-1 rounded-full border font-semibold ${
                                activeCard.type === 'truth'
                                  ? 'bg-blue-950/80 text-blue-300 border-blue-500/40'
                                  : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                              }`}
                            >
                              {activeCard.type === 'truth' ? '🔍 SỰ THẬT' : '⚡ THỬ THÁCH'}
                            </span>
                            <span className={`text-xs px-2.5 py-1 rounded-full border ${LEVEL_INFO[activeCard.level].badgeBg}`}>
                              {LEVEL_INFO[activeCard.level].icon} {LEVEL_INFO[activeCard.level].name}
                            </span>
                            <span className="rounded-full border border-amber-300/25 bg-amber-300/[0.07] px-2 py-1 text-[10px] font-semibold text-amber-200">
                              {isPositionCard ? derivePositionDifficultyStars(activeCard) : deriveDifficultyStars(activeCard)}★
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] text-neutral-300">
                              {AUDIENCE_LABELS[getCardAudience(activeCard)]}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Favorite heart toggle */}
                      <button
                        onClick={() => onToggleFavorite(activeCard.id)}
                        className="p-1.5 rounded-full hover:bg-neutral-800/50 transition-colors"
                        title={isFavorited ? 'Bỏ yêu thích' : 'Yêu thích lá bài này'}
                      >
                        <Heart
                          className={`w-5 h-5 transition-transform ${
                            isFavorited
                              ? 'text-rose-500 fill-rose-500 scale-110'
                              : 'text-neutral-500 hover:text-rose-400'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Targeted Player Prompt */}
                    <div className="my-2 text-center">
                      <span className="text-xs text-amber-200/80 uppercase tracking-widest font-medium">
                        {isPositionCard ? 'Thẻ chung:' : 'Lượt thực hiện:'}
                      </span>
                      <span className="ml-2 font-serif-romantic font-bold text-amber-300 text-base">
                        {isPositionCard && activeCard.position
                          ? POSITION_RECIPIENT_LABELS[activeCard.position.recipient]
                          : `${currentPlayer.name} ${currentPlayer.avatar}`}
                      </span>
                    </div>

                    {/* Card Content with Icon */}
                    <div className="my-auto py-4 flex flex-col items-center justify-center text-center">
                      {!isRevealed ? (
                        <div className="flex flex-col items-center py-6 px-4">
                          <EyeOff className="w-10 h-10 text-amber-400 mb-3 opacity-80" />
                          <p className="text-xs text-neutral-400 mb-4 max-w-xs">
                            Nội dung lá bài đã được bảo mật. Bấm vào nút bên dưới khi bạn đã sẵn sàng!
                          </p>
                          <button
                            onClick={() => {
                              soundEngine.playTick();
                              setIsRevealed(true);
                            }}
                            className="px-5 py-2.5 rounded-full bg-amber-500/20 border border-amber-400 text-amber-200 text-xs font-semibold hover:bg-amber-500/30 transition-all flex items-center gap-2 cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                            <span>Xem Nội Dung</span>
                          </button>
                        </div>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-4 flex flex-col items-center"
                        >
                          {/* Card Icon (custom image or SVG) */}
                          {activeCard.customImage ? (
                            <div className={`card-icon-wrapper-lg card-custom-icon-wrapper ${isFinalPositionCard ? 'mythic-icon-aura' : ''}`}>
                              <img
                                src={activeCard.customImage}
                                alt="icon"
                                className="card-custom-icon w-full h-full object-contain"
                              />
                            </div>
                          ) : (() => {
                            const iconName = activeCard.icon || autoAssignIcon(activeCard.content);
                            const IconComp = getCardIcon(iconName);
                            return IconComp ? (
                              <div className={`card-icon-wrapper-lg card-icon-color ${isFinalPositionCard ? 'mythic-icon-aura' : ''}`}>
                                <IconComp className="w-full h-full" />
                              </div>
                            ) : null;
                          })()}

                          <p className="text-sm sm:text-base text-white font-medium leading-relaxed max-w-sm">
                            {activeCard.content}
                          </p>
                          {activeCard.hint && (
                            <p className="text-xs text-rose-300/80 italic font-light">
                              💡 Gợi ý: {activeCard.hint}
                            </p>
                          )}
                        </motion.div>
                      )}
                    </div>

                    {/* Countdown Timer (If active) */}
                    {timerSeconds !== null && isRevealed && (
                        <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                          <div
                            className={`flex items-center gap-2 text-xs ${timerSeconds === 0 ? 'text-rose-300' : 'text-amber-300'}`}
                          >
                            <TimerIcon
                              className={`w-4 h-4 ${timerSeconds === 0 ? 'text-rose-400' : `text-amber-400 ${isTimerRunning && !shouldReduceMotion ? 'animate-pulse' : ''}`}`}
                            />
                            <span>{timerSeconds === 0 ? 'Hết giờ:' : 'Thời gian:'}</span>
                            <span className={`font-bold text-base ${timerSeconds === 0 ? 'text-rose-200' : 'text-white'}`}>
                              {timerSeconds === 0 ? 'Reng reng!' : timerSeconds !== null ? `${timerSeconds}s` : '--'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={handleTimerControl}
                            aria-label={timerSeconds === 0 ? 'Đếm lại thời gian thử thách' : isTimerRunning ? 'Tạm dừng đếm giờ' : 'Bắt đầu đếm giờ'}
                            className="flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800/60 px-3 py-1 text-xs text-neutral-200 hover:text-white"
                          >
                            {timerSeconds === 0 && <RotateCcw className="h-3 w-3" aria-hidden="true" />}
                            {timerSeconds === 0 ? 'Đếm lại' : isTimerRunning ? 'Tạm dừng' : 'Bắt đầu đếm'}
                          </button>
                        </div>
                      )}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* ACTION BUTTONS (Hoàn Thành / Chưa hoàn thành) */}
            {drawState === 'drawn' && isRevealed && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full flex items-center justify-center gap-3 mt-4"
              >
                {isFinalPositionCard ? (
                  <button
                    type="button"
                    onClick={onFinishGame}
                    className="min-h-12 w-full rounded-full bg-[linear-gradient(135deg,#f4e8ff,#e8a48c)] px-5 text-sm font-bold text-[#120717] shadow-[0_0_28px_rgba(232,164,140,.3)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4e8ff] motion-reduce:transform-none"
                  >
                    Đã xem · Kết thúc ván
                  </button>
                ) : isPositionCard ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handlePositionAdvance(false)}
                      className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border border-white/15 bg-black/25 px-4 text-xs font-semibold text-slate-300 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                    >
                      <XCircle className="h-4 w-4" aria-hidden="true" /> Bỏ qua
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePositionAdvance(true)}
                      className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#f7e7b0,#cda95c)] px-4 text-xs font-bold text-[#08101f] shadow-[0_0_20px_rgba(226,194,117,.22)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f7e7b0] motion-reduce:transform-none"
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {completionActionLabel}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleSkip}
                      className="flex-1 py-3 px-4 rounded-full bg-neutral-900/90 border border-neutral-700 text-neutral-300 hover:text-white hover:border-neutral-500 transition-all font-medium text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4 text-neutral-400" />
                      <span>{activeCard.type === 'truth' ? 'Sai / Không trả lời' : 'Không thực hiện'}</span>
                    </button>

                    <button
                      onClick={handleComplete}
                      className="flex-1 py-3 px-4 rounded-full bg-gold-gradient text-neutral-950 font-bold text-xs sm:text-sm shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:shadow-[0_0_25px_rgba(255,107,157,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 fill-neutral-950 text-gold-gradient" />
                      <span>{completionActionLabel}</span>
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </div>
        )}
        </div>
        <div className="game-outfit-desktop">
          <PlayerOutfitStatus player={player2} outfitState={outfitStates[1]} active={currentPlayerIndex === 1} />
        </div>
      </div>

      {/* FOOTER: Quick Player Scores */}
      <div className="w-full flex items-center justify-around py-2 px-4 glass-dark rounded-xl border border-neutral-800 text-xs text-neutral-300">
        <div className="flex items-center gap-2">
          <span>{player1.avatar}</span>
          <span className="font-semibold text-rose-300">{player1.name}:</span>
          <span>{player1.completedCount} hoàn thành</span>
        </div>
        <div className="h-4 w-px bg-neutral-800" />
        <div className="flex items-center gap-2">
          <span>{player2.avatar}</span>
          <span className="font-semibold text-amber-300">{player2.name}:</span>
          <span>{player2.completedCount} hoàn thành</span>
        </div>
      </div>

      <AnimatePresence>
        {showPenaltyPrompt && activeCard && (
          <PenaltyPrompt
            playerName={currentPlayer.name}
            playerAvatar={currentPlayer.avatar}
            cardType={activeCard.type}
            penaltyEnabled={settings.penaltyClothingEnabled}
            canRemoveGarment={canApplyPenaltyGarment}
            onReturn={() => setShowPenaltyPrompt(false)}
            onChooseGarment={handlePenaltyGarmentChoice}
            onContinueWithoutPenalty={finalizeSkippedTurn}
          />
        )}
      </AnimatePresence>

      {removalRequest && (
        <GarmentRemovalDialog
          targetName={removalRequest.targetIndex === 0 ? player1.name : player2.name}
          outfitState={outfitStates[removalRequest.targetIndex]}
          source={removalRequest.source}
          onConfirm={handleConfirmRemoval}
          onCancel={handleCancelRemoval}
          onContinueWithoutRemoval={handleContinueWithoutRemoval}
        />
      )}
      {showSwapDialog && (
        <GarmentSwapDialog
          playerNames={[player1.name, player2.name]}
          outfitStates={outfitStates}
          onConfirm={handleConfirmSwap}
          onCancel={() => setShowSwapDialog(false)}
        />
      )}
    </div>
  );
};
