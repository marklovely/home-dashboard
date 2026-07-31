-- House Guide CMS (categories, topics, media metadata; images in R2 GUIDE_MEDIA).
CREATE TABLE IF NOT EXISTS guide_settings (
  id TEXT PRIMARY KEY NOT NULL DEFAULT 'default',
  version INTEGER NOT NULL DEFAULT 2,
  home_summary_title TEXT NOT NULL,
  home_summary_subtitle TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS guide_categories (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  card_subtitle TEXT NOT NULL,
  icon_id TEXT NOT NULL,
  accent TEXT NOT NULL,
  search_terms TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS guide_topics (
  id TEXT PRIMARY KEY NOT NULL,
  category_id TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  summary TEXT NOT NULL,
  search_terms TEXT,
  appliance_manual_terms TEXT,
  blocks TEXT NOT NULL,
  published_blocks TEXT,
  actions TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  has_draft INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES guide_categories(id)
);

CREATE TABLE IF NOT EXISTS guide_media (
  id TEXT PRIMARY KEY NOT NULL,
  alt TEXT NOT NULL,
  object_key TEXT,
  source_file TEXT,
  original_filename TEXT,
  mime_type TEXT,
  file_size INTEGER,
  published INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_guide_topics_category_sort
  ON guide_topics (category_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_guide_categories_sort
  ON guide_categories (sort_order);
