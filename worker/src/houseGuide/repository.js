/**
 * @param {unknown} value
 * @returns {any[]}
 */
export function parseJsonArray(value) {
  if (!value) return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(value) ? value : [];
}

/**
 * @param {unknown} value
 * @returns {any[]}
 */
export function parseJsonBlocks(value) {
  return parseJsonArray(value);
}

/**
 * @param {D1Database | undefined} db
 */
export function requireHouseGuideDb(db) {
  if (!db) {
    const error = new Error('HOUSE_GUIDE_NOT_CONFIGURED');
    error.code = 'HOUSE_GUIDE_NOT_CONFIGURED';
    throw error;
  }
  return db;
}

/**
 * @param {D1Database} db
 */
export async function isHouseGuideSeeded(db) {
  const row = await db.prepare(`SELECT id FROM guide_settings WHERE id = ?`).bind('default').first();
  return Boolean(row);
}

/**
 * @param {D1Database} db
 */
export async function getGuideSettings(db) {
  return db.prepare(`SELECT * FROM guide_settings WHERE id = ?`).bind('default').first();
}

/**
 * @param {D1Database} db
 */
export async function listGuideCategories(db) {
  const result = await db
    .prepare(`SELECT * FROM guide_categories ORDER BY sort_order ASC, title ASC`)
    .all();
  return result.results ?? [];
}

/**
 * @param {D1Database} db
 */
export async function listGuideTopics(db) {
  const result = await db
    .prepare(`SELECT * FROM guide_topics ORDER BY category_id ASC, sort_order ASC, title ASC`)
    .all();
  return result.results ?? [];
}

/**
 * @param {D1Database} db
 */
export async function listGuideMedia(db) {
  const result = await db.prepare(`SELECT * FROM guide_media ORDER BY id ASC`).all();
  return result.results ?? [];
}

/**
 * @param {D1Database} db
 * @param {string} id
 */
export async function getGuideTopicById(db, id) {
  return db.prepare(`SELECT * FROM guide_topics WHERE id = ?`).bind(id).first();
}

/**
 * @param {D1Database} db
 * @param {string} id
 */
export async function getGuideMediaById(db, id) {
  return db.prepare(`SELECT * FROM guide_media WHERE id = ?`).bind(id).first();
}

/**
 * @param {D1Database} db
 */
export async function clearGuideCatalog(db) {
  await db.batch([
    db.prepare(`DELETE FROM guide_topics`),
    db.prepare(`DELETE FROM guide_categories`),
    db.prepare(`DELETE FROM guide_media`),
    db.prepare(`DELETE FROM guide_settings`)
  ]);
}

/**
 * @param {D1Database} db
 * @param {Object} catalog
 */
