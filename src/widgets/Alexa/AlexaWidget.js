import { defineWidget } from '../../components/Widget/defineWidget.js';
import { triggerVirtualButton } from '../../api/virtualButtons.js';
import { showToast } from '../../js/modules/toast.js';
import { formatTime } from '../../js/utils/format.js';
import { renderButtonGroups } from './buttonGroups.js';
import { runRoutineButtonAction } from './routineButtonFeedback.js';

/**
 * @param {import('../../types/widget.js').WidgetContext} context
 */
function createTriggerHandler(context) {
  return async function handleTrigger(button, element) {
    if (!navigator.onLine) {
      showToast(context.toast, 'You are offline');
      return;
    }
    await runRoutineButtonAction(
      element,
      () => triggerVirtualButton({ buttonId: button.id }),
      {
        onSuccess: () => {
          showToast(context.toast, `✓ ${button.title} activated`);
          context.lastCommand.textContent = `${button.title} · ${formatTime(new Date())}`;
        },
        onError: (error) => {
          console.error(error);
          showToast(context.toast, error instanceof Error ? error.message : 'Request failed');
        }
      }
    );
  };
}

export const alexaWidget = defineWidget({
  id: 'alexa',
  profiles: ['owner', 'housesitter'],
  mount(context) {
    const fragment = document.createDocumentFragment();
    renderButtonGroups(fragment, context.config, undefined, createTriggerHandler(context));
    return fragment;
  }
});
