import { findManualsForGuideTopic } from '../../services/applianceManualsGuideLinks.js';
import {
  getApplianceManualsState,
  refreshApplianceManuals,
  subscribeToApplianceManuals
} from '../../services/applianceManualsService.js';

/**
 * @param {HTMLElement} host
 * @param {import('../../types/guideContent.js').GuideTopic} topic
 * @param {(manual: import('../../api/applianceManualsApi.js').ApplianceManual) => void} onViewManual
 */
export function wireGuideTopicManualLinks(host, topic, onViewManual) {
  function render() {
    host.replaceChildren();
    const current = getApplianceManualsState();

    if (current.status !== 'ready') {
      return;
    }

    const manuals = findManualsForGuideTopic(topic, current.manuals);
    if (manuals.length === 0) {
      return;
    }

    const section = document.createElement('section');
    section.className = 'guide-topic-manual-links';
    section.setAttribute('aria-label', 'User guides');

    const heading = document.createElement('h3');
    heading.className = 'guide-section-heading';
    heading.textContent = manuals.length === 1 ? 'User guide' : 'User guides';

    const intro = document.createElement('p');
    intro.className = 'guide-topic-manual-links-intro subtle';
    intro.textContent = 'PDF instructions for this appliance.';

    const row = document.createElement('div');
    row.className = 'guide-topic-manual-links-row';

    for (const manual of manuals) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'guide-action-button guide-topic-manual-link-button';
      button.style.setProperty('--accent', '#5b8cff');
      button.textContent =
        manuals.length === 1
          ? `View ${manual.applianceName} manual`
          : `View ${manual.applianceName} — ${manual.title}`;
      button.addEventListener('click', () => onViewManual(manual));
      row.append(button);
    }

    section.append(heading, intro, row);
    host.append(section);
  }

  const unsubscribe = subscribeToApplianceManuals(render);
  void refreshApplianceManuals(fetch, { owner: false });
  render();

  return unsubscribe;
}
