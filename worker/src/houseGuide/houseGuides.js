import { requireHouseGuideDb } from './repository.js';

/**
 * @param {D1Database} db
 */
export async function countHouseGuides(db) {
  const row = await db.prepare(`SELECT COUNT(*) AS n FROM house_guides`).first();
  return Number(row?.n ?? 0);
}

/**
 * @param {D1Database} db
 */
export async function listHouseGuides(db) {
  const result = await db
    .prepare(`SELECT id, title, sort_order AS sortOrder, created_at AS createdAt, updated_at AS updatedAt
              FROM house_guides ORDER BY sort_order ASC, title ASC`)
    .all();
  return result.results ?? [];
}

/**
 * @param {D1Database} db
 * @param {string} guideId
 */
export async function getHouseGuide(db, guideId) {
  return db
    .prepare(
      `SELECT id, title, sort_order AS sortOrder, created_at AS createdAt, updated_at AS updatedAt
       FROM house_guides WHERE id = ? LIMIT 1`
    )
    .bind(guideId)
    .first();
}

/**
 * @param {string} title
 */
export function slugifyHouseGuideId(title) {
  const base = String(title ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 28);
  return base || `guide-${crypto.randomUUID().slice(0, 8)}`;
}

/**
 * @param {D1Database} db
 * @param {{ title: string, id?: string }} input
 */
export async function createHouseGuide(db, input) {
  const title = String(input.title ?? '').trim();
  if (!title) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'Guide title is required.' };
  }

  let id = String(input.id ?? '').trim().toLowerCase() || slugifyHouseGuideId(title);
  if (!/^[a-z][a-z0-9-]{0,31}$/.test(id)) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'Guide id must use lowercase letters, numbers, or hyphens.' };
  }

  const existing = await getHouseGuide(db, id);
  if (existing) {
    id = `${id.slice(0, 24)}-${crypto.randomUUID().slice(0, 6)}`;
  }

  const now = new Date().toISOString();
  const sortRow = await db.prepare(`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM house_guides`).first();
  const sortOrder = Number(sortRow?.next ?? 0);

  await db.batch([
    db
      .prepare(
        `INSERT INTO house_guides (id, title, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(id, title, sortOrder, now, now),
    db
      .prepare(
        `INSERT INTO guide_settings (id, version, home_summary_title, home_summary_subtitle, updated_at)
         VALUES (?, 2, ?, ?, ?)`
      )
      .bind(id, title, 'Tap a category to explore', now)
  ]);

  return { ok: true, guide: await getHouseGuide(db, id) };
}

/**
 * @param {D1Database | undefined} db
 */
export function requireHouseGuidesDb(db) {
  return requireHouseGuideDb(db);
}
