/**
 * File-system based image store — replaces the web's IndexedDB card image
 * store with expo-file-system for React Native.
 *
 * Images are stored as files in the app's documentDirectory under
 * `card-images/` directory.
 */
import * as FileSystem from 'expo-file-system';
import type { CardItem } from '@/shared/types';

// expo-file-system v2+ exports documentDirectory as a module-level export
const documentDirectory: string =
  (FileSystem as unknown as { documentDirectory?: string }).documentDirectory ??
  (FileSystem as unknown as Record<string, unknown>)['documentDirectory'] as string ??
  '';

const IMAGE_DIR = `${documentDirectory}card-images/`;

/** Ensure the image directory exists. */
const ensureDir = async (): Promise<void> => {
  const info = await FileSystem.getInfoAsync(IMAGE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
  }
};

/** Sanitize ID to a safe filename. */
const toFilename = (id: string): string =>
  id.replace(/[^a-zA-Z0-9_-]/g, '_');

export interface CardImageStore {
  put(id: string, dataUrl: string): Promise<void>;
  get(id: string): Promise<string | null>;
  delete(id: string): Promise<void>;
}

/**
 * React Native card image store using expo-file-system.
 * Stores images as base64-encoded files on disk.
 */
export const nativeCardImageStore: CardImageStore = {
  async put(id: string, dataUrl: string): Promise<void> {
    await ensureDir();
    const path = `${IMAGE_DIR}${toFilename(id)}`;
    await FileSystem.writeAsStringAsync(path, dataUrl, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  },

  async get(id: string): Promise<string | null> {
    try {
      const path = `${IMAGE_DIR}${toFilename(id)}`;
      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists) return null;
      return await FileSystem.readAsStringAsync(path, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    } catch {
      return null;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const path = `${IMAGE_DIR}${toFilename(id)}`;
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) {
        await FileSystem.deleteAsync(path);
      }
    } catch {
      // Silently ignore delete failures
    }
  },
};

const createImageId = (cardId: string) => `card-image:${cardId}`;

export interface PreparedCardsResult {
  cards: CardItem[];
  errors: string[];
}

/**
 * Stores new/legacy base64 images to file system before returning
 * storage-safe card metadata.
 */
export const prepareCardsForStorage = async (
  cards: readonly CardItem[],
  store: CardImageStore = nativeCardImageStore,
): Promise<PreparedCardsResult> => {
  const errors: string[] = [];
  const prepared = await Promise.all(
    cards.map(async (card) => {
      if (!card.customImage?.startsWith('data:image/')) return { ...card };
      const imageId = card.customImageId || createImageId(card.id);
      try {
        await store.put(imageId, card.customImage);
        const next = { ...card, customImageId: imageId };
        delete next.customImage;
        return next;
      } catch {
        errors.push(
          `Không thể chuyển ảnh của lá "${card.content.slice(0, 32)}" sang kho ảnh.`,
        );
        return { ...card };
      }
    }),
  );
  return { cards: prepared, errors };
};

/**
 * Hydrates cards by loading images from file system back into
 * base64 data URLs.
 */
export const hydrateCardImages = async (
  cards: readonly CardItem[],
  store: CardImageStore = nativeCardImageStore,
): Promise<PreparedCardsResult> => {
  const errors: string[] = [];
  const hydrated = await Promise.all(
    cards.map(async (card) => {
      if (card.customImage || !card.customImageId) return { ...card };
      try {
        const dataUrl = await store.get(card.customImageId);
        if (!dataUrl) return { ...card };
        return { ...card, customImage: dataUrl };
      } catch {
        errors.push(
          `Không thể tải ảnh của lá "${card.content.slice(0, 32)}".`,
        );
        return { ...card };
      }
    }),
  );
  return { cards: hydrated, errors };
};
