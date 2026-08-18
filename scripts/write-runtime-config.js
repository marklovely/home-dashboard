import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const outPath = join(projectRoot, 'src/public/runtime-config.json');
const apiBaseUrl = String(process.env.VITE_API_BASE_URL ?? '')
  .trim()
  .replace(/\/$/, '');
const hubEnvironmentRaw = String(process.env.VITE_HUB_ENVIRONMENT ?? 'production')
  .trim()
  .toLowerCase();

const SITE_ID_RE = /^[a-z][a-z0-9_-]{0,31}$/;

/** @param {string} raw */
function normalizeHubEnvironment(raw) {
  if (raw === 'prod') return 'production';
  if (raw === 'production' || raw === 'test' || raw === 'staging' || raw === 'sandbox') return raw;
  if (SITE_ID_RE.test(raw)) return raw;
  return 'production';
}

const hubEnvironment = normalizeHubEnvironment(hubEnvironmentRaw);

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify({ apiBaseUrl, hubEnvironment }, null, 2)}\n`);
