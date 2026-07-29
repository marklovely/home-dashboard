import { triggerVirtualButton } from '../../api/virtualButtons.js';
import { showToast } from '../../js/modules/toast.js';

/**
 * @param {import('../../types/guideContent.js').GuideAction} action
 * @param {import('../../types/app.js').ShellContext} context
 * @param {(topicId: string) => void} openTopic
 * @returns {boolean}
 */
export function runGuideAction(action, context, openTopic) {
  if (action.type === 'alexa') {
    if (!navigator.onLine) {
      showToast(context.toast, 'You are offline');
      return false;
    }
    void triggerVirtualButton({ accessCode: context.config.accessCode, buttonId: action.buttonId })
      .then(() => showToast(context.toast, `✓ ${action.label}`))
      .catch((error) => {
        console.error(error);
        showToast(context.toast, error.message);
      });
    return true;
  }

  if (action.type === 'navigate') {
    openTopic(action.topicId);
    return true;
  }

  if (action.type === 'panel') {
    return true;
  }

  return false;
}

/**
 * @param {import('../../types/guideContent.js').GuideActionPanel} action
 * @returns {HTMLElement}
 */
export function createGuidePanelOverlay(action) {
  const overlay = document.createElement('div');
  overlay.className = 'guide-panel-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const panel = document.createElement('div');
  panel.className = 'guide-panel';

  const heading = document.createElement('h3');
  heading.className = 'guide-panel-title';
  heading.textContent = action.heading ?? action.label;

  const list = document.createElement('dl');
  list.className = 'guide-panel-list';
  for (const item of action.items) {
    const dt = document.createElement('dt');
    dt.textContent = item.label;
    const dd = document.createElement('dd');
    dd.textContent = item.value;
    list.append(dt, dd);
  }

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'guide-panel-close';
  close.textContent = 'Done';

  const dismiss = () => overlay.remove();
  close.addEventListener('click', dismiss);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) dismiss();
  });

  panel.append(heading, list, close);
  overlay.append(panel);
  return overlay;
}
