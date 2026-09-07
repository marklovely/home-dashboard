-- Single-use opaque referral codes for referee + referrer rewards at Checkout.

CREATE TABLE IF NOT EXISTS referral_codes (
  code TEXT PRIMARY KEY,
  referrer_site_id TEXT NOT NULL,
  billing_interval TEXT NOT NULL,
  status TEXT NOT NULL,
  reserved_at INTEGER,
  reserved_email TEXT,
  reserved_site_id TEXT,
  stripe_session_id TEXT,
  used_by_site_id TEXT,
  used_at INTEGER,
  referrer_rewarded_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_referrer
  ON referral_codes (referrer_site_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_referral_codes_session
  ON referral_codes (stripe_session_id);
