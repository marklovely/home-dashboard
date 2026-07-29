import { HOUSE_GUIDE_PAGES } from './pages.js';

const markdownModules = import.meta.glob('./*.md', {
  query: '?raw',
  import: 'default',
  eager: true
});

/** @type {Map<string, string>} */
const markdownBySlug = new Map(
  Object.entries(markdownModules).map(([path, raw]) => {
    const slug = path.replace(/^\.\/(.+)\.md$/, '$1');
    return [slug, raw];
  })
);

/**
 * @param {string} slug
 * @returns {string}
 */
export function getHouseGuideMarkdown(slug) {
  return markdownBySlug.get(slug) ?? 'Content coming soon.';
}

/**
 * @returns {import('./pages.js').HouseGuidePageDefinition[]}
 */
export function listHouseGuidePages() {
  return HOUSE_GUIDE_PAGES;
}

/**
 * @param {string} slug
 * @returns {import('./pages.js').HouseGuidePageDefinition | undefined}
 */
export function getHouseGuidePage(slug) {
  return HOUSE_GUIDE_PAGES.find((page) => page.slug === slug);
}

/**
 * @returns {{ pages: import('./pages.js').HouseGuidePageDefinition[], markdownBySlug: Map<string, string> }}
 */
export function loadHouseGuideCatalog() {
  return {
    pages: HOUSE_GUIDE_PAGES,
    markdownBySlug: new Map(
      HOUSE_GUIDE_PAGES.map((page) => [page.slug, getHouseGuideMarkdown(page.slug)])
    )
  };
}

export { HOUSE_GUIDE_PAGES };
