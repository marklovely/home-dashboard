import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const outPath = join(projectRoot, 'src/public/runtime-config.json');
const apiBaseUrl = String(process.env.VITE_API_BASE_URL ?? '')
  .trim()
  .replace(/\/$/, '');

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify({ apiBaseUrl }, null, 2)}\n`);
