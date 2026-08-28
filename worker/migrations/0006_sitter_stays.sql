CREATE TABLE IF NOT EXISTS sitter_stays (
  id TEXT PRIMARY KEY NOT NULL,
  label TEXT,
  emails_json TEXT NOT NULL,
  sit_start TEXT NOT NULL,
  sit_end TEXT NOT NULL,
  access_opens_at INTEGER NOT NULL,
  access_closes_at INTEGER NOT NULL,
  secrets_opens_at INTEGER NOT NULL,
  secrets_closes_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sitter_stays_status ON sitter_stays (status);
CREATE INDEX IF NOT EXISTS idx_sitter_stays_access_closes ON sitter_stays (access_closes_at);
