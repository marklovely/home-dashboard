import {
  getCategoryFromJson,
  getHomeSummaryFromJson,
  getTopicContextFromJson,
  getTopicFromJson,
  listCategoriesFromJson,
  listTopicCardsFromJson,
  searchTopicsFromJson
} from '../content/houseguide/providers/jsonGuideProvider.js';

/**
 * Guide service — UI talks only to this layer, not to raw JSON or PDF.
 */

/**
 * @returns {import('../types/guideContent.js').GuideCategory[]}
 */
export function listGuideCategories() {
  return listCategoriesFromJson();
}

/**
 * @param {string} categoryId
 * @returns {import('../types/guideContent.js').GuideCategory | undefined}
 */
export function getGuideCategory(categoryId) {
  return getCategoryFromJson(categoryId);
}

/**
 * @returns {import('../types/guideContent.js').GuideTopicSearchHit[]}
 */
export function listGuideTopics() {
  return listTopicCardsFromJson();
}

/**
 * @param {string} topicId
 * @returns {import('../types/guideContent.js').GuideTopic | undefined}
 */
export function getGuideTopic(topicId) {
  return getTopicFromJson(topicId);
}

/** @deprecated Use getGuideTopic */
export function getGuidePage(topicId) {
  return getGuideTopic(topicId);
}

/**
 * @param {string} topicId
 */
export function getGuideTopicContext(topicId) {
  return getTopicContextFromJson(topicId);
}

/**
 * @returns {{ title: string, subtitle: string }}
 */
export function getGuideHomeSummary() {
  return getHomeSummaryFromJson();
}

/**
 * @param {string} query
 * @returns {import('../types/guideContent.js').GuideTopicSearchHit[]}
 */
export function searchGuideTopics(query) {
  return searchTopicsFromJson(query);
}

/**
 * @param {string} query
 * @returns {import('../types/guideContent.js').GuideTopicSearchHit | undefined}
 */
export function findBestGuideTopic(query) {
  return searchGuideTopics(query)[0];
}
