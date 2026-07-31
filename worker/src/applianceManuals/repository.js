/**
 * @typedef {import('./serialize.js').ApplianceManualRecord} ApplianceManualRecord
 */

/**
 * @param {D1Database} db
 * @param {{ publishedOnly?: boolean }} [options]
 * @returns {Promise<ApplianceManualRecord[]>}
 */
export async function listApplianceManuals(db, options = {}) {
  const sql = options.publishedOnly
    ? `SELECT * FROM appliance_manuals WHERE published = 1 ORDER BY sort_order ASC, title ASC`
    : `SELECT * FROM appliance_manuals ORDER BY sort_order ASC, title ASC`;
  const result = await db.prepare(sql).all();
  return /** @type {ApplianceManualRecord[]} */ (result.results ?? []);
}

/**
 * @param {D1Database} db
 * @param {string} id
 * @returns {Promise<ApplianceManualRecord | null>}
 */
export async function getApplianceManualById(db, id) {
  const row = await db.prepare(`SELECT * FROM appliance_manuals WHERE id = ?`).bind(id).first();
  return /** @type {ApplianceManualRecord | null} */ (row ?? null);
}

/**
 * @param {D1Database} db
 * @param {Object} input
 * @returns {Promise<ApplianceManualRecord>}
 */
export async function insertApplianceManual(db, input) {
  await db
    .prepare(
      `INSERT INTO appliance_manuals (
        id, title, appliance_name, manufacturer, model, category, location, description,
        object_key, original_filename, mime_type, file_size, published, sort_order,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      input.id,
      input.title,
      input.applianceName,
      input.manufacturer,
      input.model,
      input.category,
      input.location,
      input.description,
      input.objectKey,
      input.originalFilename,
      input.mimeType,
      input.fileSize,
      input.published ? 1 : 0,
      input.sortOrder ?? 0,
      input.createdAt,
      input.updatedAt
    )
    .run();

  const created = await getApplianceManualById(db, input.id);
  if (!created) {
    throw new Error('MANUAL_INSERT_FAILED');
  }
  return created;
}

/**
 * @param {D1Database} db
 * @param {string} id
 * @param {Object} patch
 * @returns {Promise<ApplianceManualRecord | null>}
 */
export async function updateApplianceManual(db, id, patch) {
  const existing = await getApplianceManualById(db, id);
  if (!existing) return null;

  const next = {
    title: patch.title ?? existing.title,
    applianceName: patch.applianceName ?? existing.appliance_name,
    manufacturer: patch.manufacturer !== undefined ? patch.manufacturer : existing.manufacturer,
    model: patch.model !== undefined ? patch.model : existing.model,
    category: patch.category ?? existing.category,
    location: patch.location !== undefined ? patch.location : existing.location,
    description: patch.description !== undefined ? patch.description : existing.description,
    objectKey: patch.objectKey ?? existing.object_key,
    originalFilename: patch.originalFilename ?? existing.original_filename,
    mimeType: patch.mimeType ?? existing.mime_type,
    fileSize: patch.fileSize ?? existing.file_size,
    published: patch.published !== undefined ? (patch.published ? 1 : 0) : existing.published,
    sortOrder: patch.sortOrder ?? existing.sort_order,
    updatedAt: patch.updatedAt ?? existing.updated_at
  };

  await db
    .prepare(
      `UPDATE appliance_manuals SET
        title = ?, appliance_name = ?, manufacturer = ?, model = ?, category = ?, location = ?,
        description = ?, object_key = ?, original_filename = ?, mime_type = ?, file_size = ?,
        published = ?, sort_order = ?, updated_at = ?
      WHERE id = ?`
    )
    .bind(
      next.title,
      next.applianceName,
      next.manufacturer,
      next.model,
      next.category,
      next.location,
      next.description,
      next.objectKey,
      next.originalFilename,
      next.mimeType,
      next.fileSize,
      next.published,
      next.sortOrder,
      next.updatedAt,
      id
    )
    .run();

  return getApplianceManualById(db, id);
}

/**
 * @param {D1Database} db
 * @param {string} id
 * @returns {Promise<ApplianceManualRecord | null>}
 */
export async function deleteApplianceManual(db, id) {
  const existing = await getApplianceManualById(db, id);
  if (!existing) return null;
  await db.prepare(`DELETE FROM appliance_manuals WHERE id = ?`).bind(id).run();
  return existing;
}

/**
 * @param {D1Database} db
 * @returns {Promise<number>}
 */
export async function nextSortOrder(db) {
  const row = await db
    .prepare(`SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM appliance_manuals`)
    .first();
  const maxOrder = Number(row?.max_order ?? -1);
  return Number.isFinite(maxOrder) ? maxOrder + 1 : 0;
}

/**
 * @param {D1Database | undefined} db
 */
export function requireApplianceManualsDb(db) {
  if (!db) {
    const error = new Error('APPLIANCE_MANUALS_NOT_CONFIGURED');
    error.code = 'APPLIANCE_MANUALS_NOT_CONFIGURED';
    throw error;
  }
  return db;
}
