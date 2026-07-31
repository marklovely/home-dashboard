import 'emoji-picker-element';

/**
 * @param {() => HTMLInputElement | HTMLTextAreaElement | null} getInput
 */
export function createGuideEmojiPicker(getInput) {
  const wrap = document.createElement('div');
  wrap.className = 'guide-editor-emoji-picker';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'guide-editor-format-button guide-editor-emoji-toggle';
  toggle.title = 'Insert emoji';
  toggle.setAttribute('aria-label', 'Insert emoji');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.textContent = '😀';

  const panel = document.createElement('div');
  panel.className = 'guide-editor-emoji-panel-host';
  panel.hidden = true;

  const picker = document.createElement('emoji-picker');
  picker.className = 'guide-editor-emoji-picker-widget';
  picker.addEventListener('emoji-click', (event) => {
    const input = getInput();
    const emoji = event.detail?.unicode;
    if (input && emoji) {
      insertAtCursor(input, emoji);
    }
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  });

  panel.append(picker);
  toggle.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    toggle.setAttribute('aria-expanded', panel.hidden ? 'false' : 'true');
  });

  wrap.append(toggle, panel);
  return wrap;
}

/**
 * @param {HTMLInputElement | HTMLTextAreaElement} input
 * @param {string} text
 */
export function insertAtCursor(input, text) {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  const value = input.value;
  input.value = value.slice(0, start) + text + value.slice(end);
  const next = start + text.length;
  input.setSelectionRange(next, next);
  input.focus();
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
