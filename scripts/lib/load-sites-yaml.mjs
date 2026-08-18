import { readFileSync } from 'node:fs';

/**
 * Parse platform/sites.yaml (fixed manifest shape used by this repo).
 * @param {string} filePath
 */
export function loadSitesYaml(filePath) {
  const text = readFileSync(filePath, 'utf8');
  /** @type {Record<string, Record<string, string | boolean>>} */
  const sites = {};
  let current = null;

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const siteMatch = line.match(/^ {2}([a-z0-9_-]+):\s*$/);
    if (siteMatch) {
      current = siteMatch[1];
      sites[current] = {};
      continue;
    }

    const kvMatch = line.match(/^ {4}([a-z_]+):\s*(.+?)\s*(?:#.*)?$/);
    if (current && kvMatch) {
      const key = kvMatch[1];
      let value = kvMatch[2].trim();
      if (value === 'true') sites[current][key] = true;
      else if (value === 'false') sites[current][key] = false;
      else sites[current][key] = value.replace(/^["']|["']$/g, '');
    }
  }

  return sites;
}
