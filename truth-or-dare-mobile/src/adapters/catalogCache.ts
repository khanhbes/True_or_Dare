/**
 * Catalog cache adapter — replaces the web's IndexedDB-based catalog cache
 * with AsyncStorage for React Native.
 *
 * Stores the last-known-good cloud catalog snapshot as a JSON string.
 */
import { storage, safeJsonParse } from './asyncStorageAdapter';
import type { CatalogPayload } from '@/shared/utils/cardSchema';

const CACHE_KEY = 'tod_cloud_catalog_cache';
const CACHE_ETAG_KEY = 'tod_cloud_catalog_etag';

export const catalogCache = {
  async get(): Promise<CatalogPayload | null> {
    const raw = await storage.getItem(CACHE_KEY);
    return safeJsonParse<CatalogPayload>(raw);
  },

  async set(payload: CatalogPayload): Promise<void> {
    await storage.setItem(CACHE_KEY, JSON.stringify(payload));
  },

  async clear(): Promise<void> {
    await storage.removeItem(CACHE_KEY);
    await storage.removeItem(CACHE_ETAG_KEY);
  },

  async getEtag(): Promise<string | null> {
    return storage.getItem(CACHE_ETAG_KEY);
  },

  async setEtag(etag: string): Promise<void> {
    await storage.setItem(CACHE_ETAG_KEY, etag);
  },
};
