import type { Player } from '../types';

export const DEFAULT_PLAYER_1: Player = {
  name: 'Anh', avatar: '👨‍💼', color: '#FF6B9D', completedCount: 0, skippedCount: 0,
};

export const DEFAULT_PLAYER_2: Player = {
  name: 'Em', avatar: '👩‍💼', color: '#D4AF37', completedCount: 0, skippedCount: 0,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const hydratePlayer = (value: unknown, fallback: Player): Player => {
  if (!isRecord(value)) return { ...fallback };
  const safeCount = (candidate: unknown) =>
    typeof candidate === 'number' && Number.isFinite(candidate) && candidate >= 0
      ? Math.floor(candidate)
      : 0;
  return {
    name: typeof value.name === 'string' && value.name.trim() ? value.name.trim().slice(0, 40) : fallback.name,
    avatar: typeof value.avatar === 'string' && value.avatar.trim() ? value.avatar.slice(0, 16) : fallback.avatar,
    color: typeof value.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value.color) ? value.color.toUpperCase() : fallback.color,
    completedCount: safeCount(value.completedCount),
    skippedCount: safeCount(value.skippedCount),
  };
};

export const loadStoredPlayer = (key: string, fallback: Player): Player => {
  try {
    const saved = localStorage.getItem(key);
    return hydratePlayer(saved ? JSON.parse(saved) : null, fallback);
  } catch {
    return { ...fallback };
  }
};
