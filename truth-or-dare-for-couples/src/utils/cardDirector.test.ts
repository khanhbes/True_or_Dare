import assert from 'node:assert/strict';
import test from 'node:test';
import type { CardItem } from '../types';
import { chooseDirectedCard, createCardDirectorState, getCardHeat, getDirectorWeights, recordDirectedCard } from './cardDirector';
import { createOutfitState, DEFAULT_GAME_SETTINGS } from './wardrobe';

const card = (id: string, type: 'truth' | 'dare', heat: number): CardItem => ({ id, type, level: 'intimate', content: id, deck: 'standard', progression: { difficultyStars: 3, heat, phaseTag: 'intimate' } });
const outfits = [createOutfitState(DEFAULT_GAME_SETTINGS.outfits[0]), createOutfitState(DEFAULT_GAME_SETTINGS.outfits[1])] as const;

test('director suppresses repeated type and heat spikes while keeping every card sampleable', () => {
  const state = recordDirectedCard(recordDirectedCard(createCardDirectorState(), card('dare-1', 'dare', 4)), card('dare-2', 'dare', 4));
  const candidates = [card('dare-hot', 'dare', 9), card('truth-calm', 'truth', 4)];
  const weights = getDirectorWeights(candidates, state, 0, outfits);
  assert.ok((weights.get('truth-calm') ?? 0) > (weights.get('dare-hot') ?? 0));
  assert.ok(chooseDirectedCard(candidates, weights, () => .999)?.id);
  assert.equal(getCardHeat(card('explicit', 'truth', 7)), 7);
});
