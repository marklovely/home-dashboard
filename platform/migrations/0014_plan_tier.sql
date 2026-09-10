-- Plan tier for Free vs Lovely Home+ (set at signup and Stripe webhooks).
ALTER TABLE site_billing ADD COLUMN plan_tier TEXT;