export async function importGuideCatalog(db, catalog) {
  const now = new Date().toISOString();
  const categories = catalog.categories ?? [];
  const media = catalog.media ?? {};

  await db.batch([
    db.prepare(`DELETE FROM guide_topics`),
    db.prepare(`DELETE FROM guide_categories`),
    db.prepare(`DELETE FROM guide_media`),
    db.prepare(`DELETE FROM guide_settings`)
  ]);

  await db
    .prepare(
      `INSERT INTO guide_settings (id, version, home_summary_title, home_summary_subtitle, updated_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(
      'default',
      catalog.version ?? 2,
      catalog.homeSummaryTitle ?? 'Everything you need to know',
      catalog.homeSummarySubtitle ?? '',
      now
    )
    .run();

  let categoryOrder = 0;
  for (const category of categories) {
    await db
      .prepare(
        `INSERT INTO guide_categories (
          id, title, card_subtitle, icon_id, accent, search_terms, sort_order, published, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        category.id,
        category.title,
        category.cardSubtitle,
        category.iconId,
        category.accent,
        JSON.stringify(category.searchTerms ?? []),
        categoryOrder,
        1,
        now
      )
      .run();
    categoryOrder += 1;

    let topicOrder = 0;
    for (const topic of category.topics ?? []) {
      const blocks = JSON.stringify(topic.blocks ?? []);
      await db
        .prepare(
          `INSERT INTO guide_topics (
            id, category_id, title, subtitle, summary, search_terms, appliance_manual_terms,
            blocks, published_blocks, actions, sort_order, published, has_draft, audience, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          topic.id,
          category.id,
          topic.title,
          topic.subtitle,
          topic.summary,
          JSON.stringify(topic.searchTerms ?? []),
          topic.applianceManualTerms ? JSON.stringify(topic.applianceManualTerms) : null,
          blocks,
          blocks,
          JSON.stringify(topic.actions ?? []),
          topicOrder,
          1,
          0,
          topic.audience === 'owner' ? 'owner' : 'guest',
          now
        )
        .run();
      topicOrder += 1;
    }
  }

  for (const [mediaId, asset] of Object.entries(media)) {
    await db
      .prepare(
        `INSERT INTO guide_media (
          id, alt, object_key, source_file, original_filename, mime_type, file_size, published, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        mediaId,
        asset.alt ?? '',
        null,
        asset.file ?? null,
        asset.file ?? null,
        null,
        null,
        1,
        now
      )
      .run();
  }
}

/**
 * @param {D1Database} db
 * @param {string} id
 * @param {Object} patch
 */
export async function updateGuideTopic(db, id, patch) {
  const existing = await getGuideTopicById(db, id);
  if (!existing) return null;

  const blocksJson = patch.blocks !== undefined ? JSON.stringify(patch.blocks) : existing.blocks;
  const publishedBlocks = existing.published_blocks ?? existing.blocks;
  let hasDraft = existing.has_draft;
  if (patch.blocks !== undefined) {
    hasDraft = blocksJson !== publishedBlocks ? 1 : 0;
  }

  await db
    .prepare(
      `UPDATE guide_topics SET
        title = ?, subtitle = ?, summary = ?, search_terms = ?, appliance_manual_terms = ?,
        blocks = ?, actions = ?, has_draft = ?, audience = ?, updated_at = ?
      WHERE id = ?`
    )
    .bind(
      patch.title ?? existing.title,
      patch.subtitle ?? existing.subtitle,
      patch.summary ?? existing.summary,
      patch.searchTerms !== undefined ? JSON.stringify(patch.searchTerms) : existing.search_terms,
      patch.applianceManualTerms !== undefined
        ? patch.applianceManualTerms
          ? JSON.stringify(patch.applianceManualTerms)
          : null
        : existing.appliance_manual_terms,
      blocksJson,
      patch.actions !== undefined ? JSON.stringify(patch.actions) : existing.actions,
      hasDraft,
      patch.audience ?? existing.audience ?? 'guest',
      patch.updatedAt ?? new Date().toISOString(),
      id
    )
    .run();

  return getGuideTopicById(db, id);
}

/**
 * @param {D1Database} db
 * @param {string} id
 */
export async function publishGuideTopic(db, id) {
  const existing = await getGuideTopicById(db, id);
  if (!existing) return null;

  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE guide_topics SET
        published_blocks = blocks, has_draft = 0, published = 1, updated_at = ?
      WHERE id = ?`
    )
    .bind(now, id)
    .run();

  return getGuideTopicById(db, id);
}

/**
 * @param {D1Database} db
 */
export async function publishAllGuideTopics(db) {
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE guide_topics SET
        published_blocks = blocks, has_draft = 0, published = 1, updated_at = ?
      WHERE has_draft = 1 OR published_blocks IS NULL`
    )
    .bind(now)
    .run();
}

/**
 * @param {D1Database} db
 */
export async function countDraftGuideTopics(db) {
  const row = await db
    .prepare(`SELECT COUNT(*) AS count FROM guide_topics WHERE has_draft = 1`)
    .first();
  return Number(row?.count ?? 0);
}

/**
 * @param {D1Database} db
 * @param {Object} input
 */
export async function insertGuideMedia(db, input) {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO guide_media (
        id, alt, object_key, source_file, original_filename, mime_type, file_size, published, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      input.id,
      input.alt,
      input.objectKey,
      null,
      input.originalFilename,
      input.mimeType,
      input.fileSize,
      1,
      now
    )
    .run();
  return getGuideMediaById(db, input.id);
}

/**
 * @param {D1Database} db
 * @param {string} id
 * @param {Object} patch
 */
export async function updateGuideMedia(db, id, patch) {
  const existing = await getGuideMediaById(db, id);
  if (!existing) return null;

  await db
    .prepare(`UPDATE guide_media SET alt = ?, updated_at = ? WHERE id = ?`)
    .bind(patch.alt ?? existing.alt, patch.updatedAt ?? new Date().toISOString(), id)
    .run();

  return getGuideMediaById(db, id);
}

/**
 * @param {D1Database} db
 * @param {Object} patch
 */
export async function updateGuideSettings(db, patch) {
  const existing = await getGuideSettings(db);
  if (!existing) return null;

  await db
    .prepare(
      `UPDATE guide_settings SET
        home_summary_title = ?, home_summary_subtitle = ?, updated_at = ?
      WHERE id = ?`
    )
    .bind(
      patch.homeSummaryTitle ?? existing.home_summary_title,
      patch.homeSummarySubtitle ?? existing.home_summary_subtitle,
      patch.updatedAt ?? new Date().toISOString(),
      'default'
    )
    .run();

  return getGuideSettings(db);
}

/**
 * @param {D1Database} db
 * @param {string} categoryId
 */
export async function getGuideCategoryById(db, categoryId) {
  return db.prepare(`SELECT * FROM guide_categories WHERE id = ?`).bind(categoryId).first();
}

/**
 * @param {D1Database} db
 * @param {Object} input
 */
export async function createGuideTopic(db, input) {
  const category = await getGuideCategoryById(db, input.categoryId);
  if (!category) return null;

  const existing = await getGuideTopicById(db, input.id);
  if (existing) return { conflict: true };

  const maxRow = await db
    .prepare(`SELECT MAX(sort_order) AS max_order FROM guide_topics WHERE category_id = ?`)
    .bind(input.categoryId)
    .first();
  const sortOrder = Number(maxRow?.max_order ?? -1) + 1;
  const now = new Date().toISOString();
  const blocks = JSON.stringify(input.blocks ?? [{ type: 'text', content: '' }]);

  await db
    .prepare(
      `INSERT INTO guide_topics (
        id, category_id, title, subtitle, summary, search_terms, appliance_manual_terms,
        blocks, published_blocks, actions, sort_order, published, has_draft, audience, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      input.id,
      input.categoryId,
      input.title,
      input.subtitle,
      input.summary,
      JSON.stringify(input.searchTerms ?? []),
      null,
      blocks,
      null,
      JSON.stringify(input.actions ?? []),
      sortOrder,
      0,
      1,
      input.audience ?? 'guest',
      now
    )
    .run();

  return getGuideTopicById(db, input.id);
}

/**
 * @param {D1Database} db
 * @param {string} id
 */
export async function deleteGuideTopic(db, id) {
  const existing = await getGuideTopicById(db, id);
  if (!existing) return null;
  await db.prepare(`DELETE FROM guide_topics WHERE id = ?`).bind(id).run();
  return existing;
}

/**
 * @param {D1Database} db
 * @param {string} categoryId
 * @param {string[]} topicIds
 */
export async function reorderGuideTopicsInCategory(db, categoryId, topicIds) {
  const category = await getGuideCategoryById(db, categoryId);
  if (!category) return null;

  const rows = await db
    .prepare(`SELECT id FROM guide_topics WHERE category_id = ?`)
    .bind(categoryId)
    .all();
  const existingIds = new Set((rows.results ?? []).map((row) => String(row.id)));
  if (topicIds.length !== existingIds.size) return { invalid: true };

  for (const topicId of topicIds) {
    if (!existingIds.has(topicId)) return { invalid: true };
  }

  const now = new Date().toISOString();
  let order = 0;
  for (const topicId of topicIds) {
    await db
      .prepare(`UPDATE guide_topics SET sort_order = ?, updated_at = ? WHERE id = ? AND category_id = ?`)
      .bind(order, now, topicId, categoryId)
      .run();
    order += 1;
  }

  return { ok: true };
}

/**
 * @param {D1Database} db
 * @param {string} id
 */
export async function deleteGuideMedia(db, id) {
  const existing = await getGuideMediaById(db, id);
  if (!existing) return null;
  await db.prepare(`DELETE FROM guide_media WHERE id = ?`).bind(id).run();
  return existing;
}
