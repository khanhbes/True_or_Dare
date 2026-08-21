import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_PLAYER_1, hydratePlayer } from './playerStorage';

test('player hydration restores each malformed field without trusting stored JSON shape', () => {
  assert.deepEqual(hydratePlayer([], DEFAULT_PLAYER_1), DEFAULT_PLAYER_1);
  const hydrated = hydratePlayer({
    name: '  Người chơi '.repeat(10),
    avatar: 42,
    color: 'pink',
    completedCount: Infinity,
    skippedCount: -2,
  }, DEFAULT_PLAYER_1);
  assert.equal(hydrated.name.length, 40);
  assert.equal(hydrated.avatar, DEFAULT_PLAYER_1.avatar);
  assert.equal(hydrated.color, DEFAULT_PLAYER_1.color);
  assert.equal(hydrated.completedCount, 0);
  assert.equal(hydrated.skippedCount, 0);
});

test('player hydration normalizes valid colors and integer counters', () => {
  const player = hydratePlayer({ name: ' Mai ', avatar: '🌸', color: '#aabbcc', completedCount: 2.9, skippedCount: 1 }, DEFAULT_PLAYER_1);
  assert.deepEqual(player, { name: 'Mai', avatar: '🌸', color: '#AABBCC', completedCount: 2, skippedCount: 1 });
});
