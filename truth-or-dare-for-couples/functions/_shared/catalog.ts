import type { CardItem } from '../../src/types';
import {
  isLuxuryProgressionConfigValue,
  isProgressionConfigValue,
  isRecord,
  isStoredCard,
  parseStoredCards,
} from '../../src/utils/cardSchema';
import type { AssetRow, CatalogMetaRow, CloudflareEnv, JsonEntityRow } from './types';
import { createId } from './http';

export const CATALOG_SCHEMA_VERSION = 1;

export interface CloudCatalog {
  schemaVersion: number;
  datasetRevision: number;
  seededAt: string;
  updatedAt: string;
  customCards: CardItem[];
  editedCards: CardItem[];
  deletedSystemCardIds: string[];
  progressionConfig: unknown;
  luxuryProgressionConfig: unknown;
  assets: Array<{ id: string; url: string; sha256: string; mimeType: string; size: number }>;
  counts: { customCards: number; editedCards: number; deletedSystemCards: number; assets: number };
  lastBackupAt: string | null;
}

const parseJson = (value: string): unknown => JSON.parse(value);

export const getCatalogMeta = async (db: D1Database): Promise<CatalogMetaRow> => {
  const row = await db.prepare(
    'SELECT schema_version, dataset_revision, seeded_at, updated_at, last_backup_at FROM catalog_meta WHERE singleton = 1',
  ).first<CatalogMetaRow>();
  if (!row) throw new Error('CATALOG_SCHEMA_MISSING');
  return row;
};

export const readCatalog = async (env: CloudflareEnv): Promise<CloudCatalog> => {
  const meta = await getCatalogMeta(env.DB);
  if (!meta.seeded_at) throw new Error('CATALOG_NOT_SEEDED');
  const [customResult, editedResult, deletedResult, configResult, assetResult] = await env.DB.batch([
    env.DB.prepare('SELECT id, json, revision FROM custom_cards WHERE deleted_at IS NULL ORDER BY id'),
    env.DB.prepare('SELECT card_id, json, revision FROM system_card_overrides WHERE deleted_at IS NULL ORDER BY card_id'),
    env.DB.prepare('SELECT card_id FROM deleted_system_cards ORDER BY card_id'),
    env.DB.prepare('SELECT config_key, json, revision FROM catalog_configs ORDER BY config_key'),
    env.DB.prepare('SELECT id, r2_key, sha256, mime_type, size, revision, created_at FROM card_assets ORDER BY id'),
  ]);
  const customRows = customResult.results as unknown as Array<{ json: string }>;
  const editedRows = editedResult.results as unknown as Array<{ json: string }>;
  const configRows = configResult.results as unknown as Array<{ config_key: string; json: string }>;
  const deletedRows = deletedResult.results as unknown as Array<{ card_id: string }>;
  const customCards = parseStoredCards(customRows.map((row) => parseJson(String(row.json))));
  const editedCards = parseStoredCards(editedRows.map((row) => parseJson(String(row.json))));
  if (customCards.length !== customResult.results.length || editedCards.length !== editedResult.results.length) {
    throw new Error('CATALOG_CONTAINS_INVALID_CARDS');
  }
  const config = new Map(configRows.map((row) => [String(row.config_key), parseJson(String(row.json))]));
  const assets = assetResult.results as unknown as AssetRow[];
  const deletedSystemCardIds = deletedRows.map((row) => String(row.card_id));
  return {
    schemaVersion: meta.schema_version,
    datasetRevision: meta.dataset_revision,
    seededAt: meta.seeded_at,
    updatedAt: meta.updated_at,
    customCards,
    editedCards,
    deletedSystemCardIds,
    progressionConfig: config.get('progression') ?? null,
    luxuryProgressionConfig: config.get('luxury_progression') ?? null,
    assets: assets.map((asset) => ({
      id: asset.id,
      url: `/api/assets/${encodeURIComponent(asset.id)}`,
      sha256: asset.sha256,
      mimeType: asset.mime_type,
      size: asset.size,
    })),
    counts: {
      customCards: customCards.length,
      editedCards: editedCards.length,
      deletedSystemCards: deletedSystemCardIds.length,
      assets: assets.length,
    },
    lastBackupAt: meta.last_backup_at,
  };
};

