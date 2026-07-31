/**
 * @param {string} value
 * @param {number} maxLength
 */
export function sanitizeRequiredText(value, maxLength = 200) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

/**
 * @param {unknown} value
 * @param {number} maxLength
 */
export function sanitizeOptionalText(value, maxLength = 500) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

/**
 * @param {unknown} value
 */
export function sanitizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
    .slice(0, 40);
}

/**
 * @param {unknown} value
 */
export function sanitizeBlocks(value) {
  if (!Array.isArray(value)) return null;
  if (value.length > 80) return null;
  return value;
}

/**
 * @param {string} value
 */
export function sanitizeMediaId(value) {
  const text = String(value ?? '').trim();
  if (!/^[a-z0-9-]{1,64}$/i.test(text)) return null;
  return text;
}

/**
 * @param {string} filename
 */
export function sanitizeOriginalFilename(filename) {
  const base = String(filename ?? '').split(/[/\\]/).pop() ?? '';
  const cleaned = base.replace(/[^\w.\- ()]/g, '_').slice(0, 180);
  return cleaned || 'image.jpg';
}
