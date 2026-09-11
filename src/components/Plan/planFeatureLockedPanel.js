import { planFeatureLockedCopy } from '../../services/hubPlanFeatures.js';

/**
 * @param {'bins' | 'smartHome'} feature
 * @param {{ className?: string }} [options]
 */
export function createPlanFeatureLockedPanel(feature, options = {}) {
  const copy = planFeatureLockedCopy(feature);
  const panel = document.createElement('section');
  panel.className = ['plan-feature-locked', options.className].filter(Boolean).join(' ');
  panel.setAttribute('aria-label', copy.title);

  const title = document.createElement('h2');
  title.className = 'plan-feature-locked__title';
  title.textContent = copy.title;

  const badge = document.createElement('p');
  badge.className = 'plan-feature-locked__badge';
  badge.textContent = 'Lovely Home+';

  const body = document.createElement('p');
  body.className = 'plan-feature-locked__copy subtle';
  body.textContent = copy.body;

  panel.append(title, badge, body);

  if (copy.showUpgrade && copy.upgradeUrl) {
    const actions = document.createElement('div');
    actions.className = 'plan-feature-locked__actions';
    const link = document.createElement('a');
    link.className = 'button-secondary';
    link.href = copy.upgradeUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Upgrade to Lovely Home+';
    actions.append(link);
    panel.append(actions);
  }

  return panel;
}
