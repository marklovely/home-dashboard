/**
 * Resolve and empty per-hub R2 buckets (guides + media) before terraform destroy.
 */
import { emptyR2Bucket } from './cloudflare-r2-api.mjs';
import { resolveSiteArchiveContract } from './resolve-site-archive-contract.mjs';

/**
 * @param {string} siteId
 */
export function defaultHubSiteR2BucketNames(siteId) {
  const id = siteId.trim();
  if (id === 'production') {
    return {
      guides: 'lovely-home-appliance-guides',
      media: 'lovely-home-guide-media'
    };
  }
  return {
    guides: `lovely-home-appliance-guides-${id}`,
    media: `lovely-home-guide-media-${id}`
  };
}

/**
 * @param {string} siteId
 * @returns {{ guides: string, media: string, source: 'terraform' | 'manifest' | 'registry' | 'default' }}
 */
export function resolveHubSiteR2BucketNames(siteId) {
  const resolved = resolveSiteArchiveContract(siteId);
  const guides = String(resolved?.site?.r2_guides_bucket ?? '').trim();
  const media = String(resolved?.site?.r2_media_bucket ?? '').trim();
  if (guides && media) {
    return {
      guides,
      media,
      source: resolved?.source ?? 'default'
    };
  }

  const defaults = defaultHubSiteR2BucketNames(siteId);
  return { ...defaults, source: 'default' };
}

/**
 * @param {string} siteId
 * @param {{ accountId: string, token: string, onProgress?: (message: string) => void }} options
 */
export async function emptyHubSiteR2Buckets(siteId, options) {
  const { guides, media, source } = resolveHubSiteR2BucketNames(siteId);
  options.onProgress?.(
    `Emptying hub R2 buckets for "${siteId}" (${guides}, ${media}; source=${source})`
  );

  let deleted = 0;
  for (const bucketName of [guides, media]) {
    deleted += await emptyR2Bucket(bucketName, options);
  }
  return { guides, media, deleted, source };
}
