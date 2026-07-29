/**
 * @param {string} email
 */
export function identityForLogs(email) {
  const normalized = email.trim().toLowerCase();
  const at = normalized.indexOf('@');
  if (at <= 0) return 'unknown';
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  const maskedLocal = local.length <= 2 ? '**' : `${local.slice(0, 1)}***`;
  return `${maskedLocal}@${domain}`;
}
