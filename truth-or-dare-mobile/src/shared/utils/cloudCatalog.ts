/**
 * Cloud catalog utilities for React Native.
 *
 * Shares the same Cloudflare API as the web app. IndexedDB and
 * browserCardImageStore are replaced with AsyncStorage (catalogCache adapter)
 * and expo-file-system (fileSystemImageStore adapter).
 *
 * Set EXPO_PUBLIC_API_URL in your .env file.
 */
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { CardItem, LuxuryProgressionConfig, ProgressionConfig } from '../types';
import { parseCatalogPayload, type CatalogPayload } from './cardSchema';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? '';

export type CatalogSyncMode = 'loading' | 'cloud' | 'offline' | 'local' | 'draft' | 'error';

export interface CatalogSyncStatus {
  mode: CatalogSyncMode;
  datasetRevision: number;
  updatedAt?: string;
  lastBackupAt?: string | null;
  message?: string;
}

export interface CatalogMutationResult {
  datasetRevision: number;
}

export interface RecoveryBundle {
  schemaVersion: number;
  createdAt: string;
  sourceOrigin?: string;
  customCards: CardItem[];
  editedCards: CardItem[];
  deletedSystemCardIds: string[];
  progressionConfig: ProgressionConfig;
  luxuryProgressionConfig: LuxuryProgressionConfig;
  assets: Array<{
    id: string;
    sha256: string;
    mimeType: string;
    size: number;
    dataBase64?: string;
  }>;
}

const apiError = async (response: Response): Promise<Error> => {
  try {
    const value = await response.json() as { message?: string; code?: string };
    return new Error(value.message || value.code || `HTTP ${response.status}`);
  } catch {
    return new Error(`HTTP ${response.status}`);
  }
};

export const fetchCloudCatalog = async (): Promise<CatalogPayload> => {
  const response = await fetch(`${API_BASE}/api/catalog`, {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw await apiError(response);
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('API catalog chưa được cấu hình trên môi trường này');
  }
  const payload = parseCatalogPayload(await response.json());
  if (!payload) throw new Error('Cloud trả về catalog sai cấu trúc; cache cũ được giữ nguyên');
  return payload;
};

export const fetchCloudCatalogIfChanged = async (
  currentRevision: number,
): Promise<CatalogPayload | null> => {
  const response = await fetch(`${API_BASE}/api/catalog`, {
    headers: {
      accept: 'application/json',
      'if-none-match': `"catalog-${currentRevision}"`,
    },
  });
  if (response.status === 304) return null;
  if (!response.ok) throw await apiError(response);
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('API catalog chưa được cấu hình trên môi trường này');
  }
  const payload = parseCatalogPayload(await response.json());
  if (!payload) throw new Error('Cloud trả về catalog sai cấu trúc; cache cũ được giữ nguyên');
  return payload;
};

/**
 * Hydrates cloud catalog images by downloading them from R2 and storing
 * them via the provided nativeCardImageStore.
 *
 * imageStore interface: { get(id): Promise<string|null>, put(id, dataUrl): Promise<void> }
 */
export const hydrateCloudCatalogImages = async (
  payload: CatalogPayload,
  imageStore: { get(id: string): Promise<string | null>; put(id: string, dataUrl: string): Promise<void> },
  hydrateCardImages: (cards: readonly CardItem[]) => Promise<{ cards: CardItem[]; errors: string[] }>,
): Promise<CatalogPayload> => {
  const assetById = new Map(payload.assets.map((asset) => [asset.id, asset]));
  const referencedIds = new Set(
    [...payload.customCards, ...payload.editedCards]
      .map((card) => card.customImageId)
      .filter((id): id is string => Boolean(id)),
  );
  const pendingIds = Array.from(referencedIds);
  let cursor = 0;
  const worker = async () => {
    while (cursor < pendingIds.length) {
      const id = pendingIds[cursor++];
      if (await imageStore.get(id)) continue;
      const asset = assetById.get(id);
      if (!asset) throw new Error(`Thiếu metadata ảnh ${id}`);
      const response = await fetch(asset.url);
      if (!response.ok) throw new Error(`Không thể tải ảnh ${id}`);
      // Convert blob to base64 data URL for file system storage
      const arrayBuffer = await response.arrayBuffer();
      const base64 = _arrayBufferToBase64(arrayBuffer);
      const dataUrl = `data:${asset.mimeType};base64,${base64}`;
      await imageStore.put(id, dataUrl);
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, pendingIds.length) }, () => worker()));
  const [custom, edited] = await Promise.all([
    hydrateCardImages(payload.customCards),
    hydrateCardImages(payload.editedCards),
  ]);
  if (custom.errors.length || edited.errors.length) {
    throw new Error(custom.errors[0] || edited.errors[0]);
  }
  return { ...payload, customCards: custom.cards, editedCards: edited.cards };
};

