import {
  getHomeSummaryFromJson,
  getPageFromJson,
  listTopicsFromJson,
  searchTopicsFromJson
} from '../content/houseguide/providers/jsonGuideProvider.js';

/**
 * Guide service — UI talks only to this layer, not to Markdown/JSON files directly.
 */

/**
 * @returns {import('../types/guideContent.js').GuideTopicCard[]}
 */
export function listGuideTopics() {
  return listTopicsFromJson();
}

/**
 * @param {string} topicId
 * @returns {import('../types/guideContent.js').GuidePage | undefined}
 */
export function getGuidePage(topicId) {
  return getPageFromJson(topicId);
}

/**
 * @returns {{ title: string, subtitle: string }}
 */
export function getGuideHomeSummary() {
  return getHomeSummaryFromJson();
}

/**
 * @param {string} query
 * @returns {import('../types/guideContent.js').GuideTopicCard[]}
 */
export function searchGuideTopics(query) {
  return searchTopicsFromJson(query);
}

/**
 * @param {string} query
 * @returns {import('../types/guideContent.js').GuideTopicCard | undefined}
 */
export function findBestGuideTopic(query) {
  const results = searchGuideTopics(query);
  return results[0];
}
