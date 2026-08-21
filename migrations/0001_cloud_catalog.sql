PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS catalog_meta (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  schema_version INTEGER NOT NULL,
  dataset_revision INTEGER NOT NULL DEFAULT 0,
  seeded_at TEXT,
  updated_at TEXT NOT NULL,
  last_backup_at TEXT
);

INSERT OR IGNORE INTO catalog_meta (
  singleton, schema_version, dataset_revision, seeded_at, updated_at
) VALUES (1, 1, 0, NULL, CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS custom_cards (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  revision INTEGER NOT NULL,
  deleted_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS system_card_overrides (
  card_id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  revision INTEGER NOT NULL,
  deleted_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS deleted_system_cards (
  card_id TEXT PRIMARY KEY,
  revision INTEGER NOT NULL,
  deleted_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS catalog_configs (
  config_key TEXT PRIMARY KEY CHECK (config_key IN ('progression', 'luxury_progression')),
  json TEXT NOT NULL,
  revision INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS card_assets (
  id TEXT PRIMARY KEY,
  r2_key TEXT NOT NULL UNIQUE,
  sha256 TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL CHECK (size >= 0),
  revision INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS catalog_revisions (
  id TEXT PRIMARY KEY,
  dataset_revision INTEGER NOT NULL UNIQUE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  actor_email TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_catalog_revisions_entity
  ON catalog_revisions(entity_type, entity_id, dataset_revision DESC);

CREATE TABLE IF NOT EXISTS backup_runs (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('daily', 'weekly', 'manual', 'pre_restore')),
  dataset_revision INTEGER NOT NULL,
  r2_key TEXT,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  error TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_backup_runs_created_at
  ON backup_runs(created_at DESC);

