import { subscribeToUserMode, isHouseSitterExperience } from '../auth/userMode.js';
import {
  fetchHubPlanSummary,
  getCachedHubPlanSummary
} from '../services/hubPlanStatus.js';

const BADGE_ID = 'hub-plan-badge';

/**
 * @param {import('../services/hubPlanStatus.js').HubPlanSummary | null} summary
 */
function renderBadge(summary) {
  let badge = document.getElementById(BADGE_ID);
  if (!summary) {
    badge?.remove();
    return;
  }

  const trailing =
    document.querySelector('.shell-chrome-trailing') ||
    document.querySelector('.shell-chrome-actions') ||
    document.querySelector('.shell-header');

  if (!badge) {
    badge = document.createElement('div');
    badge.id = BADGE_ID;
    trailing?.insertBefore(badge, trailing.firstChild);
  } else if (badge.parentElement !== trailing && trailing) {
    trailing.insertBefore(badge, trailing.firstChild);
  }

  const isPlus = summary.plan === 'plus';
  badge.className = `hub-plan-badge hub-plan-badge--${isPlus ? 'plus' : 'free'}`;
  badge.replaceChildren();

  const label = document.createElement('span');
  label.className = 'hub-plan-badge__label';
  label.textContent = summary.planLabel;
  badge.append(label);

  if (!isPlus) {
    const link = document.createElement('a');
    link.className = 'hub-plan-badge__upgrade';
    link.href = summary.upgradeUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Upgrade';
    badge.append(link);
  }
}

/**
 * Load and show the owner plan badge in the shell header.
 */
export function initPlanBadge() {
  const refresh = () => {
    if (isHouseSitterExperience()) {
      renderBadge(null);
      return;
    }
    renderBadge(getCachedHubPlanSummary());
  };

  subscribeToUserMode(() => {
    refresh();
    if (!isHouseSitterExperience()) {
      void fetchHubPlanSummary().then((summary) => renderBadge(summary));
    }
  });

  void fetchHubPlanSummary().then((summary) => renderBadge(summary));
  refresh();
}
