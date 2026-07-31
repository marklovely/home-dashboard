/**
 * @param {string} value
 */
function normalizeMatchText(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {string} haystack
 * @param {string} term
 */
function textIncludesTerm(haystack, term) {
  if (!term) return false;
  if (term.includes(' ')) {
    return haystack.includes(term);
  }
  const pattern = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  return pattern.test(haystack);
}

/**
 * @param {import('../types/guideContent.js').GuideTopic} topic
 */
export function getGuideTopicManualMatchTerms(topic) {
  if (topic.applianceManualTerms?.length) {
    return [...new Set(topic.applianceManualTerms.map(normalizeMatchText).filter(Boolean))];
  }

  const derived = [topic.id.replace(/-/g, ' '), topic.title];
  return [...new Set(derived.map(normalizeMatchText).filter(Boolean))];
}

/**
 * @param {import('../api/applianceManualsApi.js').ApplianceManual} manual
 */
function manualSearchText(manual) {
  return normalizeMatchText(
    [
      manual.applianceName,
      manual.title,
      manual.manufacturer,
      manual.model,
      manual.category,
      manual.location,
      manual.description
    ]
      .filter(Boolean)
      .join(' ')
  );
}

/**
 * @param {import('../types/guideContent.js').GuideTopic} topic
 * @param {import('../api/applianceManualsApi.js').ApplianceManual} manual
 */
function scoreManualForGuideTopic(topic, manual) {
  const terms = getGuideTopicManualMatchTerms(topic);
  const explicit = Boolean(topic.applianceManualTerms?.length);
  const haystack = manualSearchText(manual);
  const applianceName = normalizeMatchText(manual.applianceName);
  const topicTitle = normalizeMatchText(topic.title);

  let score = 0;
  for (const term of terms) {
    if (!term) continue;
    const minLen = explicit ? 2 : 3;
    if (term.length < minLen) continue;

    if (applianceName === term || textIncludesTerm(applianceName, term) || textIncludesTerm(term, applianceName)) {
      score += 12;
    }
    if (topicTitle.includes(term) && textIncludesTerm(applianceName, term.split(' ')[0] ?? '')) {
      score += 8;
    }
    if (textIncludesTerm(haystack, term)) {
      score += term.includes(' ') ? 6 : 4;
    }
  }

  if (applianceName && topicTitle) {
    if (applianceName === topicTitle) score += 15;
    else if (topicTitle.includes(applianceName) || applianceName.includes(topicTitle)) score += 10;
  }

  const threshold = explicit ? 4 : 8;
  return score >= threshold ? score : 0;
}

/**
 * @param {import('../types/guideContent.js').GuideTopic} topic
 * @param {import('../api/applianceManualsApi.js').ApplianceManual[]} manuals
 */
export function findManualsForGuideTopic(topic, manuals) {
  return manuals
    .map((manual) => ({ manual, score: scoreManualForGuideTopic(topic, manual) }))
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.manual.sortOrder - right.manual.sortOrder ||
        left.manual.title.localeCompare(right.manual.title)
    )
    .map(({ manual }) => manual);
}
