import { getActiveGuideCatalog } from '../../../services/guideContentService.js';
import { searchTopicsInCatalog } from './jsonGuideProvider.js';

/** @type {Map<string, { topic: import('../../../types/guideContent.js').GuideTopic, category: import('../../../types/guideContent.js').GuideCategory }>} */
let topicIndex = new Map();

function rebuildIndex() {
  topicIndex = new Map();
  const catalog = getActiveGuideCatalog();
  for (const category of catalog.categories) {
    for (const topic of category.topics) {
      topicIndex.set(topic.id, { topic, category });
    }
  }
}

function ensureIndex() {
  if (topicIndex.size === 0) rebuildIndex();
}

/**
 * @returns {import('../../../types/guideContent.js').GuideCategory[]}
 */
export function listCategoriesFromApi() {
  rebuildIndex();
  return getActiveGuideCatalog().categories;
}

/**
 * @param {string} categoryId
 */
export function getCategoryFromApi(categoryId) {
  ensureIndex();
  return getActiveGuideCatalog().categories.find((category) => category.id === categoryId);
}

/**
 * @param {import('../../../types/guideContent.js').GuideTopic} topic
 * @param {import('../../../types/guideContent.js').GuideCategory} category
 */
function toTopicCard(topic, category) {
  return {
    id: topic.id,
    title: topic.title,
    cardSubtitle: topic.subtitle,
    categoryId: category.id,
    categoryTitle: category.title,
    iconId: category.iconId,
    accent: category.accent,
    searchTerms: [...(category.searchTerms ?? []), ...(topic.searchTerms ?? [])]
  };
}

/**
 * @returns {import('../../../types/guideContent.js').GuideTopicSearchHit[]}
 */
export function listTopicCardsFromApi() {
  rebuildIndex();
  return [...topicIndex.values()].map(({ topic, category }) => toTopicCard(topic, category));
}

/**
 * @param {string} topicId
 */
export function getTopicFromApi(topicId) {
  ensureIndex();
  return topicIndex.get(topicId)?.topic;
}

/**
 * @param {string} topicId
 */
export function getTopicContextFromApi(topicId) {
  ensureIndex();
  return topicIndex.get(topicId);
}

/**
 * @returns {{ title: string, subtitle: string }}
 */
export function getHomeSummaryFromApi() {
  const catalog = getActiveGuideCatalog();
  return {
    title: catalog.homeSummaryTitle,
    subtitle: catalog.homeSummarySubtitle
  };
}

/**
 * @returns {Record<string, { file: string, alt: string, hasUpload?: boolean }>}
 */
export function getGuideMediaCatalogFromApi() {
  return getActiveGuideCatalog().media ?? {};
}

/** Called when remote catalog updates */
export function invalidateApiGuideIndex() {
  topicIndex = new Map();
}

export function searchTopicsFromApi(query) {
  rebuildIndex();
  return searchTopicsInCatalog(getActiveGuideCatalog(), query);
}
