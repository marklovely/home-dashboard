-- Track which lifecycle emails have already been sent so Stripe webhook
-- retries do not mail the customer twice.
ALTER TABLE site_billing ADD COLUMN signup_email_sent_at INTEGER;
ALTER TABLE site_billing ADD COLUMN trial_ending_email_sent_at INTEGER;
ALTER TABLE site_billing ADD COLUMN past_due_email_sent_at INTEGER;
ALTER TABLE site_billing ADD COLUMN canceled_email_sent_at INTEGER;