export interface MutationOptions {
  expectedRevision: number;
  actorEmail: string;
  entityType: string;
  entityId: string;
  operation: string;
  before: unknown;
  after: unknown;
  statements: D1PreparedStatement[];
}

export const commitMutation = async (env: CloudflareEnv, options: MutationOptions): Promise<number> => {
  const meta = await getCatalogMeta(env.DB);
  if (meta.dataset_revision !== options.expectedRevision) throw new Error('STALE_REVISION');
  const nextRevision = options.expectedRevision + 1;
  const now = new Date().toISOString();
  const revisionId = createId('revision');
  try {
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO catalog_revisions
          (id, dataset_revision, entity_type, entity_id, operation, before_json, after_json, actor_email, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        revisionId, nextRevision, options.entityType, options.entityId, options.operation,
        options.before === undefined ? null : JSON.stringify(options.before),
        options.after === undefined ? null : JSON.stringify(options.after),
        options.actorEmail, now,
      ),
      ...options.statements,
      env.DB.prepare(
        'UPDATE catalog_meta SET dataset_revision = ?, updated_at = ? WHERE singleton = 1 AND dataset_revision = ?',
      ).bind(nextRevision, now, options.expectedRevision),
    ]);
  } catch (error) {
    if (String(error).includes('UNIQUE') || String(error).includes('constraint')) {
      throw new Error('STALE_REVISION');
    }
    throw error;
  }
  return nextRevision;
};

export const upsertCard = async (
  env: CloudflareEnv,
  kind: 'custom' | 'system_override',
  card: CardItem,
  expectedRevision: number,
  actorEmail: string,
): Promise<number> => {
  if (!isStoredCard(card)) throw new Error('INVALID_CARD');
  const table = kind === 'custom' ? 'custom_cards' : 'system_card_overrides';
  const idColumn = kind === 'custom' ? 'id' : 'card_id';
  const beforeRow = await env.DB.prepare(
    `SELECT json FROM ${table} WHERE ${idColumn} = ? AND deleted_at IS NULL`,
  ).bind(card.id).first<{ json: string }>();
  const now = new Date().toISOString();
  return commitMutation(env, {
    expectedRevision,
    actorEmail,
    entityType: kind,
    entityId: card.id,
    operation: beforeRow ? 'update' : 'create',
    before: beforeRow ? parseJson(beforeRow.json) : null,
    after: card,
    statements: [env.DB.prepare(
      `INSERT INTO ${table} (${idColumn}, json, revision, deleted_at, updated_at)
       VALUES (?, ?, ?, NULL, ?)
       ON CONFLICT(${idColumn}) DO UPDATE SET
         json = excluded.json, revision = excluded.revision, deleted_at = NULL, updated_at = excluded.updated_at`,
    ).bind(card.id, JSON.stringify(card), expectedRevision + 1, now)],
  });
};

export const deleteCatalogCard = async (
  env: CloudflareEnv,
  kind: 'custom' | 'system',
  cardId: string,
  expectedRevision: number,
  actorEmail: string,
): Promise<number> => {
  if (!cardId.trim()) throw new Error('INVALID_CARD_ID');
  const now = new Date().toISOString();
  if (kind === 'custom') {
    const before = await env.DB.prepare(
      'SELECT json FROM custom_cards WHERE id = ? AND deleted_at IS NULL',
    ).bind(cardId).first<{ json: string }>();
    if (!before) throw new Error('CARD_NOT_FOUND');
    return commitMutation(env, {
      expectedRevision, actorEmail, entityType: 'custom', entityId: cardId, operation: 'delete',
      before: parseJson(before.json), after: null,
      statements: [env.DB.prepare(
        'UPDATE custom_cards SET deleted_at = ?, updated_at = ?, revision = ? WHERE id = ? AND deleted_at IS NULL',
      ).bind(now, now, expectedRevision + 1, cardId)],
    });
  }
  const existing = await env.DB.prepare(
    'SELECT card_id FROM deleted_system_cards WHERE card_id = ?',
  ).bind(cardId).first();
  if (existing) throw new Error('CARD_ALREADY_DELETED');
  return commitMutation(env, {
    expectedRevision, actorEmail, entityType: 'system_deletion', entityId: cardId, operation: 'delete',
    before: null, after: { cardId },
    statements: [env.DB.prepare(
      'INSERT INTO deleted_system_cards (card_id, revision, deleted_at) VALUES (?, ?, ?)',
    ).bind(cardId, expectedRevision + 1, now)],
  });
};

