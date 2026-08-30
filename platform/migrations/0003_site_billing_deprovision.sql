-- Track automated hub deprovision triggered by Stripe cancel/delete webhooks.
ALTER TABLE site_billing ADD COLUMN deprovision_dispatched_at INTEGER;
ALTER TABLE site_billing ADD COLUMN deprovision_last_error TEXT;
