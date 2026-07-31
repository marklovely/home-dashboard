import catalog from '../guide-catalog.json';

/** @type {import('../../../types/guideContent.js').GuideCatalog} */
const guideCatalog = catalog;

/** @type {Map<string, { topic: import('../../../types/guideContent.js').GuideTopic, category: import('../../../types/guideContent.js').GuideCategory }>} */
const topicIndex = new Map();

for (const category of guideCatalog.categories) {
  for (const topic of category.topics) {
    topicIndex.set(topic.id, { topic, category });
  }
}

/**
 * @returns {import('../../../types/guideContent.js').GuideCategory[]}
 */
export function listCategoriesFromJson() {
  return guideCatalog.categories;
}

/**
 * @param {string} categoryId
 * @returns {import('../../../types/guideContent.js').GuideCategory | undefined}
 */
export function getCategoryFromJson(categoryId) {
  return guideCatalog.categories.find((category) => category.id === categoryId);
}

/**
 * @returns {import('../../../types/guideContent.js').GuideTopicSearchHit[]}
 */
export function listTopicCardsFromJson() {
  return [...topicIndex.values()].map(({ topic, category }) => toTopicCard(topic, category));
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
 * @param {string} topicId
 * @returns {import('../../../types/guideContent.js').GuideTopic | undefined}
 */
export function getTopicFromJson(topicId) {
  return topicIndex.get(topicId)?.topic;
}

/**
 * @param {string} topicId
 * @returns {{ topic: import('../../../types/guideContent.js').GuideTopic, category: import('../../../types/guideContent.js').GuideCategory } | undefined}
 */
export function getTopicContextFromJson(topicId) {
  return topicIndex.get(topicId);
}

/** @deprecated Use listCategoriesFromJson */
export function listTopicsFromJson() {
  return listTopicCardsFromJson();
}

/** @deprecated Use getTopicFromJson */
export function getPageFromJson(topicId) {
  return getTopicFromJson(topicId);
}

/**
 * @returns {{ title: string, subtitle: string }}
 */
export function getHomeSummaryFromJson() {
  return {
    title: guideCatalog.homeSummaryTitle,
    subtitle: guideCatalog.homeSummarySubtitle
  };
}

/**
 * @param {import('../../../types/guideContent.js').GuideTopic} topic
 * @param {import('../../../types/guideContent.js').GuideCategory} [category]
 */
function topicHaystack(topic, category) {
  const blockText = (topic.blocks ?? [])
    .flatMap((block) => {
      if (block.type === 'steps') return block.steps ?? [];
      if (block.type === 'text' || block.type === 'tip' || block.type === 'warning' || block.type === 'note') {
        return [block.heading, block.content].filter(Boolean);
      }
      if (block.type === 'location') return [block.heading, block.content];
      if (block.type === 'contact' || block.type === 'keyValues') {
        return (block.items ?? []).flatMap((item) => [item.label, item.value]);
      }
      if (block.type === 'place') {
        return [block.name, block.address, block.description, block.website].filter(Boolean);
      }
      if (block.type === 'protected') {
        return [block.label];
      }
      return [];
    })
    .join(' ');

  return [
    topic.title,
    topic.subtitle,
    topic.summary,
    category?.title,
    ...(topic.searchTerms ?? []),
    ...(category?.searchTerms ?? []),
    blockText
  ]
    .join(' ')
    .toLowerCase();
}

/**
 * @param {string} haystack
 * @param {string} query
 */
export function guideHaystackMatches(haystack, query) {
  const normalizedHaystack = haystack.toLowerCase();
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return false;
  if (normalizedHaystack.includes(normalizedQuery)) return true;
  return normalizedHaystack.replace(/\s/g, '').includes(normalizedQuery.replace(/\s/g, ''));
}

/** @type {Record<string, { topicId: string, bonus: number }[]>} */
const SEARCH_ALIASES = {
  television: [
    { topicId: 'turning-on-tv', bonus: 6 },
    { topicId: 'streaming-services', bonus: 8 },
    { topicId: 'selecting-apple-tv', bonus: 7 }
  ],
  tv: [
    { topicId: 'turning-on-tv', bonus: 6 },
    { topicId: 'streaming-services', bonus: 6 }
  ],
  netflix: [{ topicId: 'streaming-services', bonus: 10 }],
  prime: [{ topicId: 'streaming-services', bonus: 8 }],
  'apple tv': [{ topicId: 'selecting-apple-tv', bonus: 10 }],
  remote: [{ topicId: 'turning-on-tv', bonus: 8 }],
  source: [{ topicId: 'selecting-apple-tv', bonus: 8 }],
  input: [{ topicId: 'selecting-apple-tv', bonus: 7 }],
  wifi: [{ topicId: 'connecting', bonus: 8 }],
  'wi-fi': [{ topicId: 'connecting', bonus: 8 }],
  password: [{ topicId: 'connecting', bonus: 5 }],
  heating: [{ topicId: 'nest-heating', bonus: 8 }],
  heat: [{ topicId: 'nest-heating', bonus: 5 }],
  kettle: [{ topicId: 'hot-and-cold-water-machine', bonus: 12 }],
  tea: [{ topicId: 'hot-and-cold-water-machine', bonus: 10 }],
  coffee: [{ topicId: 'hot-and-cold-water-machine', bonus: 8 }],
  'boiling water': [{ topicId: 'hot-and-cold-water-machine', bonus: 12 }],
  'hot tap': [{ topicId: 'hot-and-cold-water-machine', bonus: 10 }],
  'hot water': [{ topicId: 'hot-and-cold-water-machine', bonus: 6 }],
  'dog food': [{ topicId: 'feeding', bonus: 10 }],
  'feed scooter': [{ topicId: 'feeding', bonus: 12 }],
  dinner: [{ topicId: 'feeding', bonus: 6 }],
  breakfast: [{ topicId: 'feeding', bonus: 6 }],
  stopcock: [{ topicId: 'water-stop-tap', bonus: 12 }],
  'stop cock': [{ topicId: 'water-stop-tap', bonus: 12 }],
  'water leak': [{ topicId: 'water-stop-tap', bonus: 8 }],
  'turn water off': [{ topicId: 'water-stop-tap', bonus: 10 }],
  rubbish: [{ topicId: 'rubbish-recycling', bonus: 10 }],
  trash: [{ topicId: 'rubbish-recycling', bonus: 10 }],
  recycling: [{ topicId: 'rubbish-recycling', bonus: 8 }],
  'wheelie bin': [{ topicId: 'rubbish-recycling', bonus: 8 }],
  bins: [{ topicId: 'rubbish-recycling', bonus: 8 }]
};

/**
 * @param {import('../../../types/guideContent.js').GuideCatalog} catalog
 * @param {string} query
 * @returns {import('../../../types/guideContent.js').GuideTopicSearchHit[]}
 */
export function searchTopicsInCatalog(catalog, query) {
  const trimmed = query.trim().toLowerCase();
  const entries = catalog.categories.flatMap((category) =>
    (category.topics ?? []).map((topic) => ({ topic, category }))
  );

  if (!trimmed) {
    return entries.map(({ topic, category }) => toTopicCard(topic, category));
  }

  const aliasBoost = new Map();
  for (const [term, matches] of Object.entries(SEARCH_ALIASES)) {
    if (guideHaystackMatches(term, trimmed) || guideHaystackMatches(trimmed, term)) {
      for (const match of matches) {
        aliasBoost.set(match.topicId, (aliasBoost.get(match.topicId) ?? 0) + match.bonus);
      }
    }
  }
  if (SEARCH_ALIASES[trimmed]) {
    for (const match of SEARCH_ALIASES[trimmed]) {
      aliasBoost.set(match.topicId, (aliasBoost.get(match.topicId) ?? 0) + match.bonus);
    }
  }

  const scored = entries
    .map(({ topic, category }) => {
      const haystack = topicHaystack(topic, category);
      let score = aliasBoost.get(topic.id) ?? 0;
      if (topic.id.includes(trimmed)) score += 2;
      if (guideHaystackMatches(haystack, trimmed)) score += 3;
      if (guideHaystackMatches(topic.title, trimmed)) score += 4;
      if (guideHaystackMatches(category.title, trimmed)) score += 1;
      return { topic, category, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    return scored.map(({ topic, category }) => toTopicCard(topic, category));
  }

  return entries
    .map(({ topic, category }) => toTopicCard(topic, category))
    .filter((card) => {
      const haystack = `${card.title} ${card.cardSubtitle} ${card.categoryTitle} ${(card.searchTerms ?? []).join(' ')}`;
      return guideHaystackMatches(haystack, trimmed);
    });
}

/**
 * @param {string} query
 * @returns {import('../../../types/guideContent.js').GuideTopicSearchHit[]}
 */
export function searchTopicsFromJson(query) {
  return searchTopicsInCatalog(guideCatalog, query);
}

export function getJsonCatalog() {
  return guideCatalog;
}

export function getGuideMediaCatalog() {
  return guideCatalog.media ?? {};
}
