#!/usr/bin/env node
/**
 * Export a full site backup from a live hub before deprovision and store in platform R2.
 *
 * Usage: node scripts/archive-hub-site-backup.mjs <site_id>
 */
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PLATFORM_ARCHIVE_R2_BUCKET_NAME,
  uploadSiteArchiveToR2
} from './lib/platform-archive-storage.mjs';
import { resolveHubArchiveUrl } from './lib/hub-archive-url.mjs';

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

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** @returns {{ hostname?: string }} */
function readTerraformSite() {
  try {
    const raw = execFileSync(
      'node',
      [join(root, 'scripts/lib/terraform-site-output.mjs'), 'site', siteId],
      { encoding: 'utf8' }
    );
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Could not read terraform output for site "${siteId}":`, error.message);
    process.exit(1);
  }
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

const site = readTerraformSite();
const archive = resolveHubArchiveUrl(site);
if (!archive.url) {
  console.error(`No worker_api_origin or hostname in terraform output for "${siteId}".`);
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
