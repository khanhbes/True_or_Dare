import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CARD_TIMER_MAX_SECONDS,
  CARD_TIMER_MIN_SECONDS,
  DEFAULT_CARD_TIMER_SECONDS,
  normalizeCardTimerSeconds,
  resolveCardTimerSeconds,
} from './cardTimer';

test('normalizes only positive integer durations inside the supported range', () => {
  assert.equal(normalizeCardTimerSeconds(CARD_TIMER_MIN_SECONDS), 1);
  assert.equal(normalizeCardTimerSeconds(30), 30);
  assert.equal(normalizeCardTimerSeconds(CARD_TIMER_MAX_SECONDS), 3600);

  for (const value of [undefined, null, 0, -1, 1.5, 3601, Number.NaN, Number.POSITIVE_INFINITY, '30']) {
    assert.equal(normalizeCardTimerSeconds(value), null, String(value));
  }
});

test('resolves the 60 second default, card overrides and explicit opt-out', () => {
  assert.equal(resolveCardTimerSeconds({ type: 'truth' }), DEFAULT_CARD_TIMER_SECONDS);
  assert.equal(resolveCardTimerSeconds({ type: 'dare' }), DEFAULT_CARD_TIMER_SECONDS);
  assert.equal(resolveCardTimerSeconds({ type: 'truth', timerSeconds: 45 }), 45);
  assert.equal(resolveCardTimerSeconds({ type: 'dare', timerSeconds: 90 }), 90);
  assert.equal(resolveCardTimerSeconds({ type: 'truth', timerSeconds: null }), null);
  assert.equal(resolveCardTimerSeconds({ type: 'dare', timerSeconds: null }), null);
  assert.equal(resolveCardTimerSeconds(null), null);
});

test('malformed per-card values fall back to 60 seconds', () => {
  for (const timerSeconds of [0, -1, 1.5, 3601, Number.NaN, Number.POSITIVE_INFINITY, '30']) {
    assert.equal(resolveCardTimerSeconds({ type: 'dare', timerSeconds }), DEFAULT_CARD_TIMER_SECONDS);
  }
});
