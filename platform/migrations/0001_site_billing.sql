-- Platform billing mirror (Stripe is source of truth).
CREATE TABLE IF NOT EXISTS site_billing (
  site_id TEXT PRIMARY KEY,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL CHECK (
    status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete')
  ),
  trial_end INTEGER,
  archive_r2_key TEXT,
  owner_email TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_site_billing_stripe_customer
  ON site_billing (stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_site_billing_stripe_subscription
  ON site_billing (stripe_subscription_id);

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at INTEGER NOT NULL
);
