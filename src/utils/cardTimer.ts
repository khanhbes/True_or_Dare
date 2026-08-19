export const CARD_TIMER_MIN_SECONDS = 1;
export const CARD_TIMER_MAX_SECONDS = 3600;

export type TimerEligibleCard = {
  type: string;
  timerSeconds?: unknown;
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
 * The global setting is a master switch. A countdown only exists for a dare
 * that explicitly carries a valid, positive per-card duration.
 */
export const resolveCardTimerSeconds = (
  card: TimerEligibleCard | null | undefined,
  isTimerEnabled: boolean,
): number | null => {
  if (!isTimerEnabled || card?.type !== 'dare') return null;
  return normalizeCardTimerSeconds(card.timerSeconds);
};
