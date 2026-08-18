/**
 * Wrangler [env.{siteId}] block helpers for platform-site-manage.
 */

/**
 * @param {string} value
 */
function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * @param {string} siteId
 */
export function wranglerEnvBlockRegExp(siteId) {
  const label = capitalize(siteId);
  const escapedSiteId = siteId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `(?:# ---------------------------------------------------------------------------\\n# ${label} environment[\\s\\S]*?# ---------------------------------------------------------------------------\\n\\n)?` +
      `\\[env\\.${escapedSiteId}\\][\\s\\S]*?(?=\\n# ---------------------------------------------------------------------------\\n|$)`
  );
}

/**
 * @param {string} siteId
 */
function escapeRegExp(siteId) {
  return siteId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @param {string} text
 * @param {string} siteId
 */
export function removeWranglerEnvBlock(text, siteId) {
  let next = text.replace(wranglerEnvBlockRegExp(siteId), '');
  next = next.replace(
    new RegExp(
      `\\n# Provision: terraform apply \\+ node scripts/sync-wrangler-from-terraform\\.mjs ${escapeRegExp(siteId)}\\n# ---------------------------------------------------------------------------\\n`,
      'g'
    ),
    '\n'
  );
  next = next.replace(/\n{3,}/g, '\n\n');
  const normalized = next.trimEnd();
  return {
    text: normalized ? `${normalized}\n` : '',
    changed: normalized !== text.trimEnd()
  };
}

/**
 * @param {string} text
 * @param {string} siteId
 */
export function replaceWranglerEnvBlock(text, siteId, block) {
  const blockRe = wranglerEnvBlockRegExp(siteId);
  if (blockRe.test(text)) {
    return text.replace(blockRe, block.trimEnd());
  }
  return `${text.trimEnd()}\n\n${block}\n`;
}
