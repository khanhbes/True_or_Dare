import type { CloudflareEnv } from './types';
import { createId, sha256Hex } from './http';
import { readCatalog } from './catalog';

export type BackupKind = 'daily' | 'weekly' | 'manual' | 'pre_restore';

export interface BackupSnapshot {
  format: 'truth-or-dare-cloud-backup';
  schemaVersion: 1;
  createdAt: string;
  kind: BackupKind;
  catalog: Awaited<ReturnType<typeof readCatalog>>;
  revisions: unknown[];
  checksums: { catalog: string; revisions: string };
}

export const createCatalogBackup = async (
  env: CloudflareEnv,
  kind: BackupKind,
  forcedId?: string,
): Promise<{ id: string; key: string; snapshot: BackupSnapshot }> => {
  const catalog = await readCatalog(env);
  const id = forcedId ?? createId(`backup-${kind}`);
  const now = new Date().toISOString();
  const prefix = kind === 'weekly' ? 'snapshots/weekly' :
    kind === 'daily' ? 'snapshots/daily' : `snapshots/${kind}`;
  const key = `${prefix}/${now.slice(0, 10)}/${id}.json`;
  const revisions = await env.DB.prepare(
    `SELECT id, dataset_revision, entity_type, entity_id, operation,
            before_json, after_json, actor_email, created_at
       FROM catalog_revisions ORDER BY dataset_revision`,
  ).all();
  const encoder = new TextEncoder();
  const checksums = {
    catalog: await sha256Hex(encoder.encode(JSON.stringify(catalog)).buffer),
    revisions: await sha256Hex(encoder.encode(JSON.stringify(revisions.results)).buffer),
  };
  const snapshot: BackupSnapshot = {
    format: 'truth-or-dare-cloud-backup',
    schemaVersion: 1,
    createdAt: now,
    kind,
    catalog,
    revisions: revisions.results,
    checksums,
  };
  await env.DB.prepare(
    `INSERT INTO backup_runs
      (id, kind, dataset_revision, r2_key, status, created_at)
     VALUES (?, ?, ?, ?, 'running', ?)`,
  ).bind(id, kind, catalog.datasetRevision, key, now).run();
  try {
    await env.CARD_BACKUPS.put(key, JSON.stringify(snapshot), {
      httpMetadata: { contentType: 'application/json; charset=utf-8' },
      customMetadata: {
        datasetRevision: String(catalog.datasetRevision),
        backupKind: kind,
      },
    });
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE backup_runs SET status = 'completed', completed_at = ? WHERE id = ?`,
      ).bind(new Date().toISOString(), id),
      env.DB.prepare(
        'UPDATE catalog_meta SET last_backup_at = ? WHERE singleton = 1',
      ).bind(now),
    ]);
  } catch (error) {
    await env.DB.prepare(
      `UPDATE backup_runs SET status = 'failed', error = ?, completed_at = ? WHERE id = ?`,
    ).bind(String(error), new Date().toISOString(), id).run();
    throw error;
  }
  return { id, key, snapshot };
};

const listAll = async (bucket: R2Bucket, prefix: string): Promise<R2Object[]> => {
  const objects: R2Object[] = [];
  let cursor: string | undefined;
  do {
    const listed = await bucket.list({ prefix, cursor, limit: 1000 });
    objects.push(...listed.objects);
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
  return objects;
};

export const pruneBackups = async (env: CloudflareEnv, now = Date.now()): Promise<number> => {
  const policies = [
    { prefix: 'snapshots/daily/', maxAgeMs: 30 * 24 * 60 * 60 * 1000 },
    { prefix: 'snapshots/weekly/', maxAgeMs: 12 * 7 * 24 * 60 * 60 * 1000 },
  ];
  let removed = 0;
  for (const policy of policies) {
    const objects = await listAll(env.CARD_BACKUPS, policy.prefix);
    const expired = objects.filter((object) => now - object.uploaded.getTime() > policy.maxAgeMs);
    for (let index = 0; index < expired.length; index += 1000) {
      const keys = expired.slice(index, index + 1000).map((object) => object.key);
      if (keys.length) {
        await env.CARD_BACKUPS.delete(keys);
        removed += keys.length;
      }
    }
  }
  return removed;
};
