-- Track Lovely Home+ upgrade confirmation (Free → Plus checkout), separate from signup mail.
ALTER TABLE site_billing ADD COLUMN upgrade_email_sent_at INTEGER;
