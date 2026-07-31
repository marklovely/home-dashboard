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
 * @param {unknown} value
 */
export function sanitizeAudience(value) {
  if (value === 'owner' || value === 'guest') return value;
  return null;
}

/**
 * @param {unknown} value
 */
export function sanitizeGuideActions(value) {
  if (!Array.isArray(value)) return null;
  if (value.length > 12) return null;

  /** @type {Record<string, unknown>[]} */
  const out = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const type = String(item.type ?? '');

    if (type === 'alexa') {
      const buttonId = Number(item.buttonId);
      const label = sanitizeRequiredText(item.label, 80);
      if (!Number.isInteger(buttonId) || buttonId < 1 || buttonId > 99 || !label) return null;
      out.push({ type: 'alexa', buttonId, label });
      continue;
    }

    if (type === 'navigate') {
      const topicId = sanitizeMediaId(String(item.topicId ?? ''));
      const label = sanitizeRequiredText(item.label, 80);
      if (!topicId || !label) return null;
      out.push({ type: 'navigate', topicId, label });
      continue;
    }

    if (type === 'panel') {
      const label = sanitizeRequiredText(item.label, 80);
      if (!label) return null;
      const heading = item.heading ? sanitizeRequiredText(item.heading, 120) : undefined;
      if (item.heading && !heading) return null;
      if (!Array.isArray(item.items) || item.items.length > 24) return null;
      const items = item.items
        .map((row) => {
          if (!row || typeof row !== 'object') return null;
          const rowLabel = sanitizeRequiredText(row.label, 80);
          const rowValue = sanitizeRequiredText(row.value, 240);
          if (!rowLabel || !rowValue) return null;
          return { label: rowLabel, value: rowValue };
        })
        .filter(Boolean);
      out.push({
        type: 'panel',
        label,
        ...(heading ? { heading } : {}),
        items
      });
      continue;
    }

    return null;
  }

  return out;
}

/**
 * @param {string} filename
 */
export function sanitizeOriginalFilename(filename) {
  const base = String(filename ?? '').split(/[/\\]/).pop() ?? '';
  const cleaned = base.replace(/[^\w.\- ()]/g, '_').slice(0, 180);
  return cleaned || 'image.jpg';
}
