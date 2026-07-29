import guideData from '../guide-data.json';

/** @type {import('../../../types/guideContent.js').GuideCatalog} */
const catalog = guideData;

/**
 * @returns {import('../../../types/guideContent.js').GuideTopicCard[]}
 */
export function listTopicsFromJson() {
  return catalog.topics;
}

/**
 * @param {string} topicId
 * @returns {import('../../../types/guideContent.js').GuidePage | undefined}
 */
export function getPageFromJson(topicId) {
  return catalog.pages[topicId];
}

/**
 * @returns {{ title: string, subtitle: string }}
 */
export function getHomeSummaryFromJson() {
  return {
    title: catalog.homeSummaryTitle,
    subtitle: catalog.homeSummarySubtitle
  };
}

/**
 * @param {string} query
 * @returns {import('../../../types/guideContent.js').GuideTopicCard[]}
 */
export function searchTopicsFromJson(query) {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return catalog.topics;

  const scored = catalog.topics
    .map((topic) => {
      const page = catalog.pages[topic.id];
      const haystack = [
        topic.title,
        topic.cardSubtitle,
        ...(topic.searchTerms ?? []),
        ...(page?.searchTerms ?? []),
        ...(page?.sections ?? []).flatMap((section) => [section.heading, section.content].filter(Boolean))
      ]
        .join(' ')
        .toLowerCase();

      let score = 0;
      if (topic.id.includes(trimmed) || haystack.includes(trimmed)) score += 2;
      if (topic.title.toLowerCase().includes(trimmed)) score += 3;
      if (trimmed === 'television' && topic.id === 'tv') score += 5;
      if (trimmed === 'tv' && topic.id === 'tv') score += 5;
      if (['wifi', 'wi-fi', 'password'].includes(trimmed) && topic.id === 'wifi') score += 4;
      if (trimmed === 'heating' && topic.id === 'heating') score += 5;
      if (trimmed === 'hot water' && topic.id === 'hot-water') score += 5;
      return { topic, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    return scored.map((entry) => entry.topic);
  }

  return catalog.topics.filter((topic) => {
    const page = catalog.pages[topic.id];
    const haystack = `${topic.title} ${topic.cardSubtitle} ${(page?.searchTerms ?? []).join(' ')}`.toLowerCase();
    return haystack.includes(trimmed);
  });
}

export function getJsonCatalog() {
  return catalog;
}
