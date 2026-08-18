import { readFileSync } from 'node:fs';
import { parseEmailList } from './email-lists.mjs';

/** @typedef {string | boolean | string[]} SiteFieldValue */

/**
 * Parse platform/sites.yaml (fixed manifest shape used by this repo).
 * @param {string} filePath
 * @returns {Record<string, Record<string, SiteFieldValue>>}
 */
export function loadSitesYaml(filePath) {
  const text = readFileSync(filePath, 'utf8');
  /** @type {Record<string, Record<string, SiteFieldValue>>} */
  const sites = {};
  let current = null;
  /** @type {'owner_emails' | 'sitter_emails' | null} */
  let arrayField = null;

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const siteMatch = line.match(/^ {2}([a-z0-9_-]+):\s*$/);
    if (siteMatch) {
      current = siteMatch[1];
      sites[current] = {};
      arrayField = null;
      continue;
    }

    const arrayItemMatch = line.match(/^ {6}- (.+?)\s*(?:#.*)?$/);
    if (current && arrayField && arrayItemMatch) {
      const value = arrayItemMatch[1].trim().replace(/^["']|["']$/g, '');
      const existing = sites[current][arrayField];
      if (!Array.isArray(existing)) {
        sites[current][arrayField] = [];
      }
      /** @type {string[]} */ (sites[current][arrayField]).push(value);
      continue;
    }

    const arrayStartMatch = line.match(/^ {4}(owner_emails|sitter_emails):\s*$/);
    if (current && arrayStartMatch) {
      arrayField = /** @type {'owner_emails' | 'sitter_emails'} */ (arrayStartMatch[1]);
      sites[current][arrayField] = [];
      continue;
    }

    arrayField = null;

    const kvMatch = line.match(/^ {4}([a-z_]+):\s*(.+?)\s*(?:#.*)?$/);
    if (current && kvMatch) {
      const key = kvMatch[1];
      let value = kvMatch[2].trim();
      if (value === 'true') sites[current][key] = true;
      else if (value === 'false') sites[current][key] = false;
      else if (key === 'owner_emails' || key === 'sitter_emails') {
        sites[current][key] = parseEmailList(value.replace(/^["']|["']$/g, ''));
      } else sites[current][key] = value.replace(/^["']|["']$/g, '');
    }
  }

  return sites;
}
