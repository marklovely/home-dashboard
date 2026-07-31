import { parseJsonArray, parseJsonBlocks } from './repository.js';

/**
 * @param {Record<string, unknown>[]} topicRows
 * @param {boolean} publishedOnly
 * @param {boolean} includeDraftBlocks
 */
function mapTopicRow(topicRows, publishedOnly, includeDraftBlocks) {
  /** @type {Record<string, import('./types.js').GuideTopicDto[]>} */
  const byCategory = {};

  for (const row of topicRows) {
    if (publishedOnly && !row.published) continue;
    if (publishedOnly && row.audience === 'owner') continue;

    const publishedBlocks = row.published_blocks
      ? parseJsonBlocks(row.published_blocks)
      : parseJsonBlocks(row.blocks);
    const draftBlocks = parseJsonBlocks(row.blocks);
    const blocks =
      includeDraftBlocks && row.has_draft ? draftBlocks : publishedBlocks.length ? publishedBlocks : draftBlocks;

    const topic = {
      id: String(row.id),
      title: String(row.title),
      subtitle: String(row.subtitle),
      summary: String(row.summary),
      searchTerms: parseJsonArray(row.search_terms),
      applianceManualTerms: row.appliance_manual_terms
        ? parseJsonArray(row.appliance_manual_terms)
        : undefined,
      blocks,
      actions: parseJsonArray(row.actions),
      hasDraft: Boolean(row.has_draft),
      published: Boolean(row.published),
      audience: row.audience === 'owner' ? 'owner' : 'guest'
    };

    const categoryId = String(row.category_id);
    if (!byCategory[categoryId]) byCategory[categoryId] = [];
    byCategory[categoryId].push(topic);
  }

  return byCategory;
}

/**
 * @param {Record<string, unknown>[]} mediaRows
 */
function mapMediaRows(mediaRows) {
  /** @type {Record<string, { file?: string, alt: string, hasUpload: boolean }>} */
  const media = {};

  for (const row of mediaRows) {
    if (!row.published) continue;
    media[String(row.id)] = {
      alt: String(row.alt),
      ...(row.source_file ? { file: String(row.source_file) } : {}),
      hasUpload: Boolean(row.object_key)
    };
  }

  return media;
}

/**
 * @param {Object} input
 * @param {Record<string, unknown> | null} settings
 * @param {Record<string, unknown>[]} categoryRows
 * @param {Record<string, unknown>[]} topicRows
 * @param {Record<string, unknown>[]} mediaRows
 * @param {{ publishedOnly?: boolean, includeDraftBlocks?: boolean }} options
 */
export function assembleGuideCatalog(input, settings, categoryRows, topicRows, mediaRows, options = {}) {
  const publishedOnly = options.publishedOnly ?? false;
  const includeDraftBlocks = options.includeDraftBlocks ?? false;
  const topicsByCategory = mapTopicRow(topicRows, publishedOnly, includeDraftBlocks);

  const categories = [];
  for (const row of categoryRows) {
    if (publishedOnly && !row.published) continue;
    const topics = topicsByCategory[String(row.id)] ?? [];
    if (publishedOnly && topics.length === 0 && row.id !== 'appliance-manuals') {
      // keep empty appliance-manuals category
    }
    categories.push({
      id: String(row.id),
      title: String(row.title),
      cardSubtitle: String(row.card_subtitle),
      iconId: String(row.icon_id),
      accent: String(row.accent),
      searchTerms: parseJsonArray(row.search_terms),
      topics
    });
  }

  return {
    version: Number(settings?.version ?? 2),
    homeSummaryTitle: String(settings?.home_summary_title ?? 'Everything you need to know'),
    homeSummarySubtitle: String(settings?.home_summary_subtitle ?? ''),
    media: mapMediaRows(mediaRows),
    categories,
    draftCount: topicRows.filter((row) => row.has_draft).length,
    seeded: true
  };
}

/**
 * @param {D1Database} db
 * @param {{ publishedOnly?: boolean, includeDraftBlocks?: boolean }} [options]
 */
export async function loadAssembledGuideCatalog(db, options = {}) {
  const settings = await db.prepare(`SELECT * FROM guide_settings WHERE id = ?`).bind('default').first();
  if (!settings) {
    return null;
  }

  const categoryRows = (await db.prepare(`SELECT * FROM guide_categories ORDER BY sort_order ASC`).all()).results ?? [];
  const topicRows =
    (await db.prepare(`SELECT * FROM guide_topics ORDER BY category_id ASC, sort_order ASC, title ASC`).all())
      .results ?? [];
  const mediaRows = (await db.prepare(`SELECT * FROM guide_media ORDER BY id ASC`).all()).results ?? [];

  return assembleGuideCatalog({}, settings, categoryRows, topicRows, mediaRows, options);
}

/**
 * @param {Record<string, unknown>} row
 */
export function toPublicGuideTopic(row) {
  return {
    id: String(row.id),
    categoryId: String(row.category_id),
    title: String(row.title),
    subtitle: String(row.subtitle),
    summary: String(row.summary),
    searchTerms: parseJsonArray(row.search_terms),
    applianceManualTerms: row.appliance_manual_terms
      ? parseJsonArray(row.appliance_manual_terms)
      : undefined,
    blocks: parseJsonBlocks(row.blocks),
    publishedBlocks: row.published_blocks ? parseJsonBlocks(row.published_blocks) : null,
    actions: parseJsonArray(row.actions),
    hasDraft: Boolean(row.has_draft),
    published: Boolean(row.published),
    audience: row.audience === 'owner' ? 'owner' : 'guest',
    updatedAt: String(row.updated_at)
  };
}

/**
 * @param {Record<string, unknown>} row
 */
export function toPublicGuideMedia(row) {
  return {
    id: String(row.id),
    alt: String(row.alt),
    sourceFile: row.source_file ? String(row.source_file) : null,
    hasUpload: Boolean(row.object_key),
    originalFilename: row.original_filename ? String(row.original_filename) : null,
    updatedAt: String(row.updated_at)
  };
}
