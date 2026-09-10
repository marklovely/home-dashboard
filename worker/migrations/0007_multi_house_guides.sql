-- Multiple house guides per hub (Free: up to 2, Lovely Home+: unlimited).
CREATE TABLE IF NOT EXISTS house_guides (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

ALTER TABLE guide_categories ADD COLUMN guide_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE guide_topics ADD COLUMN guide_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE guide_media ADD COLUMN guide_id TEXT NOT NULL DEFAULT 'default';

INSERT OR IGNORE INTO house_guides (id, title, sort_order, created_at, updated_at)
SELECT 'default', home_summary_title, 0, updated_at, updated_at
FROM guide_settings
WHERE id = 'default';

CREATE INDEX IF NOT EXISTS idx_guide_categories_guide_sort
  ON guide_categories (guide_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_guide_topics_guide_category
  ON guide_topics (guide_id, category_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_guide_media_guide
  ON guide_media (guide_id, id);
