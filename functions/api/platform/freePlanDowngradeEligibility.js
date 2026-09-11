import {
  FREE_PLAN_MAX_CATEGORIES,
  FREE_PLAN_MAX_GUIDES,
  FREE_PLAN_MAX_STAYS
} from './platformPlanTier.js';

/**
 * @typedef {{
 *   guides: number;
 *   stays: number;
 *   categoriesByGuide: Array<{ guideId: string; guideTitle?: string | null; count: number }>;
 * }} FreeDowngradeUsage
 */

/**
 * @typedef {{
 *   kind: 'guides' | 'stays' | 'categories';
 *   count: number;
 *   limit: number;
 *   guideId?: string;
 *   guideTitle?: string | null;
 * }} FreeDowngradeBlocker
 */

/**
 * @param {FreeDowngradeUsage | null | undefined} usage
 */
export function evaluateFreeDowngradeEligibility(usage) {
  const guides = Number(usage?.guides ?? 0);
  const stays = Number(usage?.stays ?? 0);
  const categoriesByGuide = Array.isArray(usage?.categoriesByGuide) ? usage.categoriesByGuide : [];

  /** @type {FreeDowngradeBlocker[]} */
  const blockers = [];

  if (guides > FREE_PLAN_MAX_GUIDES) {
    blockers.push({
      kind: 'guides',
      count: guides,
      limit: FREE_PLAN_MAX_GUIDES
    });
  }

  if (stays > FREE_PLAN_MAX_STAYS) {
    blockers.push({
      kind: 'stays',
      count: stays,
      limit: FREE_PLAN_MAX_STAYS
    });
  }

  for (const entry of categoriesByGuide) {
    const count = Number(entry?.count ?? 0);
    if (count <= FREE_PLAN_MAX_CATEGORIES) continue;
    blockers.push({
      kind: 'categories',
      guideId: String(entry.guideId ?? 'default'),
      guideTitle: entry.guideTitle ?? null,
      count,
      limit: FREE_PLAN_MAX_CATEGORIES
    });
  }

  return {
    eligible: blockers.length === 0,
    blockers,
    usage: {
      guides,
      stays,
      categoriesByGuide: categoriesByGuide.map((entry) => ({
        guideId: String(entry.guideId ?? 'default'),
        guideTitle: entry.guideTitle ?? null,
        count: Number(entry.count ?? 0)
      }))
    },
    limits: {
      maxGuides: FREE_PLAN_MAX_GUIDES,
      maxStays: FREE_PLAN_MAX_STAYS,
      maxCategories: FREE_PLAN_MAX_CATEGORIES
    }
  };
}

/**
 * @param {FreeDowngradeBlocker} blocker
 */
export function formatFreeDowngradeBlocker(blocker) {
  const overBy = Math.max(0, blocker.count - blocker.limit);
  if (blocker.kind === 'guides') {
    return `You have ${blocker.count} guide templates — delete ${overBy} to reach the Free limit of ${blocker.limit}.`;
  }
  if (blocker.kind === 'stays') {
    return `You have ${blocker.count} scheduled stays — delete ${overBy} to reach the Free limit of ${blocker.limit}.`;
  }
  const guideLabel = String(blocker.guideTitle ?? blocker.guideId ?? 'A guide').trim() || 'A guide';
  return `${guideLabel} has ${blocker.count} areas — delete ${overBy} to reach ${blocker.limit} per guide on Free.`;
}

/**
 * @param {FreeDowngradeBlocker[]} blockers
 */
export function summarizeFreeDowngradeBlockers(blockers) {
  if (!blockers.length) {
    return 'Your hub is within Free plan limits.';
  }
  return blockers.map((blocker) => formatFreeDowngradeBlocker(blocker)).join(' ');
}
