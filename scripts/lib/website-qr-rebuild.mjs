/**
 * Decide whether the marketing-site QR bundle can be rebuilt in this checkout.
 *
 * website/vendor/lovely-qr.js is committed. Vite/Rollup is only needed when
 * regenerating it. npm often omits Rollup's platform optional native
 * (@rollup/rollup-darwin-arm64 etc.), which would otherwise abort a deploy.
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export const WEBSITE_QR_VENDOR = 'website/vendor/lovely-qr.js';

/**
 * @param {{
 *   rootDir?: string;
 *   importRollup?: () => Promise<unknown>;
 * }} [options]
 */
export async function websiteQrRebuildPlan(options = {}) {
  const rootDir = options.rootDir ?? root;
  const vendorPath = resolve(rootDir, WEBSITE_QR_VENDOR);
  const qrcodeInstalled = existsSync(resolve(rootDir, 'node_modules/qrcode'));
  const vendorExists = existsSync(vendorPath);

  let rollupUsable = false;
  if (qrcodeInstalled) {
    try {
      await (options.importRollup ?? (() => import('rollup')))();
      rollupUsable = true;
    } catch {
      rollupUsable = false;
    }
  }

  if (qrcodeInstalled && rollupUsable) {
    return { action: 'rebuild', vendorPath };
  }
  if (vendorExists) {
    return {
      action: 'use-committed',
      vendorPath,
      reason: qrcodeInstalled ? 'rollup-unusable' : 'no-qrcode-package'
    };
  }
  return { action: 'fail', vendorPath };
}

/** If a rebuild was attempted and failed, keep shipping the committed file. */
export function websiteQrAfterFailedRebuild(vendorExists) {
  return vendorExists
    ? { action: 'use-committed', reason: 'rebuild-failed' }
    : { action: 'fail' };
}
