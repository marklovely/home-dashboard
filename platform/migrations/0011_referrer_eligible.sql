-- Referrers may generate links only after their own first paid invoice.
ALTER TABLE site_billing ADD COLUMN referrer_eligible_at INTEGER;
