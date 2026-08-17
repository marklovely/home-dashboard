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
const allowed = new Set(['production', 'prod', 'test', 'staging', 'sandbox']);
const hubEnvironment = allowed.has(hubEnvironmentRaw)
  ? hubEnvironmentRaw === 'prod'
    ? 'production'
    : hubEnvironmentRaw
  : 'production';

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify({ apiBaseUrl, hubEnvironment }, null, 2)}\n`);
