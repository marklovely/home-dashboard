/**
 * @param {string} query
 * @param {import('../content/houseguide/pages.js').HouseGuidePageDefinition[]} pages
 * @param {Map<string, string>} markdownBySlug
 * @returns {Set<string>} slugs that match the query (all pages when query is empty)
 */
export function searchHouseGuidePages(query, pages, markdownBySlug) {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return new Set(pages.map((page) => page.slug));
  }

  const matches = new Set();
  for (const page of pages) {
    const markdown = markdownBySlug.get(page.slug) ?? '';
    const haystack = `${page.title} ${page.shortTitle} ${markdown}`.toLowerCase();
    if (haystack.includes(trimmed)) {
      matches.add(page.slug);
    }
  }
  return matches;
}

/**
 * @param {string} text
 * @param {string} query
 * @returns {string}
 */
export function highlightSearchText(text, query) {
  const trimmed = query.trim();
  if (!trimmed) return text;

  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(${escaped})`, 'ig');
  return text.replace(pattern, '<mark class="guide-search-mark">$1</mark>');
}
