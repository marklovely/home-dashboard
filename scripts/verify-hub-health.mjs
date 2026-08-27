#!/usr/bin/env node
/**
 * Post-provision smoke checks for a household hub URL.
 *
 * Usage:
 *   node scripts/verify-hub-health.mjs https://smith.lovely-hub.com
 *   node scripts/verify-hub-health.mjs smith.lovely-hub.com
 */
const rawUrl = process.argv[2]?.trim();
if (!rawUrl) {
  console.error('Usage: node scripts/verify-hub-health.mjs <hub-url>');
  process.exit(1);
}

const baseUrl = rawUrl.startsWith('http') ? rawUrl.replace(/\/+$/, '') : `https://${rawUrl.replace(/\/+$/, '')}`;

/** @type {{ name: string, ok: boolean, detail: string }[]} */
const results = [];

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail });
    console.log(`✓ ${name}: ${detail}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    results.push({ name, ok: false, detail });
    console.error(`✗ ${name}: ${detail}`);
  }
}

await check('Hub URL responds', async () => {
  const response = await fetch(baseUrl, { redirect: 'follow' });
  if (!response.ok && response.status !== 401 && response.status !== 403) {
    throw new Error(`GET ${baseUrl} returned ${response.status}`);
  }
  return `HTTP ${response.status}`;
});

await check('Worker health API', async () => {
  const response = await fetch(`${baseUrl}/api/health`, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = await response.json();
  if (body?.status !== 'ok' && body?.ok !== true) {
    throw new Error(`Unexpected body: ${JSON.stringify(body)}`);
  }
  return 'healthy';
});

await check('Runtime config', async () => {
  const response = await fetch(`${baseUrl}/runtime-config.json`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = await response.json();
  const hubEnvironment = body?.hubEnvironment ?? body?.hub_environment;
  if (!hubEnvironment) throw new Error('hubEnvironment missing from runtime-config.json');
  return String(hubEnvironment);
});

const failed = results.filter((result) => !result.ok);
if (failed.length) {
  console.error(`\n${failed.length} check(s) failed. Fix infrastructure before owner onboarding.`);
  process.exit(1);
}

console.log('\nHub infrastructure looks ready. Continue with owner setup wizard and sitter acceptance tests.');
console.log('See docs/customer-hub-playbook.md for the full checklist.');