export const upsertConfig = async (
  env: CloudflareEnv,
  configKey: 'progression' | 'luxury_progression',
  value: unknown,
  expectedRevision: number,
  actorEmail: string,
): Promise<number> => {
  if (configKey === 'progression' ? !isProgressionConfigValue(value) : !isLuxuryProgressionConfigValue(value)) {
    throw new Error('INVALID_CONFIG');
  }
  const before = await env.DB.prepare(
    'SELECT json FROM catalog_configs WHERE config_key = ?',
  ).bind(configKey).first<{ json: string }>();
  const now = new Date().toISOString();
  return commitMutation(env, {
    expectedRevision, actorEmail, entityType: 'config', entityId: configKey,
    operation: before ? 'update' : 'create', before: before ? parseJson(before.json) : null, after: value,
    statements: [env.DB.prepare(
      `INSERT INTO catalog_configs (config_key, json, revision, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(config_key) DO UPDATE SET json = excluded.json, revision = excluded.revision, updated_at = excluded.updated_at`,
    ).bind(configKey, JSON.stringify(value), expectedRevision + 1, now)],
  });
};

interface RevisionRow {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  before_json: string | null;
  after_json: string | null;
}

export const restoreRevision = async (
  env: CloudflareEnv,
  revisionId: string,
  expectedRevision: number,
  actorEmail: string,
): Promise<number> => {
  const revision = await env.DB.prepare(
    `SELECT id, entity_type, entity_id, operation, before_json, after_json
       FROM catalog_revisions WHERE id = ?`,
  ).bind(revisionId).first<RevisionRow>();
  if (!revision) throw new Error('REVISION_NOT_FOUND');
  const target = revision.before_json ? parseJson(revision.before_json) : null;
  const now = new Date().toISOString();
  const nextRevision = expectedRevision + 1;
  let statement: D1PreparedStatement;
  let current: unknown = null;

  if (revision.entity_type === 'custom' || revision.entity_type === 'system_override') {
    const table = revision.entity_type === 'custom' ? 'custom_cards' : 'system_card_overrides';
    const idColumn = revision.entity_type === 'custom' ? 'id' : 'card_id';
    const currentRow = await env.DB.prepare(
      `SELECT json FROM ${table} WHERE ${idColumn} = ? AND deleted_at IS NULL`,
    ).bind(revision.entity_id).first<{ json: string }>();
    current = currentRow ? parseJson(currentRow.json) : null;
    if (target !== null && !isStoredCard(target)) throw new Error('INVALID_REVISION_DATA');
    statement = target === null
      ? env.DB.prepare(`UPDATE ${table} SET deleted_at = ?, updated_at = ?, revision = ? WHERE ${idColumn} = ?`)
        .bind(now, now, nextRevision, revision.entity_id)
      : env.DB.prepare(
        `INSERT INTO ${table} (${idColumn}, json, revision, deleted_at, updated_at)
         VALUES (?, ?, ?, NULL, ?)
         ON CONFLICT(${idColumn}) DO UPDATE SET json = excluded.json, revision = excluded.revision,
           deleted_at = NULL, updated_at = excluded.updated_at`,
      ).bind(revision.entity_id, JSON.stringify(target), nextRevision, now);
  } else if (revision.entity_type === 'system_deletion') {
    current = await env.DB.prepare(
      'SELECT card_id AS cardId FROM deleted_system_cards WHERE card_id = ?',
    ).bind(revision.entity_id).first() ?? null;
    statement = target === null
      ? env.DB.prepare('DELETE FROM deleted_system_cards WHERE card_id = ?').bind(revision.entity_id)
      : env.DB.prepare(
        `INSERT INTO deleted_system_cards (card_id, revision, deleted_at) VALUES (?, ?, ?)
         ON CONFLICT(card_id) DO UPDATE SET revision = excluded.revision, deleted_at = excluded.deleted_at`,
      ).bind(revision.entity_id, nextRevision, now);
  } else if (revision.entity_type === 'config') {
    const currentRow = await env.DB.prepare(
      'SELECT json FROM catalog_configs WHERE config_key = ?',
    ).bind(revision.entity_id).first<{ json: string }>();
    current = currentRow ? parseJson(currentRow.json) : null;
    statement = target === null
      ? env.DB.prepare('DELETE FROM catalog_configs WHERE config_key = ?').bind(revision.entity_id)
      : env.DB.prepare(
        `INSERT INTO catalog_configs (config_key, json, revision, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(config_key) DO UPDATE SET json = excluded.json, revision = excluded.revision,
           updated_at = excluded.updated_at`,
      ).bind(revision.entity_id, JSON.stringify(target), nextRevision, now);
  } else {
    throw new Error('REVISION_NOT_RESTORABLE');
  }

  return commitMutation(env, {
    expectedRevision,
    actorEmail,
    entityType: revision.entity_type,
    entityId: revision.entity_id,
    operation: 'restore',
    before: current,
    after: target,
    statements: [statement],
  });
};

