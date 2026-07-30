import { getModeConfig } from '../../modes/modeConfig.js';
import { triggerVirtualButton } from '../../api/virtualButtons.js';
import { showToast } from '../../js/modules/toast.js';
import { renderButtonGroups } from '../Alexa/buttonGroups.js';
import { runRoutineButtonAction } from '../Alexa/routineButtonFeedback.js';
import { isButtonAllowedForSitter } from '../../config/controlPermissions.js';

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

  const displayButtons = buttons
    .filter((button) => isButtonAllowedForSitter(button.id))
    .map((button) => {
      const labels = rules?.labels?.[button.id];
      return {
        ...button,
        title: labels?.title ?? button.title,
        subtitle: sitterFriendlySubtitle(labels?.subtitle ?? button.subtitle ?? '')
      };
    });

  const fragment = document.createDocumentFragment();
  const wrapper = document.createElement('section');
  wrapper.className = 'controls-grid controls-grid--grouped controls-grid--sitter';
  wrapper.setAttribute('aria-label', 'Home controls');

  renderButtonGroups(
    wrapper,
    context.config,
    displayButtons,
    async (pressed, el) => {
      if (!navigator.onLine) {
        showToast(context.toast, 'You are offline — try again when connected.');
        return;
      }
      const display = displayButtons.find((b) => b.id === pressed.id) ?? pressed;
      await runRoutineButtonAction(
        el,
        () => triggerVirtualButton({ buttonId: pressed.id }),
        {
          onSuccess: () => showToast(context.toast, `✓ ${display.title}`),
          onError: (error) => {
            console.error(error);
            const message =
              error instanceof Error && error.message
                ? error.message
                : 'That control is unavailable right now. Please try again.';
            showToast(context.toast, message);
          }
        }
      );
    },
    (element) => {
      element.classList.add('routine-button--sitter');
    }
  );

  fragment.append(wrapper);
  return fragment;
}
