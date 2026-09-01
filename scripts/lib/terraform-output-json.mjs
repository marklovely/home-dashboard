/**
 * Parse `terraform output -json` / `terraform output -json NAME`.
 *
 * HashiCorp setup-terraform's wrapper often wraps sensitive outputs as
 * `{ sensitive: true, type, value }` instead of the raw map. Named output
 * can also print a warning before the JSON object.
 */

/**
 * @param {string} raw
 * @returns {unknown}
 */
export function parseTerraformJsonOutput(raw) {
  const text = String(raw ?? '').trim();
  const brace = text.indexOf('{');
  const bracket = text.indexOf('[');
  let start = -1;
  if (brace >= 0 && (bracket < 0 || brace < bracket)) start = brace;
  else if (bracket >= 0) start = bracket;
  if (start < 0) {
    throw new Error('terraform output was not JSON.');
  }
  return unwrapTerraformJsonValue(JSON.parse(text.slice(start)));
}

/**
 * @param {unknown} parsed
 * @returns {unknown}
 */
export function unwrapTerraformJsonValue(parsed) {
  if (
    parsed &&
    typeof parsed === 'object' &&
    !Array.isArray(parsed) &&
    /** @type {{ sensitive?: unknown }} */ (parsed).sensitive === true &&
    Object.prototype.hasOwnProperty.call(parsed, 'value')
  ) {
    return /** @type {{ value: unknown }} */ (parsed).value;
  }
  return parsed;
}

/**
 * @param {unknown} parsed
 * @returns {Record<string, string>}
 */
export function terraformStringMap(parsed) {
  const value = unwrapTerraformJsonValue(parsed);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  /** @type {Record<string, string>} */
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (item == null) continue;
    const text =
      typeof item === 'string'
        ? item
        : item && typeof item === 'object' && !Array.isArray(item) && 'value' in item
          ? String(/** @type {{ value?: unknown }} */ (item).value ?? '')
          : String(item);
    const trimmed = text.trim();
    if (trimmed) out[key] = trimmed;
  }
  return out;
}

const HUB_SITE_MODULE_RE = /^module\.hub_site\["([^"]+)"\]$/;

/**
 * @param {unknown} attrs
 * @returns {string}
 */
function pagesHubProxySecretValue(attrs) {
  const envVars =
    attrs &&
    typeof attrs === 'object' &&
    /** @type {{ deployment_configs?: { production?: { env_vars?: Record<string, { value?: unknown } | string }> } }} */ (
      attrs
    ).deployment_configs?.production?.env_vars;
  if (!envVars || typeof envVars !== 'object') return '';
  const entry = envVars.HUB_PROXY_SECRET;
  if (typeof entry === 'string') return entry.trim();
  if (entry && typeof entry === 'object') return String(entry.value ?? '').trim();
  return '';
}

/**
 * Read hub proxy secrets from `terraform state pull` JSON (random_password
 * results, then Pages HUB_PROXY_SECRET). Does not log secret values.
 *
 * @param {string} raw
 * @returns {Record<string, string>}
 */
export function parseHubProxySecretsFromTerraformState(raw) {
  let state;
  try {
    state = JSON.parse(String(raw ?? ''));
  } catch {
    return {};
  }
  const resources = Array.isArray(state?.resources) ? state.resources : [];
  /** @type {Record<string, string>} */
  const fromPassword = {};
  /** @type {Record<string, string>} */
  const fromPages = {};
  for (const resource of resources) {
    const siteId = String(resource?.module ?? '').match(HUB_SITE_MODULE_RE)?.[1];
    if (!siteId) continue;
    const attrs = resource?.instances?.[0]?.attributes ?? {};
    if (resource.type === 'random_password' && resource.name === 'hub_proxy') {
      const result = String(attrs.result ?? '').trim();
      if (result) fromPassword[siteId] = result;
    }
    if (resource.type === 'cloudflare_pages_project') {
      const secret = pagesHubProxySecretValue(attrs);
      if (secret) fromPages[siteId] = secret;
    }
  }
  return { ...fromPages, ...fromPassword };
}
