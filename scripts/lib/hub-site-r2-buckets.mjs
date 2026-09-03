/**
 * Resolve and empty per-hub R2 buckets (guides + media) before terraform destroy.
 */
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { emptyR2Bucket } from './cloudflare-r2-api.mjs';
import { readSiteContract } from './read-site-contract.mjs';
import { resolveSiteArchiveContract } from './resolve-site-archive-contract.mjs';
import { parseHubSiteR2BucketsFromTerraformState } from './terraform-output-json.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const tfDir = join(root, 'terraform');

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
 */
function readTerraformStateR2BucketNames(siteId) {
  try {
    const raw = execFileSync('terraform', ['state', 'pull'], {
      cwd: tfDir,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      timeout: 5000
    });
    return parseHubSiteR2BucketsFromTerraformState(raw, siteId);
  } catch {
    return null;
  }
}

/**
 * @param {string} siteId
 * @returns {{ guides: string, media: string, source: 'terraform' | 'manifest' | 'registry' | 'state' | 'default' }}
 */
export function resolveHubSiteR2BucketNames(siteId) {
  const contract = readSiteContract(siteId);
  const fromContractGuides = String(contract?.site?.r2_guides_bucket ?? '').trim();
  const fromContractMedia = String(contract?.site?.r2_media_bucket ?? '').trim();
  if (fromContractGuides && fromContractMedia) {
    return {
      guides: fromContractGuides,
      media: fromContractMedia,
      source: contract?.source ?? 'terraform'
    };
  }

  const fromState = readTerraformStateR2BucketNames(siteId);
  if (fromState) {
    return { ...fromState, source: 'state' };
  }

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
  /** @type {string[]} */
  const skippedMissing = [];
  for (const bucketName of [guides, media]) {
    const result = await emptyR2Bucket(bucketName, options);
    if (result.missing) {
      skippedMissing.push(bucketName);
      continue;
    }
    deleted += result.deleted;
  }
  return { guides, media, deleted, skippedMissing, source };
}
