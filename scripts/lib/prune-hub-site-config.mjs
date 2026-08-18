/**
 * Remove a site block from hub tfvars text (example or local hub.tfvars).
 *
 * @param {string} text
 * @param {string} siteId
 */
export function removeHubTfvarsSiteBlock(text, siteId) {
  const blockRe = new RegExp(`\\n  ${siteId} = \\{[\\s\\S]*?\\n  \\}`, 'm');
  const next = text.replace(blockRe, '\n');
  return {
    text: next,
    changed: next !== text
  };
}

/**
 * @param {string | undefined} rawJson
 * @param {string} siteId
 */
export function pruneHubProxySecretsJson(rawJson, siteId) {
  const trimmed = rawJson?.trim();
  if (!trimmed) {
    return { changed: false, value: null };
  }

  /** @type {Record<string, string>} */
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error('HUB_PROXY_SECRETS_JSON must be valid JSON.');
  }

  if (!Object.prototype.hasOwnProperty.call(parsed, siteId)) {
    return { changed: false, value: trimmed };
  }

  const next = { ...parsed };
  delete next[siteId];
  return { changed: true, value: JSON.stringify(next) };
}
