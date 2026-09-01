import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Shared R2 bucket for product brand + public marketing media (Worker binding BRAND_MEDIA). */
export const BRAND_MEDIA_BUCKET_NAME = 'lovely-home-media';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Source files in git that should also live in R2.
 * Hub chrome reads `lovely-home-logo.png`; the rest are brand + gallery objects.
 *
 * @returns {{ key: string, file: string, contentType: string }[]}
 */
export function listBrandMediaObjects() {
  return [
    {
      key: 'lovely-home-logo.png',
      file: join(root, 'assets/lovely-home-logo.png'),
      contentType: 'image/png'
    },
    {
      key: 'brand/lovely-home-mark.svg',
      file: join(root, 'website/lovely-home-mark.svg'),
      contentType: 'image/svg+xml'
    },
    {
      key: 'brand/lovely-home-icon.svg',
      file: join(root, 'website/lovely-home-icon.svg'),
      contentType: 'image/svg+xml'
    },
    {
      key: 'brand/favicon.png',
      file: join(root, 'website/favicon.png'),
      contentType: 'image/png'
    },
    {
      key: 'brand/og.png',
      file: join(root, 'website/lovely-home-og.png'),
      contentType: 'image/png'
    },
    {
      key: 'marketing/screenshots/guest-home.jpg',
      file: join(root, 'website/screenshots/guest-home.jpg'),
      contentType: 'image/jpeg'
    },
    {
      key: 'marketing/screenshots/house-guide.jpg',
      file: join(root, 'website/screenshots/house-guide.jpg'),
      contentType: 'image/jpeg'
    },
    {
      key: 'marketing/screenshots/scooter-care.jpg',
      file: join(root, 'website/screenshots/scooter-care.jpg'),
      contentType: 'image/jpeg'
    },
    {
      key: 'marketing/screenshots/appliance-manuals.jpg',
      file: join(root, 'website/screenshots/appliance-manuals.jpg'),
      contentType: 'image/jpeg'
    },
    {
      key: 'marketing/screenshots/emergency.jpg',
      file: join(root, 'website/screenshots/emergency.jpg'),
      contentType: 'image/jpeg'
    },
    {
      key: 'marketing/screenshots/settings.png',
      file: join(root, 'website/screenshots/settings.png'),
      contentType: 'image/png'
    }
  ];
}

/**
 * Wrangler 4 `r2 object put` does not accept `--account-id`.
 *
 * @param {string} objectPath bucket/key
 * @param {string} filePath
 * @param {string} contentType
 * @returns {string[]}
 */
export function wranglerBrandMediaPutArgs(objectPath, filePath, contentType) {
  return [
    'r2',
    'object',
    'put',
    objectPath,
    '--file',
    filePath,
    '--content-type',
    contentType,
    '--remote'
  ];
}
