-- Appliance manual metadata (PDF files live in private R2 bucket APPLIANCE_GUIDES).
CREATE TABLE IF NOT EXISTS appliance_manuals (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  appliance_name TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  category TEXT NOT NULL,
  location TEXT,
  description TEXT,
  object_key TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  published INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_appliance_manuals_published_sort
  ON appliance_manuals (published, sort_order, title);
