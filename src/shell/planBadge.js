import { subscribeToUserMode, isHouseSitterExperience } from '../auth/userMode.js';
import {
  fetchHubPlanSummary,
  formatPlanUsageLine,
  getCachedHubPlanSummary
} from '../services/hubPlanStatus.js';

const BADGE_ID = 'hub-plan-badge';

function renderBadge(summary) {
  let badge = document.getElementById(BADGE_ID);
  if (!summary) {
    badge?.remove();
    return;
  }

  if (!badge) {
    badge = document.createElement('div');
    badge.id = BADGE_ID;
    badge.className = 'hub-plan-badge';
    const header = document.querySelector('.shell-chrome-actions') || document.querySelector('.shell-header');
    header?.prepend(badge);
  }

  const isPlus = summary.plan === 'plus';
  badge.className = `hub-plan-badge hub-plan-badge--${isPlus ? 'plus' : 'free'}`;
  badge.innerHTML = '';

  const label = document.createElement('span');
  label.className = 'hub-plan-badge__label';
  label.textContent = summary.planLabel;

  const detail = document.createElement('span');
  detail.className = 'hub-plan-badge__detail';
  detail.textContent = formatPlanUsageLine(summary) ?? '';

  badge.append(label, detail);

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
