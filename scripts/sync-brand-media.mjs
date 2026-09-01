#!/usr/bin/env node
/**
 * Upload product brand + marketing screenshots to the shared BRAND_MEDIA R2 bucket.
 *
 * Git remains the source of truth. R2 is what the hub (and later a public media
 * hostname) actually serves. Requires wrangler auth and CLOUDFLARE_ACCOUNT_ID.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BRAND_MEDIA_BUCKET_NAME,
  listBrandMediaObjects,
  wranglerBrandMediaPutArgs
} from './lib/brand-media.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const workerDir = join(root, 'worker');
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();

const objects = listBrandMediaObjects();
for (const object of objects) {
  if (!existsSync(object.file)) {
    throw new Error(`Brand media source missing: ${object.file}`);
  }
}

const env = { ...process.env };
if (accountId) {
  env.CLOUDFLARE_ACCOUNT_ID = accountId;
}

for (const object of objects) {
  const objectPath = `${BRAND_MEDIA_BUCKET_NAME}/${object.key}`;
  console.log(`==> r2 put ${objectPath}`);
  execFileSync(
    'npx',
    ['wrangler', ...wranglerBrandMediaPutArgs(objectPath, object.file, object.contentType)],
    { cwd: workerDir, stdio: 'inherit', env }
  );
}

console.log(`Uploaded ${objects.length} objects to ${BRAND_MEDIA_BUCKET_NAME}.`);
