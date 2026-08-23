import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { CardItem, LuxuryProgressionConfig, ProgressionConfig } from '../types';
import { browserCardImageStore, hydrateCardImages } from './cardImageStore';
import { parseCatalogPayload, type CatalogPayload } from './cardSchema';

const CACHE_DATABASE = 'truth-or-dare-cloud-catalog';
const CACHE_STORE = 'snapshots';
const CACHE_KEY = 'last-known-good';

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

const openCache = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  if (typeof indexedDB === 'undefined') {
    reject(new Error('Trình duyệt không hỗ trợ IndexedDB'));
    return;
  }
  const request = indexedDB.open(CACHE_DATABASE, 1);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(CACHE_STORE)) {
      request.result.createObjectStore(CACHE_STORE);
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error('Không thể mở cache catalog'));
});

const runCacheRequest = async <T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const database = await openCache();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = operation(database.transaction(CACHE_STORE, mode).objectStore(CACHE_STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Không thể truy cập cache catalog'));
    });
  } finally {
    database.close();
  }
};

export const catalogCache = {
  async get(): Promise<CatalogPayload | null> {
    const value = await runCacheRequest<unknown>('readonly', (store) => store.get(CACHE_KEY));
    return parseCatalogPayload(value);
  },
  async put(payload: CatalogPayload): Promise<void> {
    const valid = parseCatalogPayload(payload);
    if (!valid) throw new Error('Catalog không hợp lệ nên không thể ghi cache');
    await runCacheRequest('readwrite', (store) => store.put(valid, CACHE_KEY));
  },
};

const apiError = async (response: Response): Promise<Error> => {
  try {
    const value = await response.json() as { message?: string; code?: string };
    return new Error(value.message || value.code || `HTTP ${response.status}`);
  } catch {
    return new Error(`HTTP ${response.status}`);
  }
};

