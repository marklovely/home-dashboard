import { defineWidget } from '../../components/Widget/defineWidget.js';
import { triggerVirtualButton } from '../../api/virtualButtons.js';
import { showToast } from '../../js/modules/toast.js';
import { formatTime } from '../../js/utils/format.js';
import { renderButtons } from './buttons.js';

/**
 * @param {import('../../types/widget.js').WidgetContext} context
 */
function createTriggerHandler(context) {
  return async function handleTrigger(button, element) {
    if (!navigator.onLine) {
      showToast(context.toast, 'You are offline');
      return;
    }
    element.classList.add('is-pressing');
    navigator.vibrate?.(35);
    try {
      await triggerVirtualButton({ buttonId: button.id });
      showToast(context.toast, `✓ ${button.title} activated`);
      context.lastCommand.textContent = `${button.title} · ${formatTime(new Date())}`;
    } catch (error) {
      console.error(error);
      showToast(context.toast, error.message);
    } finally {
      window.setTimeout(() => element.classList.remove('is-pressing'), 180);
    }
  };
}

export const alexaWidget = defineWidget({
  id: 'alexa',
  profiles: ['owner', 'housesitter'],
  mount(context) {
    const fragment = document.createDocumentFragment();
    renderButtons(fragment, context.config.buttons, createTriggerHandler(context));
    return fragment;
  }
});
