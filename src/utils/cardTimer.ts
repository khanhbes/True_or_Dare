export const CARD_TIMER_MIN_SECONDS = 1;
export const CARD_TIMER_MAX_SECONDS = 3600;

export type TimerEligibleCard = {
  type: string;
  timerSeconds?: unknown;
};

export type CardTimerSettings = {
  enableTimer?: boolean;
  timerDuration?: number;
  truthTimerEnabled?: boolean;
  truthTimerDuration?: number;
  dareTimerEnabled?: boolean;
  dareTimerDuration?: number;
};

/**
 * Returns a safe per-card countdown duration, or null when the stored value
 * should not start a timer. Numeric strings, fractions and out-of-range values
 * are intentionally rejected instead of being silently coerced.
 */
export const normalizeCardTimerSeconds = (value: unknown): number | null => {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < CARD_TIMER_MIN_SECONDS ||
    value > CARD_TIMER_MAX_SECONDS
  ) {
    return null;
  }

  return value;
};

/**
 * Resolves a card override first, then the default for its type. `null` is an
 * explicit per-card opt-out; `undefined` inherits the current game setting.
 */
export const resolveCardTimerSeconds = (
  card: TimerEligibleCard | null | undefined,
  settings: CardTimerSettings,
): number | null => {
  if (!card || (card.type !== 'truth' && card.type !== 'dare')) return null;
  if (card.timerSeconds === null) return null;

  const isTruth = card.type === 'truth';
  const enabled = isTruth
    ? (settings.truthTimerEnabled ?? false)
    : (settings.dareTimerEnabled ?? settings.enableTimer ?? false);
  if (!enabled) return null;

  const override = normalizeCardTimerSeconds(card.timerSeconds);
  if (override !== null) return override;

  return normalizeCardTimerSeconds(
    isTruth
      ? settings.truthTimerDuration
      : (settings.dareTimerDuration ?? settings.timerDuration),
  );
};