export const fetchCloudCatalog = async (): Promise<CatalogPayload> => {
  const response = await fetch('/api/catalog', {
    headers: { accept: 'application/json' },
    cache: 'no-cache',
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
  const response = await fetch('/api/catalog', {
    headers: {
      accept: 'application/json',
      'if-none-match': `"catalog-${currentRevision}"`,
    },
    cache: 'no-cache',
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

export const hydrateCloudCatalogImages = async (payload: CatalogPayload): Promise<CatalogPayload> => {
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
      if (await browserCardImageStore.get(id)) continue;
      const asset = assetById.get(id);
      if (!asset) throw new Error(`Thiếu metadata ảnh ${id}`);
      const response = await fetch(asset.url, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`Không thể tải ảnh ${id}`);
      await browserCardImageStore.put(id, await response.blob());
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

const toBlob = async (dataUrl: string): Promise<Blob> => {
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error('Không thể đọc ảnh của thẻ');
  return response.blob();
};

export const uploadCardImage = async (
  card: CardItem,
  expectedRevision: number,
): Promise<{ card: CardItem; datasetRevision?: number }> => {
  if (!card.customImage?.startsWith('data:image/')) return { card };
  const blob = await toBlob(card.customImage);
  const response = await fetch('/api/admin/assets', {
    method: 'POST',
    headers: {
      'content-type': blob.type || 'image/png',
      'if-match': String(expectedRevision),
    },
    body: blob,
  });
  if (!response.ok) throw await apiError(response);
  const result = await response.json() as { id: string; datasetRevision: number; created: boolean };
  await browserCardImageStore.put(result.id, blob);
  const next = { ...card, customImageId: result.id };
  delete next.customImage;
  return { card: next, datasetRevision: result.created ? result.datasetRevision : undefined };
};

const adminJson = async <T>(url: string, init: RequestInit): Promise<T> => {
  const response = await fetch(url, {
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
  const uploaded = await uploadCardImage(card, expectedRevision);
  const prepared = uploaded.card;
  const result = await adminJson<CatalogMutationResult>(`/api/admin/cards/${encodeURIComponent(card.id)}`, {
    method: 'PUT',
    body: JSON.stringify({
      card: prepared,
      kind,
      expectedRevision: uploaded.datasetRevision ?? expectedRevision,
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

const sha256 = async (bytes: Uint8Array): Promise<string> => Array.from(
  new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
).map((value) => value.toString(16).padStart(2, '0')).join('');

export const exportCatalogZip = async (payload: CatalogPayload): Promise<Blob> => {
  const files: Record<string, Uint8Array> = {};
  const assets: RecoveryBundle['assets'] = [];
  for (const asset of payload.assets) {
    const response = await fetch(asset.url, { cache: 'force-cache' });
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
    sourceOrigin: window.location.origin,
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

export const exportLocalCatalogZip = async (input: {
  schemaVersion?: number;
  datasetRevision: number;
  customCards: CardItem[];
  editedCards: CardItem[];
  deletedSystemCardIds: string[];
  progressionConfig: ProgressionConfig;
  luxuryProgressionConfig: LuxuryProgressionConfig;
  cloudAssets?: CatalogPayload['assets'];
}): Promise<Blob> => {
  const files: Record<string, Uint8Array> = {};
  const assets: RecoveryBundle['assets'] = [];
  const assetById = new Map((input.cloudAssets ?? []).map((asset) => [asset.id, asset]));
  const collected = new Map<string, { bytes: Uint8Array; mimeType: string; sha256: string }>();

  const prepareCard = async (card: CardItem): Promise<CardItem> => {
    const next = { ...card };
    let imageId = next.customImageId;
    let blob: Blob | null = null;
    if (next.customImage?.startsWith('data:image/')) {
      blob = await toBlob(next.customImage);
      imageId ||= `card-image:${next.id}`;
    } else if (imageId) {
      blob = await browserCardImageStore.get(imageId);
      if (!blob) {
        const cloudAsset = assetById.get(imageId);
        if (cloudAsset) {
          const response = await fetch(cloudAsset.url, { cache: 'force-cache' });
          if (response.ok) blob = await response.blob();
        }
      }
    }
    delete next.customImage;
    if (!imageId) return next;
    if (!blob) throw new Error(`Không thể đọc ảnh ${imageId}; chưa tạo file backup để tránh mất dữ liệu.`);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const digest = await sha256(bytes);
    const previous = collected.get(imageId);
    if (previous && previous.sha256 !== digest) throw new Error(`ID ảnh ${imageId} đang trỏ tới hai nội dung khác nhau.`);
    collected.set(imageId, { bytes, sha256: digest, mimeType: blob.type || 'image/png' });
    next.customImageId = imageId;
    return next;
  };

  const customCards = await Promise.all(input.customCards.map(prepareCard));
  const editedCards = await Promise.all(input.editedCards.map(prepareCard));
  for (const [id, asset] of collected) {
    const extension = asset.mimeType === 'image/jpeg' ? 'jpg' : asset.mimeType.split('/')[1] || 'bin';
    files[`assets/${asset.sha256}.${extension}`] = asset.bytes;
    assets.push({ id, sha256: asset.sha256, mimeType: asset.mimeType, size: asset.bytes.length });
  }
  const createdAt = new Date().toISOString();
  const bundle: RecoveryBundle = {
    schemaVersion: input.schemaVersion ?? 1,
    createdAt,
    sourceOrigin: window.location.origin,
    customCards,
    editedCards,
    deletedSystemCardIds: input.deletedSystemCardIds,
    progressionConfig: input.progressionConfig,
    luxuryProgressionConfig: input.luxuryProgressionConfig,
    assets,
  };
  const counts = {
    customCards: customCards.length,
    editedCards: editedCards.length,
    deletedSystemCards: input.deletedSystemCardIds.length,
    assets: assets.length,
  };
  const bundleBytes = strToU8(JSON.stringify(bundle, null, 2));
  files['bundle.json'] = bundleBytes;
  files['manifest.json'] = strToU8(JSON.stringify({
    format: 'todbackup',
    version: 1,
    createdAt,
    datasetRevision: input.datasetRevision,
    counts,
    source: 'browser-current-state',
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

export const readCatalogZip = async (file: File): Promise<RecoveryBundle> => {
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
