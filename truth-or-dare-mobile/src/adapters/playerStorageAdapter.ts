/**
 * Player storage — adapted for React Native using AsyncStorage.
 * Re-exports pure logic from shared and adds async load/save.
 */
import type { Player } from '@/shared/types';
import { storage, safeJsonParse } from './asyncStorageAdapter';

export { DEFAULT_PLAYER_1, DEFAULT_PLAYER_2, hydratePlayer } from '@/shared/utils/playerStorage';

import { hydratePlayer, DEFAULT_PLAYER_1 } from '@/shared/utils/playerStorage';

/**
 * Async version of loadStoredPlayer — uses AsyncStorage instead of localStorage.
 */
export const loadStoredPlayerAsync = async (
  key: string,
  fallback: Player,
): Promise<Player> => {
  const raw = await storage.getItem(key);
  return hydratePlayer(safeJsonParse(raw), fallback);
};

/**
 * Save a player to AsyncStorage.
 */
export const savePlayerAsync = async (
  key: string,
  player: Player,
): Promise<void> => {
  await storage.setItem(key, JSON.stringify(player));
};
