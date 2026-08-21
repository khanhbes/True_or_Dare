import type { CardItem } from '../types';

const DATABASE_NAME = 'truth-or-dare-card-assets';
const DATABASE_VERSION = 1;
const STORE_NAME = 'card-images';

export interface CardImageStore {
  put(id: string, value: Blob): Promise<void>;
  get(id: string): Promise<Blob | null>;
  delete(id: string): Promise<void>;
}

const requestResult = <T,>(request: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
});

const openDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  if (typeof indexedDB === 'undefined') {
    reject(new Error('Trình duyệt không hỗ trợ IndexedDB'));
    return;
  }
  const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(STORE_NAME)) {
      request.result.createObjectStore(STORE_NAME);
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error('Không thể mở kho ảnh'));
});

const withStore = async <T,>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const database = await openDatabase();
  try {
    return await requestResult(operation(database.transaction(STORE_NAME, mode).objectStore(STORE_NAME)));
  } finally {
    database.close();
  }
};

export const browserCardImageStore: CardImageStore = {
  async put(id, value) {
    await withStore('readwrite', (store) => store.put(value, id));
  },
  async get(id) {
    const value = await withStore<Blob | undefined>('readonly', (store) => store.get(id));
    return value instanceof Blob ? value : null;
  },
  async delete(id) {
    await withStore('readwrite', (store) => store.delete(id));
  },
};

const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error('Không thể đọc dữ liệu ảnh');
  return response.blob();
};

const blobToDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error ?? new Error('Không thể hiển thị ảnh đã lưu'));
  reader.readAsDataURL(blob);
});

const createImageId = (cardId: string) => `card-image:${cardId}`;

export interface PreparedCardsResult {
  cards: CardItem[];
  errors: string[];
}

/**
 * Stores new/legacy base64 images before returning localStorage-safe card
 * metadata. If IndexedDB fails, the original base64 field is retained so no
 * user image is silently lost.
 */
export const prepareCardsForStorage = async (
  cards: readonly CardItem[],
  store: CardImageStore = browserCardImageStore,
): Promise<PreparedCardsResult> => {
  const errors: string[] = [];
  const prepared = await Promise.all(cards.map(async (card) => {
    if (!card.customImage?.startsWith('data:image/')) return { ...card };
    const imageId = card.customImageId || createImageId(card.id);
    try {
      await store.put(imageId, await dataUrlToBlob(card.customImage));
      const next = { ...card, customImageId: imageId };
      delete next.customImage;
      return next;
    } catch {
      errors.push(`Không thể chuyển ảnh của lá “${card.content.slice(0, 32)}” sang kho ảnh.`);
      return { ...card };
    }
  }));
  return { cards: prepared, errors };
};

export const hydrateCardImages = async (
  cards: readonly CardItem[],
  store: CardImageStore = browserCardImageStore,
): Promise<PreparedCardsResult> => {
  const errors: string[] = [];
  const hydrated = await Promise.all(cards.map(async (card) => {
    if (card.customImage || !card.customImageId) return { ...card };
    try {
      const blob = await store.get(card.customImageId);
      if (!blob) return { ...card };
      return { ...card, customImage: await blobToDataUrl(blob) };
    } catch {
      errors.push(`Không thể tải ảnh của lá “${card.content.slice(0, 32)}”.`);
      return { ...card };
    }
  }));
  return { cards: hydrated, errors };
};
