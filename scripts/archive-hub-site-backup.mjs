#!/usr/bin/env node
/**
 * Export a full site backup from a live hub before deprovision and store in platform R2.
 *
 * Usage: node scripts/archive-hub-site-backup.mjs <site_id>
 */
import {
  PLATFORM_ARCHIVE_R2_BUCKET_NAME,
  uploadSiteArchiveToR2
} from './lib/platform-archive-storage.mjs';
import { resolveHubArchiveUrl } from './lib/hub-archive-url.mjs';
import { resolveSiteArchiveContract } from './lib/resolve-site-archive-contract.mjs';

const siteId = process.argv[2]?.trim();
if (!siteId) {
  console.error('Usage: node scripts/archive-hub-site-backup.mjs <site_id>');
  process.exit(1);
}

const archiveSecret = process.env.PLATFORM_SITE_ARCHIVE_SECRET?.trim();
const bucket = process.env.PLATFORM_ARCHIVE_R2_BUCKET?.trim() || PLATFORM_ARCHIVE_R2_BUCKET_NAME;

if (!archiveSecret) {
  console.error(
    'PLATFORM_SITE_ARCHIVE_SECRET is not set — refusing to deprovision without a hub backup.'
  );
  process.exit(1);
}

/**
 * @param {string} url
 */
async function fetchArchivePayload(url) {
  /** @type {Record<string, string>} */
  const headers = {
    Accept: 'application/json',
    'X-Platform-Site-Archive-Secret': archiveSecret
  };

  const clientId = process.env.PLATFORM_HEALTH_CF_ACCESS_CLIENT_ID?.trim();
  const clientSecret = process.env.PLATFORM_HEALTH_CF_ACCESS_CLIENT_SECRET?.trim();
  if (clientId && clientSecret) {
    headers['CF-Access-Client-Id'] = clientId;
    headers['CF-Access-Client-Secret'] = clientSecret;
  }

  const response = await fetch(url, { headers, redirect: 'manual' });
  if (response.status >= 300 && response.status < 400) {
    console.error(
      `Archive fetch blocked by Cloudflare Access (${response.status}). Set PLATFORM_HEALTH_CF_ACCESS_CLIENT_ID/SECRET.`
    );
    process.exit(1);
  }

  if (!response.ok) {
    const body = await response.text();
    console.error(`Archive fetch failed (${response.status}): ${body.slice(0, 500)}`);
    process.exit(1);
  }

  return /** @type {Record<string, unknown>} */ (await response.json());
}

console.log(`\n=== Archiving hub site backup: ${siteId} ===`);

const resolved = resolveSiteArchiveContract(siteId);
if (!resolved) {
  console.error(`Could not resolve archive target for site "${siteId}" (terraform, manifest, or registry).`);
  process.exit(1);
}
if (resolved.source !== 'terraform') {
  console.warn(
    `Using ${resolved.source} fallback for archive target (terraform output sites missing or incomplete).`
  );
}

const archive = resolveHubArchiveUrl(resolved.site);
if (!archive.url) {
  console.error(`No worker_api_origin or hostname available for "${siteId}".`);
  process.exit(1);
}

console.log(`Fetching archive via ${archive.via}: ${archive.url}`);
const payload = await fetchArchivePayload(archive.url);
const { backupKey, latestKey } = uploadSiteArchiveToR2(siteId, payload, {
  bucket,
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID
});

console.log(`Archived to r2://${bucket}/${backupKey}`);
console.log(`Latest pointer: r2://${bucket}/${latestKey}`);
console.log(`\n=== Archive complete: ${siteId} ===`);
