/**
 * @param {string} text
 * @param {string} query
 * @returns {string}
 */
export function highlightGuideText(text, query) {
  const trimmed = query.trim();
  if (!trimmed) return text;

  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(${escaped})`, 'ig');
  return text.replace(pattern, '<mark class="guide-search-mark">$1</mark>');
}
