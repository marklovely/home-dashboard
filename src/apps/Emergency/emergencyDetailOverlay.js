import { getProtectedDisplayValue } from '../../content/houseguide/privateContent.js';
import { getGuideTopic } from '../../services/guideService.js';
import { getSiteProfileState } from '../../services/siteProfileService.js';
import { createGuidePanelOverlay } from '../../widgets/HouseGuide/guideActions.js';
import { renderGuideTopicPage } from '../../widgets/HouseGuide/guidePageRenderer.js';

/**
 * @param {HTMLElement} host
 */
export function dismissEmergencyDetailOverlay(host) {
  host.querySelector('.emergency-detail-overlay')?.remove();
}

/**
 * @param {HTMLElement} root
 */
export function stripEmergencyTelLinks(root) {
  for (const link of root.querySelectorAll('a[href^="tel:"]')) {
    const text = document.createElement('span');
    text.textContent = link.textContent;
    link.replaceWith(text);
  }
}

/**
 * @param {HTMLElement} overlay
 */
function wireEmergencyOverlayDismiss(overlay) {
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) overlay.remove();
  });
}

/**
 * @param {HTMLElement} host
 * @param {HTMLElement} overlay
 */
function mountEmergencyOverlay(host, overlay) {
  dismissEmergencyDetailOverlay(host);
  overlay.classList.add('emergency-detail-overlay');
  wireEmergencyOverlayDismiss(overlay);
  host.append(overlay);
}

/**
 * @param {'primary' | 'secondary'} person
 */
function buildOwnerContactOverlay(person) {
  const profile = getSiteProfileState()?.profile ?? {};
  const contact =
    person === 'primary' ? profile.primaryContact ?? {} : profile.secondaryContact ?? {};
  const prefix = person === 'primary' ? 'contacts.mark' : 'contacts.donna';
  const displayName = String(contact.name ?? '').trim() || (person === 'primary' ? 'Primary contact' : 'Secondary contact');
  return createGuidePanelOverlay({
    type: 'panel',
    label: `Contact ${displayName}`,
    heading: `Contact ${displayName}`,
    items: [
      { label: 'Phone', value: getProtectedDisplayValue(`${prefix}.phone`, 'contact') },
      { label: 'Email', value: getProtectedDisplayValue(`${prefix}.email`, 'contact') }
    ]
  });
}

/**
 * @param {HTMLElement} host
 * @param {'primary' | 'secondary'} person
 */
export function openOwnerContactOverlay(host, person) {
  mountEmergencyOverlay(host, buildOwnerContactOverlay(person));
}

/**
 * @param {HTMLElement} host
 * @param {string} topicId
 * @param {import('../../types/app.js').ShellContext} context
 */
export function openEmergencyTopicOverlay(host, topicId, context) {
  const topic = getGuideTopic(topicId);
  if (!topic) {
    mountEmergencyOverlay(
      host,
      createGuidePanelOverlay({
        type: 'panel',
        label: 'Details unavailable',
        heading: 'Details unavailable',
        items: [{ label: 'Status', value: 'This information is not available right now.' }]
      })
    );
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'guide-panel-overlay';

  const panel = document.createElement('div');
  panel.className = 'guide-panel emergency-detail-panel';

  /**
   * @param {string} nestedTopicId
   */
  const openNestedTopic = (nestedTopicId) => {
    openEmergencyTopicOverlay(host, nestedTopicId, context);
  };

  const article = renderGuideTopicPage(topic, context, () => overlay.remove(), openNestedTopic);
  article.querySelector('.guide-back-button')?.remove();
  stripEmergencyTelLinks(article);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'guide-panel-close';
  close.textContent = 'Done';
  close.addEventListener('click', () => overlay.remove());

  panel.append(article, close);
  overlay.append(panel);
  mountEmergencyOverlay(host, overlay);
}
