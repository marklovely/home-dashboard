import { normalizeGuideActionsForSave } from './guideEditorActions.js';

/**
 * @param {string} title
 * @returns {string}
 */
export function slugFromTitle(title) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

/**
 * @param {string} fileName
 * @returns {string}
 */
export function mediaIdFromFileName(fileName) {
  const base = fileName.replace(/\.[^.]+$/, '');
  return slugFromTitle(base) || 'photo';
}

/**
 * @param {import('../../types/guideContent.js').GuideTopic} topic
 */
export function buildTopicPatch(topic) {
  return {
    title: topic.title,
    subtitle: topic.subtitle,
    summary: topic.summary,
    audience: topic.audience === 'owner' ? 'owner' : 'guest',
    searchTerms: (topic.searchTerms ?? []).map((term) => term.trim()).filter(Boolean),
    applianceManualTerms: (topic.applianceManualTerms ?? []).map((term) => term.trim()).filter(Boolean),
    actions: normalizeGuideActionsForSave(topic.actions),
    blocks: topic.blocks
  };
}

/**
 * @param {import('../../types/guideContent.js').GuideTopic} topic
 * @returns {string}
 */
export function serializeTopicForCompare(topic) {
  return JSON.stringify(buildTopicPatch(topic));
}

/**
 * @param {import('../../types/guideContent.js').GuideTopic} draftTopic
 * @param {string} savedSnapshot
 * @returns {boolean}
 */
export function isTopicDirty(draftTopic, savedSnapshot) {
  return serializeTopicForCompare(draftTopic) !== savedSnapshot;
}
