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
 * @returns {{ start: number, end: number, body: string } | null}
 */
export function findWranglerEnvBlockSlice(text, siteId) {
  const header = `[env.${siteId}]`;
  const start = text.indexOf(header);
  if (start === -1) return null;

  const slice = text.slice(start);
  const nextMatch = slice.slice(header.length).search(/\n\[env\.|\n# ---/);
  const end = nextMatch === -1 ? text.length : start + header.length + nextMatch;

  return {
    start,
    end,
    body: text.slice(start, end)
  };
}

/**
 * @param {string} toml
 * @param {string} siteId
 * @param {string} databaseId
 * @param {string} [databaseName]
 * @returns {{ toml: string, changed: boolean }}
 */
export function patchEnvD1FromTerraform(toml, siteId, databaseId, databaseName = '') {
  const block = findWranglerEnvBlockSlice(toml, siteId);
  if (!block) return { toml, changed: false };

  let nextBody = block.body.replace(
    /REPLACE_AFTER_(?:PROVISION_[A-Z0-9_-]+|TERRAFORM_APPLY)/g,
    databaseId
  );
  nextBody = nextBody.replace(/database_id\s*=\s*"[^"]+"/g, `database_id = "${databaseId}"`);
  if (databaseName) {
    nextBody = nextBody.replace(/database_name\s*=\s*"[^"]+"/g, `database_name = "${databaseName}"`);
  }

  const changed = nextBody !== block.body;
  return {
    toml: `${toml.slice(0, block.start)}${nextBody}${toml.slice(block.end)}`,
    changed
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
