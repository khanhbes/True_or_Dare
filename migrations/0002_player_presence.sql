CREATE TABLE IF NOT EXISTS player_presence (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  login_count INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_player_presence_last_seen
  ON player_presence(last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_player_presence_active
  ON player_presence(is_active, last_seen_at DESC);
