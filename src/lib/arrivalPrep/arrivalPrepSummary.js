import { buildArrivalPrepChecklist, shouldShowArrivalPrepChecklist } from './buildArrivalPrepChecklist.js';
import { getSiteProfileState } from '../../services/siteProfileService.js';

/**
 * Live summary for the owner home launcher tile.
 * @returns {import('../../types/app.js').AppSummary}
 */
export function getArrivalPrepHomeSummary() {
  const profile = getSiteProfileState()?.profile ?? {};
  if (!shouldShowArrivalPrepChecklist(profile)) {
    return { title: '—', subtitle: '' };
  }

  const checklist = buildArrivalPrepChecklist(profile);
  if (!checklist || checklist.totalCount === 0) {
    return { title: '—', subtitle: '' };
  }

  if (checklist.remainingCount === 0) {
    return {
      title: 'All ready',
      subtitle: `${checklist.totalCount} tasks complete`
    };
  }

  return {
    title: `${checklist.remainingCount} remaining`,
    subtitle: `${checklist.completeCount} of ${checklist.totalCount} done`
  };
}
