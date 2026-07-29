import { getModeConfig } from '../../modes/modeConfig.js';
import { triggerVirtualButton } from '../../api/virtualButtons.js';
import { showToast } from '../../js/modules/toast.js';
import { createRoutineButton } from '../Alexa/buttons.js';

/**
 * @param {string} subtitle
 */
function sitterFriendlySubtitle(subtitle) {
  if (!subtitle) return '';
  if (/virtual button/i.test(subtitle)) return '';
  return subtitle;
}

/**
 * @param {import('../../types/widget.js').WidgetContext} context
 */
export function mountSitterControlsGrid(context) {
  const rules = getModeConfig().controls;
  const buttons = context.config.buttons ?? [];

  const fragment = document.createDocumentFragment();
  const grid = document.createElement('section');
  grid.className = 'button-grid controls-grid controls-grid--sitter';
  grid.setAttribute('aria-label', 'Home controls');

  for (const button of buttons) {
    const labels = rules?.labels?.[button.id];
    const display = {
      ...button,
      title: labels?.title ?? button.title,
      subtitle: sitterFriendlySubtitle(labels?.subtitle ?? button.subtitle ?? '')
    };
    const element = createRoutineButton(display, async (pressed, el) => {
      if (!navigator.onLine) {
        showToast(context.toast, 'You are offline — try again when connected.');
        return;
      }
      el.classList.add('is-pressing');
      navigator.vibrate?.(35);
      try {
        await triggerVirtualButton({ buttonId: pressed.id });
        showToast(context.toast, `✓ ${display.title}`);
      } catch (error) {
        console.error(error);
        showToast(context.toast, 'That control is unavailable right now. Please try again.');
      } finally {
        window.setTimeout(() => el.classList.remove('is-pressing'), 180);
      }
    });
    element.classList.add('routine-button--sitter');
    grid.append(element);
  }

  fragment.append(grid);
  return fragment;
}
