import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { strFromU8, unzipSync } from 'fflate';
import { INITIAL_CARDS } from '../src/data/cards';
import { mergeEditedSystemCard } from '../src/utils/cardSelection';
import type { CardItem } from '../src/types';

interface BackupAsset {
  id: string;
  sha256: string;
  mimeType: string;
  size: number;
}

interface BackupBundle {
  schemaVersion: number;
  createdAt: string;
  customCards: CardItem[];
  editedCards: CardItem[];
  deletedSystemCardIds: string[];
  progressionConfig: unknown;
  luxuryProgressionConfig: unknown;
  assets: BackupAsset[];
}

const sha256 = (bytes: Uint8Array | string): string =>
  createHash('sha256').update(bytes).digest('hex');

const extensionFor = (mimeType: string): string =>
  mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1] || 'bin';

const input = process.argv[2];
const outputRoot = path.resolve(process.argv[3] || 'data/catalog');
if (!input) throw new Error('Usage: tsx scripts/materialize_catalog.ts <backup.zip> [output-dir]');

const archive = unzipSync(new Uint8Array(await readFile(path.resolve(input))));
const bundleBytes = archive['bundle.json'];
const manifestBytes = archive['manifest.json'];
if (!bundleBytes || !manifestBytes) throw new Error('Backup thiếu bundle.json hoặc manifest.json');

const sourceManifest = JSON.parse(strFromU8(manifestBytes)) as { checksums?: Record<string, string> };
for (const [filename, expected] of Object.entries(sourceManifest.checksums || {})) {
  const bytes = archive[filename];
  if (!bytes || sha256(bytes) !== expected) throw new Error(`Checksum nguồn không đúng: ${filename}`);
}

const bundle = JSON.parse(strFromU8(bundleBytes)) as BackupBundle;
const overrides = new Map(bundle.editedCards.map((card) => [card.id, card]));
const deleted = new Set(bundle.deletedSystemCardIds);
const cards = [
  ...INITIAL_CARDS.filter((card) => !deleted.has(card.id)).map((card) =>
    mergeEditedSystemCard(card, overrides.get(card.id))),
  ...bundle.customCards,
];
if (INITIAL_CARDS.length !== 108 || bundle.customCards.length !== 51 ||
    bundle.editedCards.length !== 38 || bundle.deletedSystemCardIds.length !== 2 ||
    bundle.assets.length !== 43 || cards.length !== 157) {
  throw new Error('Số lượng catalog không khớp bộ phục hồi đã xác nhận');
}
if (new Set(cards.map((card) => card.id)).size !== cards.length) throw new Error('Catalog có ID thẻ trùng');

await mkdir(path.join(outputRoot, 'assets'), { recursive: true });
const checksums: Record<string, string> = {};
for (const asset of bundle.assets) {
  const extension = extensionFor(asset.mimeType);
  const filename = `assets/${asset.sha256}.${extension}`;
  const bytes = archive[filename];
  if (!bytes || bytes.length !== asset.size || sha256(bytes) !== asset.sha256) {
    throw new Error(`Ảnh không hợp lệ: ${asset.id}`);
  }
  await writeFile(path.join(outputRoot, filename), bytes);
  checksums[filename] = asset.sha256;
}

const catalogBytes = Buffer.from(JSON.stringify({
  schemaVersion: bundle.schemaVersion,
  sourceCreatedAt: bundle.createdAt,
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
  counts: {
    systemCards: INITIAL_CARDS.length,
    customCards: bundle.customCards.length,
    overrides: bundle.editedCards.length,
    deletedSystemCards: bundle.deletedSystemCardIds.length,
    visibleCards: cards.length,
    assets: bundle.assets.length,
  },
  checksums,
}, null, 2));

console.log(JSON.stringify({ outputRoot, visibleCards: cards.length, assets: bundle.assets.length }));
