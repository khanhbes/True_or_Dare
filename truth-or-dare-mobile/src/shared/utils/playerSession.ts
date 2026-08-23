/**
 * Player session utilities for React Native.
 *
 * Calls the same Cloudflare Worker API as the web app so the admin dashboard
 * can track both web and mobile players in one place.
 *
 * Set EXPO_PUBLIC_API_URL in your .env file (e.g.
 * https://truth-or-dare-for-couples.pages.dev).
 */

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? '';

export interface PlayerSession {
  loggedIn: boolean;
  displayName?: string;
}

export interface AdminPlayerStats {
  online: number;
  activeToday: number;
  total: number;
  measuredAt: string;
  recent: Array<{
    display_name: string;
    first_seen_at: string;
    last_seen_at: string;
    login_count: number;
    online: number;
  }>;
}

const readJson = async <T>(response: Response): Promise<T> => {
  const body = await response.json().catch(() => null) as T | { error?: { message?: string } } | null;
  if (!response.ok) {
    const message = body && typeof body === 'object' && 'error' in body
      ? body.error?.message
      : undefined;
    throw new Error(message || `HTTP ${response.status}`);
  }
  if (!body) throw new Error('API phiên người chơi chưa được cấu hình trên môi trường này.');
  return body as T;
};

export const getPlayerSession = async (): Promise<PlayerSession> =>
  readJson(await fetch(`${API_BASE}/api/player/session`, { cache: 'no-store' }));

export const loginPlayer = async (displayName: string): Promise<PlayerSession> =>
  readJson(await fetch(`${API_BASE}/api/player/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ displayName }),
  }));

export const heartbeatPlayer = async (): Promise<void> => {
  const response = await fetch(`${API_BASE}/api/player/heartbeat`, {
    method: 'POST',
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
};

export const logoutPlayer = async (): Promise<void> => {
  await fetch(`${API_BASE}/api/player/logout`, { method: 'POST' });
};

export const fetchAdminPlayerStats = async (): Promise<AdminPlayerStats> =>
  readJson(await fetch(`${API_BASE}/api/admin/players`, { cache: 'no-store' }));
