-- Track automated hub provisioning triggered by Stripe trialing webhooks.
ALTER TABLE site_billing ADD COLUMN provision_dispatched_at INTEGER;
ALTER TABLE site_billing ADD COLUMN provision_last_error TEXT;
