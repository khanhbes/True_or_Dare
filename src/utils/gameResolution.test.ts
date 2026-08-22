import assert from 'node:assert/strict';
import test from 'node:test';
import type { CardResolutionEvent } from '../types';
import {
  EMPTY_POSITION_SESSION_STATS,
  appendCardResolutionEvent,
  applyPositionResolution,
  recordPositionDraw,
  recordPositionOpen,
} from './gameResolution';

const event = (status: CardResolutionEvent['status'], id: string = status): CardResolutionEvent => ({
  id,
  cardId: 'card-1',
  playerIndex: 0,
  status,
  deck: 'position',
  round: 1,
  timestamp: 1,
});

test('draw, content open and resolution are counted as separate Position milestones', () => {
  let stats = recordPositionDraw({ ...EMPTY_POSITION_SESSION_STATS });
  assert.deepEqual(stats, { drawn: 1, opened: 0, completed: 0, skipped: 0 });
  stats = recordPositionOpen(stats);
  stats = applyPositionResolution(stats, event('completed'));
  assert.deepEqual(stats, { drawn: 1, opened: 1, completed: 1, skipped: 0 });
  stats = applyPositionResolution(stats, event('skipped'));
  assert.deepEqual(stats, { drawn: 1, opened: 1, completed: 1, skipped: 1 });
});

test('a card resolution event can only be committed once', () => {
  const completed = event('completed', 'same-resolution');
  const once = appendCardResolutionEvent([], completed);
  const twice = appendCardResolutionEvent(once, completed);
  assert.equal(once.length, 1);
  assert.equal(twice.length, 1);
});

test('pass and reroll resolutions do not count as completed or skipped Position cards', () => {
  const initial = { ...EMPTY_POSITION_SESSION_STATS };
  assert.equal(applyPositionResolution(initial, event('passed')), initial);
  assert.equal(applyPositionResolution(initial, event('rerolled')), initial);
});
