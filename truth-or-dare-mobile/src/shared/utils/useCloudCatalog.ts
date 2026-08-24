/**
 * useCloudCatalog — Task 8: Cloud catalog sync hook.
 * Fetches from Cloudflare, caches locally via AsyncStorage, merges with INITIAL_CARDS.
 * Refreshes when app returns to foreground.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CardItem } from '../types';
import { INITIAL_CARDS } from '../data/cards';
import { fetchCloudCatalogIfChanged } from './cloudCatalog';
import type { CatalogPayload } from './cardSchema';

type SyncMode = 'loading' | 'cloud' | 'offline' | 'error';
interface SyncStatus {
  mode: SyncMode;
  datasetRevision: number;
  updatedAt?: string;
}

const CACHE_KEY = 'cloud_catalog_cache_v1';
const REVISION_KEY = 'cloud_catalog_revision_v1';

interface CachedCatalog {
  payload: CatalogPayload;
  cachedAt: number;
}

function mergeCatalog(payload: CatalogPayload): CardItem[] {
  const deletedIds = new Set(payload.deletedSystemCardIds);
  const editedById = new Map(payload.editedCards.map((c) => [c.id, c]));

  const baseMerged: CardItem[] = INITIAL_CARDS
    .filter((c) => !deletedIds.has(c.id))
    .map((c) => editedById.get(c.id) ?? c);

  // Add custom cards (those not already in INITIAL_CARDS)
  const systemIds = new Set(INITIAL_CARDS.map((c) => c.id));
  const customCards = payload.customCards.filter((c) => !systemIds.has(c.id));

  return [...baseMerged, ...customCards];
}

export function useCloudCatalog() {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    mode: 'loading',
    datasetRevision: 0,
  });
  const isSyncing = useRef(false);

  const sync = useCallback(async () => {
    if (isSyncing.current) return;
    isSyncing.current = true;

    try {
      // Load cached revision
      const cachedRevisionStr = await AsyncStorage.getItem(REVISION_KEY);
      const cachedRevision = cachedRevisionStr ? parseInt(cachedRevisionStr, 10) : 0;

      // Load cached payload as fallback
      const cachedStr = await AsyncStorage.getItem(CACHE_KEY);
      let cachedPayload: CatalogPayload | null = null;
      if (cachedStr) {
        try {
          const parsed = JSON.parse(cachedStr) as CachedCatalog;
          cachedPayload = parsed.payload;
        } catch {}
      }

      // Attempt fetch
      let payload: CatalogPayload | null = null;
      try {
        payload = await fetchCloudCatalogIfChanged(cachedRevision);
      } catch {
        // Network error — use cache
        if (cachedPayload) {
          setCards(mergeCatalog(cachedPayload));
          setSyncStatus({ mode: 'offline', datasetRevision: cachedRevision });
        } else {
          // No cache, fall back to INITIAL_CARDS
          setCards([]);
          setSyncStatus({ mode: 'offline', datasetRevision: 0 });
        }
        return;
      }

      if (payload === null) {
        // 304 Not Modified — use cache
        if (cachedPayload) {
          setCards(mergeCatalog(cachedPayload));
          setSyncStatus({ mode: 'cloud', datasetRevision: cachedRevision, updatedAt: cachedPayload.updatedAt });
        }
        return;
      }

      // New payload received — update cache
      const cacheEntry: CachedCatalog = { payload, cachedAt: Date.now() };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheEntry));
      await AsyncStorage.setItem(REVISION_KEY, String(payload.datasetRevision));

      setCards(mergeCatalog(payload));
      setSyncStatus({
        mode: 'cloud',
        datasetRevision: payload.datasetRevision,
        updatedAt: payload.updatedAt,
      });
    } catch {
      setSyncStatus((prev) => ({ ...prev, mode: 'error' }));
    } finally {
      isSyncing.current = false;
    }
  }, []);

  // Initial sync
  useEffect(() => {
    // Defer the first sync until after this render commits. The sync routine updates
    // local state once the cache/network request resolves.
    const timeoutId = setTimeout(() => {
      void sync();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [sync]);

  // Refresh on foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        sync();
      }
    });
    return () => subscription.remove();
  }, [sync]);

  return { cards, syncStatus, refresh: sync };
}
