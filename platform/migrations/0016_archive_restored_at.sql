-- Track automated platform archive restore after hub reprovision.
ALTER TABLE site_billing ADD COLUMN archive_restored_at INTEGER;
