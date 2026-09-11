import { countGuideCategories, requireHouseGuideDb } from '../houseGuide/repository.js';
import { countHouseGuides, listHouseGuides } from '../houseGuide/houseGuides.js';

/**
 * @param {D1Database} db
 */
async function countActiveStays(db) {
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM sitter_stays WHERE status != 'cancelled'`)
    .first();
  return Number(row?.n ?? 0);
}

/**
 * @param {Record<string, unknown>} env
 */
export async function collectFreeDowngradeUsage(env) {
  const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
  const guides = await listHouseGuides(db);
  const categoriesByGuide = [];

  for (const guide of guides) {
    const guideId = String(guide.id ?? 'default');
    categoriesByGuide.push({
      guideId,
      guideTitle: guide.title ?? null,
      count: await countGuideCategories(db, guideId)
    });
  }

  if (!categoriesByGuide.length) {
    categoriesByGuide.push({
      guideId: 'default',
      guideTitle: null,
      count: await countGuideCategories(db, 'default')
    });
  }

  return {
    guides: await countHouseGuides(db),
    stays: await countActiveStays(db),
    categoriesByGuide
  };
}
