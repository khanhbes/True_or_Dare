export const CARD_TIMER_MIN_SECONDS = 1;
export const CARD_TIMER_MAX_SECONDS = 3600;
export const DEFAULT_CARD_TIMER_SECONDS = 60;

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
 * Resolves a card override first. `null` is an explicit per-card opt-out;
 * missing or malformed metadata receives the game-wide 60 second default.
 */
export const resolveCardTimerSeconds = (
  card: TimerEligibleCard | null | undefined,
): number | null => {
  if (!card || (card.type !== 'truth' && card.type !== 'dare')) return null;
  if (card.timerSeconds === null) return null;

  const override = normalizeCardTimerSeconds(card.timerSeconds);
  if (override !== null) return override;
  return DEFAULT_CARD_TIMER_SECONDS;
};
