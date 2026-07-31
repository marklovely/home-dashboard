-- Topic audience: guest (default, visible to sitters) or owner (owner-only notes).
ALTER TABLE guide_topics ADD COLUMN audience TEXT NOT NULL DEFAULT 'guest';

CREATE INDEX IF NOT EXISTS idx_guide_topics_audience
  ON guide_topics (audience, published);
