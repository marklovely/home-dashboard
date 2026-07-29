/**
 * Legacy Markdown content provider (adapter).
 * Converts Markdown files into guide pages for tooling/migration.
 * The interactive UI uses the JSON provider via guideService.
 */
import { HOUSE_GUIDE_PAGES } from '../pages.js';
import guideData from '../guide-data.json';

/** @type {import('../../../types/guideContent.js').GuideCatalog} */
const jsonCatalog = guideData;

/**
 * @returns {import('../../../types/guideContent.js').GuideTopicCard[]}
 */
export function listTopicsFromMarkdown() {
  return jsonCatalog.topics;
}

export function getMarkdownProviderNote() {
  return 'Markdown files under src/content/houseguide/*.md are legacy; normalize to guide-data.json for the app.';
}

export { HOUSE_GUIDE_PAGES };
