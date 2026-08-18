const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @param {string | string[] | undefined | null} input
 * @returns {string[]}
 */
export function parseEmailList(input) {
  if (Array.isArray(input)) {
    return input.map(normalizeEmail).filter(Boolean);
  }
  if (input === undefined || input === null) return [];
  const text = String(input).trim();
  if (!text) return [];
  return text
    .split(/[,;\n]+/)
    .map(normalizeEmail)
    .filter(Boolean);
}

/**
 * @param {string | string[] | undefined | null} input
 * @returns {string}
 */
export function formatEmailList(input) {
  return parseEmailList(input).join(',');
}

/**
 * @param {string} email
 */
function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

/**
 * @param {string | string[] | undefined | null} emails
 * @param {{ required?: boolean }} [options]
 * @returns {string | null}
 */
export function validateEmailList(emails, options = {}) {
  const list = parseEmailList(emails);
  if (options.required && list.length === 0) {
    return 'At least one owner email is required.';
  }
  for (const email of list) {
    if (!EMAIL_RE.test(email)) {
      return `Invalid email address: ${email}`;
    }
  }
  return null;
}