export interface RecoveryBundleData {
  schemaVersion: number;
  createdAt: string;
  sourceOrigin?: string;
  customCards: CardItem[];
  editedCards: CardItem[];
  deletedSystemCardIds: string[];
  progressionConfig: unknown;
  luxuryProgressionConfig: unknown;
  assets: Array<{
    id: string;
    sha256: string;
    mimeType: string;
    size: number;
    dataBase64?: string;
  }>;
}

export const validateRecoveryBundle = (value: unknown): RecoveryBundleData | null => {
  if (!isRecord(value) || !Array.isArray(value.customCards) || !Array.isArray(value.editedCards) ||
      !Array.isArray(value.deletedSystemCardIds) || !Array.isArray(value.assets)) return null;
  const customCards = parseStoredCards(value.customCards);
  const editedCards = parseStoredCards(value.editedCards);
  const deletedSystemCardIds = Array.from(new Set(value.deletedSystemCardIds.filter(
    (id): id is string => typeof id === 'string' && id.length > 0,
  )));
  const assets = value.assets.filter((asset): asset is RecoveryBundleData['assets'][number] =>
    isRecord(asset) && typeof asset.id === 'string' && typeof asset.sha256 === 'string' &&
    /^[a-f0-9]{64}$/i.test(asset.sha256) && typeof asset.mimeType === 'string' &&
    typeof asset.size === 'number' && Number.isFinite(asset.size) && asset.size >= 0 &&
    (asset.dataBase64 === undefined || typeof asset.dataBase64 === 'string'),
  );
  if (customCards.length !== value.customCards.length || editedCards.length !== value.editedCards.length ||
      deletedSystemCardIds.length !== value.deletedSystemCardIds.length || assets.length !== value.assets.length) {
    return null;
  }
  if (!isProgressionConfigValue(value.progressionConfig) ||
      !isLuxuryProgressionConfigValue(value.luxuryProgressionConfig)) return null;
  return {
    schemaVersion: Number(value.schemaVersion) || CATALOG_SCHEMA_VERSION,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
    sourceOrigin: typeof value.sourceOrigin === 'string' ? value.sourceOrigin : undefined,
    customCards,
    editedCards,
    deletedSystemCardIds,
    progressionConfig: value.progressionConfig ?? null,
    luxuryProgressionConfig: value.luxuryProgressionConfig ?? null,
    assets,
  };
};

