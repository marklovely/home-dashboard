#!/usr/bin/env node
/**
 * Set CF_ACCESS_MANAGEMENT_TOKEN on the production (default) Worker.
 *
 * Usage:
 *   export CF_ACCESS_MANAGEMENT_TOKEN='…'   # or CLOUDFLARE_API_TOKEN with Zero Trust edit
 *   node scripts/set-production-access-sync-secret.mjs
 */
import { putWorkerSecret } from './lib/worker-secret-put.mjs';

const token =
  process.env.CF_ACCESS_MANAGEMENT_TOKEN?.trim() || process.env.CLOUDFLARE_API_TOKEN?.trim();

if (!token) {
  console.error('Set CF_ACCESS_MANAGEMENT_TOKEN or CLOUDFLARE_API_TOKEN.');
  process.exit(1);
}

putWorkerSecret(null, 'CF_ACCESS_MANAGEMENT_TOKEN', token);
console.log('Production Worker secret CF_ACCESS_MANAGEMENT_TOKEN set.');
