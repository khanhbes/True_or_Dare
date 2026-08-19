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

test('resolves per-type defaults, card overrides and explicit opt-out', () => {
  const settings = {
    truthTimerEnabled: true,
    truthTimerDuration: 50,
    dareTimerEnabled: true,
    dareTimerDuration: 35,
  };
  assert.equal(resolveCardTimerSeconds({ type: 'truth' }, settings), 50);
  assert.equal(resolveCardTimerSeconds({ type: 'dare' }, settings), 35);
  assert.equal(resolveCardTimerSeconds({ type: 'truth', timerSeconds: 45 }, settings), 45);
  assert.equal(resolveCardTimerSeconds({ type: 'dare', timerSeconds: 60 }, settings), 60);
  assert.equal(resolveCardTimerSeconds({ type: 'truth', timerSeconds: null }, settings), null);
  assert.equal(resolveCardTimerSeconds({ type: 'dare', timerSeconds: null }, settings), null);
  assert.equal(resolveCardTimerSeconds(null, settings), null);
});

test('disabled types stay disabled and legacy dare settings still hydrate at runtime', () => {
  assert.equal(resolveCardTimerSeconds(
    { type: 'truth', timerSeconds: 45 },
    { truthTimerEnabled: false, truthTimerDuration: 30 },
  ), null);
  assert.equal(resolveCardTimerSeconds(
    { type: 'dare' },
    { enableTimer: true, timerDuration: 20 },
  ), 20);
  assert.equal(resolveCardTimerSeconds(
    { type: 'dare', timerSeconds: 45 },
    { enableTimer: false, timerDuration: 20 },
  ), null);
});
