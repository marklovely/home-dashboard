/**
 * Patch [env.{siteId}.vars] key/value pairs in worker/wrangler.toml.
 */

/**
 * @param {string} value
 */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @param {string} value
 */
function escapeTomlString(value) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * @param {string} toml
 * @returns {{ start: number, end: number, body: string } | null}
 */
export function findTopLevelVarsBlock(toml) {
  const header = '[vars]';
  const headerIdx = toml.indexOf(`\n${header}\n`);
  const atStart = toml.startsWith(`${header}\n`);
  const resolvedIdx = atStart ? 0 : headerIdx === -1 ? -1 : headerIdx + 1;
  if (resolvedIdx === -1) return null;

  const bodyStart = resolvedIdx + header.length + 1;
  const rest = toml.slice(bodyStart);
  const nextSection = rest.search(/\n\[(\[\])?/);
  const bodyEnd = nextSection === -1 ? toml.length : bodyStart + nextSection;

  return {
    start: resolvedIdx,
    end: bodyEnd,
    body: toml.slice(bodyStart, bodyEnd)
  };
}

/**
 * @param {string} toml
 * @param {string} key
 * @param {string} value
 */
export function upsertTopLevelVar(toml, key, value) {
  const block = findTopLevelVarsBlock(toml);
  if (!block) return toml;

  const header = '[vars]';
  const assignment = `${key} = "${escapeTomlString(value)}"`;
  const keyLineRe = new RegExp(`^${escapeRegExp(key)}\\s*=.*\\n?`, 'gm');
  let body = block.body.replace(keyLineRe, '').trim();
  const nextBody = body ? `${body}\n${assignment}\n` : `${assignment}\n`;

  return `${toml.slice(0, block.start)}${header}\n${nextBody}${toml.slice(block.end)}`;
}

/**
 * @param {string} toml
 * @returns {string}
 */
export function dedupeTopLevelVarsBlock(toml) {
  const block = findTopLevelVarsBlock(toml);
  if (!block) return toml;

  /** @type {Map<string, string>} */
  const entries = new Map();

  for (const line of block.body.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^([A-Z0-9_]+)\s*=\s*".*"$/);
    if (match) entries.set(match[1], trimmed);
  }

  if (entries.size === 0) return toml;

  const header = '[vars]';
  const body = `${[...entries.values()].join('\n')}\n`;
  return `${toml.slice(0, block.start)}${header}\n${body}${toml.slice(block.end)}`;
}

/**
 * @param {string} toml
 * @param {string} siteId
 * @returns {{ start: number, end: number, body: string } | null}
 */
export function findEnvVarsBlock(toml, siteId) {
  const header = `[env.${siteId}.vars]`;
  const headerIdx = toml.indexOf(header);
  if (headerIdx === -1) return null;

  const bodyStart = headerIdx + header.length;
  const rest = toml.slice(bodyStart);
  const nextSection = rest.search(/\n\[(\[\])?/);
  const bodyEnd = nextSection === -1 ? toml.length : bodyStart + nextSection;

  return {
    start: headerIdx,
    end: bodyEnd,
    body: toml.slice(bodyStart, bodyEnd)
  };
}

/**
 * @param {string} toml
 * @param {string} siteId
 * @param {string} key
 * @param {string} value
 */
export function upsertEnvVar(toml, siteId, key, value) {
  const block = findEnvVarsBlock(toml, siteId);
  if (!block) return toml;

  const header = `[env.${siteId}.vars]`;
  const assignment = `${key} = "${escapeTomlString(value)}"`;
  const keyLineRe = new RegExp(`^${escapeRegExp(key)}\\s*=.*\\n?`, 'gm');
  let body = block.body.replace(keyLineRe, '').trim();
  const nextBody = body ? `${body}\n${assignment}\n` : `${assignment}\n`;

  return `${toml.slice(0, block.start)}${header}\n${nextBody}${toml.slice(block.end)}`;
}

/**
 * Remove duplicate keys in [env.{siteId}.vars], keeping the last assignment for each key.
 *
 * @param {string} toml
 * @param {string} siteId
 */
export function dedupeEnvVarsBlock(toml, siteId) {
  const block = findEnvVarsBlock(toml, siteId);
  if (!block) return toml;

  /** @type {Map<string, string>} */
  const entries = new Map();
  /** @type {string[]} */
  const blanks = [];

  for (const line of block.body.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) {
      blanks.push('');
      continue;
    }
    const match = trimmed.match(/^([A-Z0-9_]+)\s*=\s*".*"$/);
    if (match) {
      entries.set(match[1], trimmed);
      continue;
    }
    blanks.push(line);
  }

  if (entries.size === 0) return toml;

  const header = `[env.${siteId}.vars]`;
  const body = `${[...entries.values()].join('\n\n')}\n`;
  return `${toml.slice(0, block.start)}${header}\n${body}${toml.slice(block.end)}`;
}
