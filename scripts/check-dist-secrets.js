import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const distDir = join(process.cwd(), 'dist');
const forbidden = [
  'VITE_VIRTUAL_BUTTONS_ACCESS_CODE',
  'VITE_OWNER_PIN',
  'PASTE_YOUR_VIRTUAL_BUTTONS',
  'api.virtualbuttons.com/v1'
];

function collectFiles(dir) {
  /** @type {string[]} */
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(full));
    else files.push(full);
  }
  return files;
}

let failed = false;
for (const file of collectFiles(distDir)) {
  if (!/\.(js|html|css|json)$/i.test(file)) continue;
  const text = readFileSync(file, 'utf8');
  for (const needle of forbidden) {
    if (text.includes(needle)) {
      console.error(`Forbidden pattern "${needle}" found in ${file}`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log('dist/ secret scan passed');