const _arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  return btoa(binary);
};

const sha256 = async (bytes: Uint8Array): Promise<string> => Array.from(
  new Uint8Array(await crypto.subtle.digest('SHA-256', bytes.buffer as ArrayBuffer)),
).map((value) => value.toString(16).padStart(2, '0')).join('');

const adminJson = async <T>(url: string, init: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${url}`, {
    ...init,
    headers: { accept: 'application/json', 'content-type': 'application/json', ...init.headers },
  });
  if (!response.ok) throw await apiError(response);
  return response.json() as Promise<T>;
};

export const saveCloudCard = async (
  card: CardItem,
  kind: 'custom' | 'system_override',
  expectedRevision: number,
): Promise<{ card: CardItem; datasetRevision: number }> => {
  // On mobile, images are already stored as data URLs — upload if present
  let prepared = { ...card };
  let nextRevision = expectedRevision;
  if (card.customImage?.startsWith('data:image/')) {
    const base64Data = card.customImage.split(',')[1] ?? '';
    const mimeType = card.customImage.split(';')[0].split(':')[1] ?? 'image/png';
    const byteChars = atob(base64Data);
    const byteArray = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
    const response = await fetch(`${API_BASE}/api/admin/assets`, {
      method: 'POST',
      headers: {
        'content-type': mimeType,
        'if-match': String(expectedRevision),
      },
      body: byteArray,
    });
    if (!response.ok) throw await apiError(response);
    const result = await response.json() as { id: string; datasetRevision: number; created: boolean };
    prepared = { ...prepared, customImageId: result.id };
    delete prepared.customImage;
    if (result.created) nextRevision = result.datasetRevision;
  }

  const result = await adminJson<CatalogMutationResult>(`/api/admin/cards/${encodeURIComponent(card.id)}`, {
    method: 'PUT',
    body: JSON.stringify({
      card: prepared,
      kind,
      expectedRevision: nextRevision,
    }),
  });
  return {
    card: card.customImage ? { ...prepared, customImage: card.customImage } : prepared,
    datasetRevision: result.datasetRevision,
  };
};

export const deleteCloudCard = async (
  cardId: string,
  kind: 'custom' | 'system',
  expectedRevision: number,
): Promise<CatalogMutationResult> => adminJson(
  `/api/admin/cards/${encodeURIComponent(cardId)}?kind=${kind}`,
  { method: 'DELETE', headers: { 'if-match': String(expectedRevision) } },
);

export const saveCloudConfig = async (
  key: 'progression' | 'luxury_progression',
  value: ProgressionConfig | LuxuryProgressionConfig,
  expectedRevision: number,
): Promise<CatalogMutationResult> => adminJson(`/api/admin/config/${key}`, {
  method: 'PUT',
  body: JSON.stringify({ value, expectedRevision }),
});

export const createCloudBackup = async (): Promise<{ id: string; datasetRevision: number }> =>
  adminJson('/api/admin/backups', { method: 'POST', body: '{}' });

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  return btoa(binary);
};

export const exportCatalogZip = async (payload: CatalogPayload): Promise<Blob> => {
  const files: Record<string, Uint8Array> = {};
  const assets: RecoveryBundle['assets'] = [];
  for (const asset of payload.assets) {
    const response = await fetch(asset.url);
    if (!response.ok) throw new Error(`Không thể tải ảnh ${asset.id} để backup`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (await sha256(bytes) !== asset.sha256) throw new Error(`Checksum ảnh ${asset.id} không khớp`);
    const extension = asset.mimeType === 'image/jpeg' ? 'jpg' : asset.mimeType.split('/')[1] || 'bin';
    files[`assets/${asset.sha256}.${extension}`] = bytes;
    assets.push({ id: asset.id, sha256: asset.sha256, mimeType: asset.mimeType, size: bytes.length });
  }
  const bundle: RecoveryBundle = {
    schemaVersion: payload.schemaVersion,
    createdAt: new Date().toISOString(),
    sourceOrigin: API_BASE,
    customCards: payload.customCards.map(({ customImage: _image, ...card }) => card),
    editedCards: payload.editedCards.map(({ customImage: _image, ...card }) => card),
    deletedSystemCardIds: payload.deletedSystemCardIds,
    progressionConfig: payload.progressionConfig as ProgressionConfig,
    luxuryProgressionConfig: payload.luxuryProgressionConfig as LuxuryProgressionConfig,
    assets,
  };
  const bundleBytes = strToU8(JSON.stringify(bundle, null, 2));
  files['bundle.json'] = bundleBytes;
  files['manifest.json'] = strToU8(JSON.stringify({
    format: 'todbackup',
    version: 1,
    createdAt: bundle.createdAt,
    datasetRevision: payload.datasetRevision,
    counts: payload.counts,
    checksums: {
      'bundle.json': await sha256(bundleBytes),
      ...Object.fromEntries(assets.map((asset) => {
        const extension = asset.mimeType === 'image/jpeg' ? 'jpg' : asset.mimeType.split('/')[1] || 'bin';
        return [`assets/${asset.sha256}.${extension}`, asset.sha256];
      })),
    },
  }, null, 2));
  return new Blob([zipSync(files, { level: 6 })], { type: 'application/zip' });
};

export const readCatalogZip = async (file: Blob): Promise<RecoveryBundle> => {
  const files = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const manifestBytes = files['manifest.json'];
  const bundleBytes = files['bundle.json'];
  if (!manifestBytes || !bundleBytes) throw new Error('Backup thiếu manifest.json hoặc bundle.json');
  const manifest = JSON.parse(strFromU8(manifestBytes)) as { checksums?: Record<string, string> };
  if (!manifest.checksums || typeof manifest.checksums !== 'object') throw new Error('Backup thiếu bảng checksum');
  for (const [name, expected] of Object.entries(manifest.checksums)) {
    const bytes = files[name];
    if (!bytes || await sha256(bytes) !== expected) throw new Error(`Checksum không khớp: ${name}`);
  }
  const bundle = JSON.parse(strFromU8(bundleBytes)) as RecoveryBundle;
  if (!Array.isArray(bundle.assets) || !Array.isArray(bundle.customCards) || !Array.isArray(bundle.editedCards)) {
    throw new Error('Backup sai cấu trúc');
  }
  for (const asset of bundle.assets) {
    const prefix = `assets/${asset.sha256}.`;
    const entry = Object.entries(files).find(([name]) => name.startsWith(prefix));
    if (!entry) throw new Error(`Backup thiếu ảnh ${asset.id}`);
    if (await sha256(entry[1]) !== asset.sha256 || entry[1].length !== asset.size) {
      throw new Error(`Ảnh ${asset.id} sai checksum`);
    }
    asset.dataBase64 = bytesToBase64(entry[1]);
  }
  return bundle;
};

export const importCloudBackup = async (
  bundle: RecoveryBundle,
  options: { dryRun: boolean; replace: boolean },
): Promise<{ valid?: boolean; imported?: boolean; datasetRevision?: number; counts: CatalogPayload['counts'] }> =>
  adminJson('/api/admin/import', {
    method: 'POST',
    body: JSON.stringify({ bundle, ...options }),
  });
