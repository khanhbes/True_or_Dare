/**
 * AsyncStorage adapter — provides the same localStorage-like API used by
 * the web app, backed by @react-native-async-storage/async-storage.
 *
 * All methods are async (unlike web localStorage which is sync), so callers
 * that depend on synchronous access should be refactored to await.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  multiGet(keys: string[]): Promise<readonly [string, string | null][]>;
  multiSet(pairs: readonly [string, string][]): Promise<void>;
  multiRemove(keys: string[]): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
  clear(): Promise<void>;
}

export const storage: StorageAdapter = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
  multiGet: (keys) => AsyncStorage.multiGet(keys),
  multiSet: (pairs) => AsyncStorage.multiSet(pairs as [string, string][]),
  multiRemove: (keys) => AsyncStorage.multiRemove(keys),
  getAllKeys: () => AsyncStorage.getAllKeys(),
  clear: () => AsyncStorage.clear(),
};

/**
 * Safe JSON parse helper — returns null on failure instead of throwing.
 */
export const safeJsonParse = <T>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

/**
 * Load a JSON value from storage with a fallback.
 */
export const loadJsonFromStorage = async <T>(
  key: string,
  fallback: T,
): Promise<T> => {
  const raw = await storage.getItem(key);
  const parsed = safeJsonParse<T>(raw);
  return parsed ?? fallback;
};

/**
 * Save a JSON value to storage. Returns true on success.
 */
export const saveJsonToStorage = async (
  key: string,
  value: unknown,
): Promise<boolean> => {
  try {
    await storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};
