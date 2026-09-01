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
