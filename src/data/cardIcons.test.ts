import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { INITIAL_CARDS } from './cards';

const iconSourcePath = fileURLToPath(new URL('../components/CardIcons.tsx', import.meta.url));
const iconSource = readFileSync(iconSourcePath, 'utf8');
const iconMapBody = iconSource.match(/const ICON_MAP:[\s\S]*?= \{([\s\S]*?)\n\};/)?.[1] ?? '';
const iconNames = new Set(
  Array.from(iconMapBody.matchAll(/^\s{2}([a-z0-9_]+):/gm), (match) => match[1]),
);

const curatedIconAssignments: Record<string, string> = {
  'g-t-3': 'mirror',
  'g-t-5': 'location',
  'g-t-7': 'playful_attention',
  'g-d-7': 'love_song_poem',
  'i-t-5': 'body',
  'i-t-6': 'music_perfume',
  'i-d-3': 'collarbone_trace',
  'p-t-2': 'romantic_outfit',
  'p-t-3': 'location',
  'p-t-4': 'body_kiss',
  'p-t-5': 'eyes_voice',
  'p-d-1': 'triple_kiss',
  'p-d-3': 'unbutton_back_caress',
  'p-d-4': 'blindfold_kiss',
  'p-d-6': 'ice_back_trace',
};

test('every built-in card has an explicit icon registered in the catalog', () => {
  const missingIcons = INITIAL_CARDS
    .filter((card) => !card.icon || !iconNames.has(card.icon))
    .map((card) => `${card.id}:${card.icon ?? 'missing'}`);

  assert.deepEqual(missingIcons, []);
});

test('content-specific cards keep their curated icon assignments', () => {
  for (const [cardId, expectedIcon] of Object.entries(curatedIconAssignments)) {
    const card = INITIAL_CARDS.find(({ id }) => id === cardId);
    assert.ok(card, `Missing built-in card ${cardId}`);
    assert.equal(card.icon, expectedIcon, `${cardId} should use ${expectedIcon}`);
  }
});
