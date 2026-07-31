import { parseJsonArray, parseJsonBlocks } from './repository.js';

/**
 * Build a GuideCatalog JSON document suitable for POST /api/house-guide/import.
 *
 * @param {Record<string, unknown> | null} settings
 * @param {Record<string, unknown>[]} categoryRows
 * @param {Record<string, unknown>[]} topicRows
 * @param {Record<string, unknown>[]} mediaRows
 */
export function buildImportableGuideCatalog(settings, categoryRows, topicRows, mediaRows) {
  /** @type {Record<string, import('../types/guideContent.js').GuideTopicDto[]>} */
  const topicsByCategory = {};

  for (const row of topicRows) {
    const publishedBlocks = row.published_blocks
      ? parseJsonBlocks(row.published_blocks)
      : parseJsonBlocks(row.blocks);
    const draftBlocks = parseJsonBlocks(row.blocks);
    const blocks = row.has_draft ? draftBlocks : publishedBlocks.length ? publishedBlocks : draftBlocks;

    const topic = {
      id: String(row.id),
      title: String(row.title),
      subtitle: String(row.subtitle),
      summary: String(row.summary),
      searchTerms: parseJsonArray(row.search_terms),
      ...(row.appliance_manual_terms
        ? { applianceManualTerms: parseJsonArray(row.appliance_manual_terms) }
        : {}),
      blocks,
      actions: parseJsonArray(row.actions),
      audience: row.audience === 'owner' ? 'owner' : 'guest'
    };

    const categoryId = String(row.category_id);
    if (!topicsByCategory[categoryId]) topicsByCategory[categoryId] = [];
    topicsByCategory[categoryId].push(topic);
  }

  /** @type {Record<string, { alt: string, file?: string }>} */
  const media = {};
  /** @type {{ id: string, alt: string }[]} */
  const uploadedMedia = [];

  for (const row of mediaRows) {
    const id = String(row.id);
    const entry = { alt: String(row.alt ?? '') };
    if (row.source_file) {
      entry.file = String(row.source_file);
    }
    media[id] = entry;
    if (row.object_key) {
      uploadedMedia.push({ id, alt: entry.alt });
    }
  }

  const categories = categoryRows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    cardSubtitle: String(row.card_subtitle),
    iconId: String(row.icon_id),
    accent: String(row.accent),
    searchTerms: parseJsonArray(row.search_terms),
    topics: topicsByCategory[String(row.id)] ?? []
  }));

  return {
    catalog: {
      version: Number(settings?.version ?? 2),
      homeSummaryTitle: String(settings?.home_summary_title ?? 'Everything you need to know'),
      homeSummarySubtitle: String(settings?.home_summary_subtitle ?? ''),
      media,
      categories
    },
    uploadedMedia
  };
}

/**
 * @param {D1Database} db
 */
export async function loadImportableGuideCatalog(db) {
  const settings = await db.prepare(`SELECT * FROM guide_settings WHERE id = ?`).bind('default').first();
  if (!settings) {
    return null;
  }

  const categoryRows =
    (await db.prepare(`SELECT * FROM guide_categories ORDER BY sort_order ASC`).all()).results ?? [];
  const topicRows =
    (await db.prepare(`SELECT * FROM guide_topics ORDER BY category_id ASC, sort_order ASC, title ASC`).all())
      .results ?? [];
  const mediaRows = (await db.prepare(`SELECT * FROM guide_media ORDER BY id ASC`).all()).results ?? [];

  return buildImportableGuideCatalog(settings, categoryRows, topicRows, mediaRows);
}
