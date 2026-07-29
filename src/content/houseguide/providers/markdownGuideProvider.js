/**
 * Legacy Markdown adapter — runtime content lives in guide-catalog.json.
 */
import { listCategoriesFromJson } from './providers/jsonGuideProvider.js';

export function getMarkdownProviderNote() {
  return 'Legacy Markdown under src/content/houseguide/*.md is source material only; normalize via npm run guide:extract.';
}

export function listTopicsFromMarkdown() {
  return listCategoriesFromJson().flatMap((category) => category.topics);
}

export { HOUSE_GUIDE_PAGES } from '../pages.js';
