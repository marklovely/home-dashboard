/** @type {string | null} */
let pendingTopicId = null;

/**
 * @param {string} topicId
 */
export function setPendingGuideTopic(topicId) {
  pendingTopicId = topicId;
}

/**
 * @returns {string | null}
 */
export function consumePendingGuideTopic() {
  const topicId = pendingTopicId;
  pendingTopicId = null;
  return topicId;
}

/**
 * @param {import('../types/app.js').ShellContext} context
 * @param {string} topicId
 */
export function openHouseGuideTopic(context, topicId) {
  setPendingGuideTopic(topicId);
  context.navigate('house-guide', { guideTopicId: topicId });
}
