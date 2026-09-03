#!/usr/bin/env node
/**
 * Empty a hub site's R2 buckets (guides + media) before terraform destroy.
 *
 * Usage: node scripts/empty-hub-site-r2-buckets.mjs <site_id>
 */
import { emptyHubSiteR2Buckets } from './lib/hub-site-r2-buckets.mjs';

const siteId = process.argv[2]?.trim();
if (!siteId) {
  console.error('Usage: node scripts/empty-hub-site-r2-buckets.mjs <site_id>');
  process.exit(1);
}

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim() ?? '';
const token = process.env.CLOUDFLARE_API_TOKEN?.trim() ?? '';
if (!accountId || !token) {
  console.error('CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required.');
  process.exit(1);
}

try {
  const result = await emptyHubSiteR2Buckets(siteId, {
    accountId,
    token,
    onProgress: (message) => console.log(message)
  });
  console.log(
    `Emptied R2 buckets for ${siteId}: ${result.guides}, ${result.media} (${result.deleted} object(s) deleted; source=${result.source}).`
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
