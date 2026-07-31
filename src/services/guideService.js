import {
  getCategoryFromApi,
  getHomeSummaryFromApi,
  getTopicContextFromApi,
  getTopicFromApi,
  invalidateApiGuideIndex,
  listCategoriesFromApi,
  listTopicCardsFromApi,
  searchTopicsFromApi
} from '../content/houseguide/providers/apiGuideProvider.js';
import { subscribeToGuideContent } from './guideContentService.js';

subscribeToGuideContent(() => {
  invalidateApiGuideIndex();
});

/**
 * Guide service — UI talks only to this layer, not to raw JSON or storage.
 */

/**
 * @returns {import('../types/guideContent.js').GuideCategory[]}
 */
export function listGuideCategories() {
  return listCategoriesFromApi();
}

/**
 * @param {string} categoryId
 * @returns {import('../types/guideContent.js').GuideCategory | undefined}
 */
export function getGuideCategory(categoryId) {
  return getCategoryFromApi(categoryId);
}

/**
 * @returns {import('../types/guideContent.js').GuideTopicSearchHit[]}
 */
export function listGuideTopics() {
  return listTopicCardsFromApi();
}

/**
 * @param {string} topicId
 * @returns {import('../types/guideContent.js').GuideTopic | undefined}
 */
export function getGuideTopic(topicId) {
  return getTopicFromApi(topicId);
}

/** @deprecated Use getGuideTopic */
export function getGuidePage(topicId) {
  return getGuideTopic(topicId);
}

/**
 * @param {string} topicId
 */
export function getGuideTopicContext(topicId) {
  return getTopicContextFromApi(topicId);
}

/**
 * @returns {{ title: string, subtitle: string }}
 */
export function getGuideHomeSummary() {
  return getHomeSummaryFromApi();
}

/**
 * @param {string} query
 * @returns {import('../types/guideContent.js').GuideTopicSearchHit[]}
 */
export function searchGuideTopics(query) {
  return searchTopicsFromApi(query);
}

/**
 * @param {string} query
 * @returns {import('../types/guideContent.js').GuideTopicSearchHit | undefined}
 */
export function findBestGuideTopic(query) {
  return searchGuideTopics(query)[0];
}
