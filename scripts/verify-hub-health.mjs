#!/usr/bin/env node
/**
 * Post-provision smoke checks for a household hub URL.
 *
 * Hub sites are Cloudflare Access–protected. Without a service token, /api/health
 * returns a login redirect (HTML) — that still means DNS, Pages, and Access are up.
 * For full API checks, set CF_ACCESS_CLIENT_ID + CF_ACCESS_CLIENT_SECRET (platform
 * health service token from Terraform, or any token allowed by the hub Access app).
 *
 * Usage:
 *   node scripts/verify-hub-health.mjs https://smith.lovely-hub.com
 *   CF_ACCESS_CLIENT_ID=... CF_ACCESS_CLIENT_SECRET=... node scripts/verify-hub-health.mjs smith.lovely-hub.com
 */
const rawUrl = process.argv[2]?.trim();
if (!rawUrl) {
  console.error('Usage: node scripts/verify-hub-health.mjs <hub-url>');
  process.exit(1);
}

const baseUrl = rawUrl.startsWith('http') ? rawUrl.replace(/\/+$/, '') : `https://${rawUrl.replace(/\/+$/, '')}`;

/** @type {{ name: string, ok: boolean, detail: string }[]} */
const results = [];

/**
 * @returns {{ clientId: string, clientSecret: string } | null}
 */
function readAccessServiceAuth() {
  const clientId =
    process.env.CF_ACCESS_CLIENT_ID?.trim() ||
    process.env.PLATFORM_HEALTH_CF_ACCESS_CLIENT_ID?.trim();
  const clientSecret =
    process.env.CF_ACCESS_CLIENT_SECRET?.trim() ||
    process.env.PLATFORM_HEALTH_CF_ACCESS_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

/**
 * @param {Response} response
 */
function isCloudflareAccessRedirect(response) {
  if (response.status < 300 || response.status >= 400) return false;
  const location = response.headers.get('location') ?? '';
  return /cloudflareaccess\.com/i.test(location);
}

/**
 * @param {string} path
 * @param {RequestInit} [init]
 */
async function hubFetch(path, init = {}) {
  const auth = readAccessServiceAuth();
  const headers = new Headers(init.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  if (auth) {
    headers.set('CF-Access-Client-Id', auth.clientId);
    headers.set('CF-Access-Client-Secret', auth.clientSecret);
  }
  return fetch(`${baseUrl}${path}`, { ...init, headers, redirect: 'manual' });
}

/**
 * @param {Response} response
 */
async function readJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    const preview = text.replace(/\s+/g, ' ').slice(0, 80);
    throw new Error(`Expected JSON, got HTTP ${response.status}: ${preview}`);
  }
}

/**
 * @param {string} name
 * @param {() => Promise<string>} fn
 */
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

const accessGateOnly = !readAccessServiceAuth();

await check('Hub URL responds', async () => {
  const response = await hubFetch('/');
  if (response.ok) return `HTTP ${response.status}`;
  if (isCloudflareAccessRedirect(response)) return `HTTP ${response.status} → Cloudflare Access login`;
  if (response.status === 401 || response.status === 403) return `HTTP ${response.status}`;
  throw new Error(`GET ${baseUrl} returned ${response.status}`);
});

await check('Worker health API', async () => {
  const response = await hubFetch('/api/health');
  if (isCloudflareAccessRedirect(response)) {
    if (accessGateOnly) {
      return 'Cloudflare Access gate active (sign in in browser to use the hub)';
    }
    throw new Error('Cloudflare Access rejected the service token');
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = await readJson(response);
  if (body?.status !== 'ok' && body?.ok !== true) {
    throw new Error(`Unexpected body: ${JSON.stringify(body)}`);
  }
  return 'healthy';
});

await check('Runtime config', async () => {
  const response = await hubFetch('/runtime-config.json', { cache: 'no-store' });
  if (isCloudflareAccessRedirect(response)) {
    if (accessGateOnly) {
      return 'Cloudflare Access gate active (expected before first owner sign-in)';
    }
    throw new Error('Cloudflare Access rejected the service token');
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = await readJson(response);
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
if (accessGateOnly) {
  console.log(
    'Open the hub URL in a browser and complete Cloudflare Access OTP as an owner email to finish verification.'
  );
  console.log(
    'Optional: set CF_ACCESS_CLIENT_ID + CF_ACCESS_CLIENT_SECRET (platform health service token) for automated API probes.'
  );
}
console.log('See docs/customer-hub-playbook.md for the full checklist.');
