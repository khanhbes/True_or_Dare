import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { compareCollectionCards } from '../src/utils/cardOrdering';
import { INITIAL_CARDS } from '../src/data/cards';
import { mergeEditedSystemCard } from '../src/utils/cardSelection';
import { parseCatalogPayload } from '../src/utils/cardSchema';

const DEFAULT_ORIGIN = 'https://staging.true-or-dare-couples.pages.dev';
const sha256 = (value: Uint8Array | string): string =>
  createHash('sha256').update(value).digest('hex');

const extensionFor = (mimeType: string): string => {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/svg+xml') return 'svg';
  return mimeType.split('/')[1] || 'bin';
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Converts the pre-migration Luxury config (stars 1–5) into its 6–10 ladder. */
const migrateLegacyLuxuryConfig = (value: unknown): unknown => {
  if (!isRecord(value) || !Array.isArray(value.bands)) return value;
  return {
    ...value,
    bands: value.bands.map((band) => {
      if (!isRecord(band) || !isRecord(band.starWeights)) return band;
      const weights = band.starWeights;
      const legacyHasWeights = [1, 2, 3, 4, 5].some((star) => Number(weights[String(star)]) > 0);
      if (!legacyHasWeights) return band;
      return {
        ...band,
        starWeights: Object.fromEntries([6, 7, 8, 9, 10].map((star) => [
          star,
          weights[String(star - 5)] ?? 0,
        ])),
      };
    }),
  };
};

const sourceOrigin = new URL(process.argv[2] || DEFAULT_ORIGIN).origin;
const outputRoot = path.resolve(process.argv[3] || 'data/catalog');
const catalogUrl = new URL('/api/catalog', sourceOrigin);
const response = await fetch(catalogUrl, { headers: { accept: 'application/json' } });
if (!response.ok) throw new Error(`Không tải được catalog cloud: HTTP ${response.status}`);

const rawPayload = await response.json();
const payload = parseCatalogPayload(isRecord(rawPayload)
  ? { ...rawPayload, luxuryProgressionConfig: migrateLegacyLuxuryConfig(rawPayload.luxuryProgressionConfig) }
  : rawPayload);
if (!payload) throw new Error('Catalog cloud không đúng schema; giữ nguyên snapshot local hiện tại.');

const overrides = new Map(payload.editedCards.map((card) => [card.id, card]));
const deleted = new Set(payload.deletedSystemCardIds);
const cards = [
  ...INITIAL_CARDS.filter((card) => !deleted.has(card.id)).map((card) =>
    mergeEditedSystemCard(card, overrides.get(card.id))),
  ...payload.customCards,
].sort(compareCollectionCards);
payload.customCards.sort(compareCollectionCards);
payload.editedCards.sort(compareCollectionCards);
if (INITIAL_CARDS.length !== 108) throw new Error('Số thẻ hệ thống canonical không còn là 108.');
if (new Set(cards.map((card) => card.id)).size !== cards.length) {
  throw new Error('Catalog sau merge có ID thẻ trùng; giữ nguyên snapshot local hiện tại.');
}

const assetById = new Map(payload.assets.map((asset) => [asset.id, asset]));
for (const card of [...payload.customCards, ...payload.editedCards]) {
  if (card.customImageId && !assetById.has(card.customImageId)) {
    throw new Error(`Thẻ ${card.id} tham chiếu ảnh không tồn tại: ${card.customImageId}`);
  }
}

const assetRoot = path.join(outputRoot, 'assets');
await mkdir(assetRoot, { recursive: true });
const checksums: Record<string, string> = {};
const localAssets = [] as Array<{ id: string; sha256: string; mimeType: string; size: number }>;

for (const asset of payload.assets) {
  const extension = extensionFor(asset.mimeType);
  const relativeFilename = `assets/${asset.sha256}.${extension}`;
  const localFilename = path.join(outputRoot, relativeFilename);
  let bytes: Uint8Array | null = null;
  try {
    const existing = new Uint8Array(await readFile(localFilename));
    if (existing.length === asset.size && sha256(existing) === asset.sha256) bytes = existing;
  } catch {
    // Missing or unreadable local assets are downloaded and verified below.
  }
  if (!bytes) {
    const assetUrl = new URL(asset.url, sourceOrigin);
    if (assetUrl.origin !== sourceOrigin) throw new Error(`Asset khác origin bị từ chối: ${asset.id}`);
    const assetResponse = await fetch(assetUrl);
    if (!assetResponse.ok) throw new Error(`Không tải được ảnh ${asset.id}: HTTP ${assetResponse.status}`);
    bytes = new Uint8Array(await assetResponse.arrayBuffer());
    if (bytes.length !== asset.size || sha256(bytes) !== asset.sha256) {
      throw new Error(`Checksum ảnh cloud không đúng: ${asset.id}`);
    }
    await writeFile(localFilename, bytes);
  }
  checksums[relativeFilename] = asset.sha256;
  localAssets.push({ id: asset.id, sha256: asset.sha256, mimeType: asset.mimeType, size: asset.size });
}

const bundle = {
  schemaVersion: payload.schemaVersion,
  createdAt: payload.updatedAt,
  sourceOrigin,
  customCards: payload.customCards,
  editedCards: payload.editedCards,
  deletedSystemCardIds: payload.deletedSystemCardIds,
  progressionConfig: payload.progressionConfig,
  luxuryProgressionConfig: payload.luxuryProgressionConfig,
  assets: localAssets,
};
const catalogBytes = Buffer.from(JSON.stringify({
  schemaVersion: payload.schemaVersion,
  sourceCreatedAt: payload.updatedAt,
  sourceDatasetRevision: payload.datasetRevision,
  systemCardCount: INITIAL_CARDS.length,
  visibleCardCount: cards.length,
  cards,
}, null, 2));
const seedBytes = Buffer.from(JSON.stringify(bundle, null, 2));
await writeFile(path.join(outputRoot, 'catalog.json'), catalogBytes);
await writeFile(path.join(outputRoot, 'seed-bundle.json'), seedBytes);
checksums['catalog.json'] = sha256(catalogBytes);
checksums['seed-bundle.json'] = sha256(seedBytes);

await writeFile(path.join(outputRoot, 'manifest.json'), JSON.stringify({
  format: 'true-or-dare-local-catalog',
  version: 1,
  generatedAt: new Date().toISOString(),
  sourceOrigin,
  datasetRevision: payload.datasetRevision,
  counts: {
    systemCards: INITIAL_CARDS.length,
    customCards: payload.customCards.length,
    overrides: payload.editedCards.length,
    deletedSystemCards: payload.deletedSystemCardIds.length,
    visibleCards: cards.length,
    assets: payload.assets.length,
  },
  checksums,
}, null, 2));

console.log(JSON.stringify({
  sourceOrigin,
  outputRoot,
  datasetRevision: payload.datasetRevision,
  visibleCards: cards.length,
  assets: payload.assets.length,
}));
