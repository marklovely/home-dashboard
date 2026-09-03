#!/usr/bin/env node
/**
 * Delete hub Pages deployments before terraform destroy (Cloudflare 8000076).
 *
 * Usage: node scripts/prune-hub-pages-deployments.mjs <site_id>
 */
import { prunePagesProjectDeployments } from './lib/cloudflare-pages-api.mjs';
import { resolveHubSitePagesProject } from './lib/hub-site-pages-project.mjs';

const siteId = process.argv[2]?.trim();
if (!siteId) {
  console.error('Usage: node scripts/prune-hub-pages-deployments.mjs <site_id>');
  process.exit(1);
}

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim() ?? '';
const token = process.env.CLOUDFLARE_API_TOKEN?.trim() ?? '';
if (!accountId || !token) {
  console.error('CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required.');
  process.exit(1);
}

const { pagesProject, source } = resolveHubSitePagesProject(siteId);

try {
  const result = await prunePagesProjectDeployments(pagesProject, {
    accountId,
    token,
    onProgress: (message) => console.log(message)
  });
  console.log(
    `Pruned Pages deployments for ${siteId}: ${result.pagesProject} (${result.deleted} deleted, ${result.remaining} remaining; source=${source}).`
  );
  if (result.remaining > 0) {
    console.error(
      `Pages project ${result.pagesProject} still has ${result.remaining} deployment(s); terraform destroy may fail with Cloudflare 8000076.`
    );
    process.exit(1);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
