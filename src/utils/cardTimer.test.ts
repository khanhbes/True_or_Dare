import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CARD_TIMER_MAX_SECONDS,
  CARD_TIMER_MIN_SECONDS,
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

test('resolves a timer only for a timed dare while the master switch is enabled', () => {
  assert.equal(resolveCardTimerSeconds({ type: 'dare', timerSeconds: 45 }, true), 45);
  assert.equal(resolveCardTimerSeconds({ type: 'dare', timerSeconds: 45 }, false), null);
  assert.equal(resolveCardTimerSeconds({ type: 'truth', timerSeconds: 45 }, true), null);
  assert.equal(resolveCardTimerSeconds({ type: 'dare' }, true), null);
  assert.equal(resolveCardTimerSeconds({ type: 'dare', timerSeconds: null }, true), null);
  assert.equal(resolveCardTimerSeconds({ type: 'dare', timerSeconds: 0 }, true), null);
  assert.equal(resolveCardTimerSeconds(null, true), null);
});
