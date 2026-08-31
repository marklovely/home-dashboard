import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * @param {string} root
 * @param {string} version
 */
export function writeWebsiteVersion(root, version) {
  const payload = `${JSON.stringify({ version: String(version).trim() }, null, 2)}\n`;
  writeFileSync(join(root, 'website/version.json'), payload);
}
