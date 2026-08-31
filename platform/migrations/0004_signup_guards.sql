-- Signup guards: hold a slug while Checkout is open, throttle abuse, and record
-- the registry dispatch that now happens only after Stripe confirms payment.

CREATE TABLE IF NOT EXISTS signup_slug_reservations (
  site_id TEXT PRIMARY KEY,
  owner_email TEXT,
  stripe_session_id TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_signup_slug_reservations_expires
  ON signup_slug_reservations (expires_at);

-- client_key is a SHA-256 of the client IP; raw addresses are never stored.
CREATE TABLE IF NOT EXISTS signup_attempts (
  client_key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  attempts INTEGER NOT NULL,
  PRIMARY KEY (client_key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_signup_attempts_window
  ON signup_attempts (window_start);

ALTER TABLE site_billing ADD COLUMN registry_dispatched_at INTEGER;
ALTER TABLE site_billing ADD COLUMN registry_last_error TEXT;
