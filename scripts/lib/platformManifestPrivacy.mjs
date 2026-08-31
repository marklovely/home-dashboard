/**
 * Keep personal data out of the committed platform manifest.
 *
 * `platform-admin/public/platform-manifest.json` is committed to a public
 * repository, so it must never carry customer email addresses. Owner emails
 * live in the platform billing database and are read at provision time; the
 * platform admin UI reads them from the billing API, which sits behind Access.
 */

/** Manifest/contract keys that hold email addresses. */
export const MANIFEST_EMAIL_KEYS = new Set([
  'owner_emails',
  'ownerEmails',
  'sitter_emails',
  'sitterEmails',
  'tester_emails',
  'testerEmails',
  'owner_email',
  'ownerEmail',
  'customer_email',
  'customerEmail'
]);

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

/**
 * Deep copy with every email-bearing key removed.
 *
 * @template T
 * @param {T} value
 * @returns {T}
 */
export function redactEmailFields(value) {
  if (Array.isArray(value)) {
    return /** @type {T} */ (value.map((item) => redactEmailFields(item)));
  }
  if (value && typeof value === 'object') {
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      if (MANIFEST_EMAIL_KEYS.has(key)) continue;
      out[key] = redactEmailFields(item);
    }
    return /** @type {T} */ (out);
  }
  return value;
}

/**
 * Every email address still reachable in a structure. Used as a build guard so
 * a new field can never quietly reintroduce personal data.
 *
 * @param {unknown} value
 * @returns {string[]}
 */
export function findEmailAddresses(value) {
  const found = new Set();
  walk(value);
  return [...found];

  /**
   * @param {unknown} node
   */
  function walk(node) {
    if (typeof node === 'string') {
      for (const match of node.matchAll(EMAIL_RE)) {
        found.add(match[0].toLowerCase());
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node && typeof node === 'object') {
      for (const [key, item] of Object.entries(node)) {
        walk(key);
        walk(item);
      }
    }
  }
}
