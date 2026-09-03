#!/usr/bin/env node
/**
 * Validate site_id for the hub-registry overlay workflow.
 * Customer hubs do not keep worker deploy scripts after teardown, so this
 * must not reuse the deploy-site validator.
 */
import { validateSiteId } from './lib/site-registry.mjs';

const siteId = String(process.env.SITE_ID ?? '').trim();
const error = validateSiteId(siteId);
if (error) {
  console.error(error);
  process.exit(1);
}

console.log(`Validated registry site_id=${siteId}`);