export const seedCatalog = async (
  env: CloudflareEnv,
  bundle: RecoveryBundleData,
  actorEmail: string,
  replace = false,
): Promise<void> => {
  const meta = await getCatalogMeta(env.DB);
  if (meta.seeded_at && !replace) throw new Error('CATALOG_ALREADY_SEEDED');
  const now = new Date().toISOString();
  const nextRevision = meta.dataset_revision + 1;
  const statements: D1PreparedStatement[] = [];
  if (replace) {
    statements.push(
      env.DB.prepare('DELETE FROM custom_cards'),
      env.DB.prepare('DELETE FROM system_card_overrides'),
      env.DB.prepare('DELETE FROM deleted_system_cards'),
      env.DB.prepare('DELETE FROM catalog_configs'),
      env.DB.prepare('DELETE FROM card_assets'),
    );
  }
  for (const card of bundle.customCards) {
    statements.push(env.DB.prepare(
      'INSERT INTO custom_cards (id, json, revision, deleted_at, updated_at) VALUES (?, ?, ?, NULL, ?)',
    ).bind(card.id, JSON.stringify(card), nextRevision, now));
  }
  for (const card of bundle.editedCards) {
    statements.push(env.DB.prepare(
      'INSERT INTO system_card_overrides (card_id, json, revision, deleted_at, updated_at) VALUES (?, ?, ?, NULL, ?)',
    ).bind(card.id, JSON.stringify(card), nextRevision, now));
  }
  for (const cardId of bundle.deletedSystemCardIds) {
    statements.push(env.DB.prepare(
      'INSERT INTO deleted_system_cards (card_id, revision, deleted_at) VALUES (?, ?, ?)',
    ).bind(cardId, nextRevision, now));
  }
  for (const [key, config] of [
    ['progression', bundle.progressionConfig],
    ['luxury_progression', bundle.luxuryProgressionConfig],
  ] as const) {
    if (config !== null && config !== undefined) statements.push(env.DB.prepare(
      'INSERT INTO catalog_configs (config_key, json, revision, updated_at) VALUES (?, ?, ?, ?)',
    ).bind(key, JSON.stringify(config), nextRevision, now));
  }
  for (const asset of bundle.assets) {
    statements.push(env.DB.prepare(
      'INSERT INTO card_assets (id, r2_key, sha256, mime_type, size, revision, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).bind(asset.id, `card-assets/${asset.sha256}`, asset.sha256, asset.mimeType, asset.size, nextRevision, now));
  }
  statements.push(
    env.DB.prepare(
      `INSERT INTO catalog_revisions
        (id, dataset_revision, entity_type, entity_id, operation, before_json, after_json, actor_email, created_at)
       VALUES (?, ?, 'catalog', 'catalog', ?, NULL, ?, ?, ?)`,
    ).bind(createId('revision'), nextRevision, replace ? 'replace' : 'seed', JSON.stringify({
      customCards: bundle.customCards.length,
      editedCards: bundle.editedCards.length,
      deletedSystemCards: bundle.deletedSystemCardIds.length,
      assets: bundle.assets.length,
    }), actorEmail, now),
    env.DB.prepare(
      'UPDATE catalog_meta SET schema_version = ?, dataset_revision = ?, seeded_at = ?, updated_at = ? WHERE singleton = 1 AND dataset_revision = ?',
    ).bind(CATALOG_SCHEMA_VERSION, nextRevision, now, now, meta.dataset_revision),
  );
  await env.DB.batch(statements);
};

export const getJsonEntityBefore = async (
  env: CloudflareEnv,
  entityType: string,
  entityId: string,
): Promise<unknown> => {
  let row: JsonEntityRow | null = null;
  if (entityType === 'custom') row = await env.DB.prepare(
    'SELECT json FROM custom_cards WHERE id = ?',
  ).bind(entityId).first<JsonEntityRow>();
  if (entityType === 'system_override') row = await env.DB.prepare(
    'SELECT json FROM system_card_overrides WHERE card_id = ?',
  ).bind(entityId).first<JsonEntityRow>();
  if (entityType === 'config') row = await env.DB.prepare(
    'SELECT json FROM catalog_configs WHERE config_key = ?',
  ).bind(entityId).first<JsonEntityRow>();
  return row ? parseJson(row.json) : null;
};
