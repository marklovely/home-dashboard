/** Common emojis for home-manual content. */
export const GUIDE_EDITOR_EMOJIS = [
  '🐕', '✅', '⚠️', '📺', '🏠', '🔑', '🚗', '☕', '🌡️', '💡',
  '📶', '🅿️', '🛁', '🧺', '🍳', '❄️', '🔥', '🚪', '📞', '✉️'
];

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

/**
 * @param {HTMLInputElement | HTMLTextAreaElement} input
 * @param {string} before
 * @param {string} [after]
 * @param {string} [placeholder]
 */
export function wrapSelection(input, before, after = before, placeholder = 'text') {
  const start = input.selectionStart ?? 0;
  const end = input.selectionEnd ?? start;
  const value = input.value;
  const selected = value.slice(start, end) || placeholder;
  const wrapped = `${before}${selected}${after}`;
  input.value = value.slice(0, start) + wrapped + value.slice(end);
  const selectStart = start + before.length;
  const selectEnd = selectStart + selected.length;
  input.setSelectionRange(selectStart, selectEnd);
  input.focus();
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * @param {HTMLInputElement | HTMLTextAreaElement} input
 */
export function insertMarkdownLink(input) {
  const start = input.selectionStart ?? 0;
  const end = input.selectionEnd ?? start;
  const value = input.value;
  const selected = value.slice(start, end);
  const label = selected || 'link text';
  const wrapped = `[${label}](https://)`;
  input.value = value.slice(0, start) + wrapped + value.slice(end);
  const urlStart = start + label.length + 3;
  const urlEnd = urlStart + 8;
  input.setSelectionRange(urlStart, urlEnd);
  input.focus();
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * @param {() => HTMLInputElement | HTMLTextAreaElement | null} getInput
 * @param {{ richText?: boolean }} [options]
 */
export function createGuideEditorFormattingBar(getInput, options = {}) {
  const bar = document.createElement('div');
  bar.className = 'guide-editor-formatting-bar';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Text formatting');

  if (options.richText !== false) {
    bar.append(
      createFormatButton('Bold', 'B', () => {
        const input = getInput();
        if (input) wrapSelection(input, '**', '**', 'bold text');
      }),
      createFormatButton('Italic', 'I', () => {
        const input = getInput();
        if (input) wrapSelection(input, '*', '*', 'italic text');
      }),
      createFormatButton('Link', 'Link', () => {
        const input = getInput();
        if (input) insertMarkdownLink(input);
      })
    );
  }

  bar.append(createEmojiPickerButton(getInput));
  return bar;
}

/**
 * @param {string} title
 * @param {string} label
 * @param {() => void} onClick
 */
function createFormatButton(title, label, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'guide-editor-format-button';
  button.title = title;
  button.setAttribute('aria-label', title);
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

/**
 * @param {() => HTMLInputElement | HTMLTextAreaElement | null} getInput
 */
function createEmojiPickerButton(getInput) {
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
  panel.className = 'guide-editor-emoji-panel';
  panel.hidden = true;

  for (const emoji of GUIDE_EDITOR_EMOJIS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'guide-editor-emoji-option';
    button.textContent = emoji;
    button.title = `Insert ${emoji}`;
    button.addEventListener('click', () => {
      const input = getInput();
      if (input) insertAtCursor(input, emoji);
      panel.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
    });
    panel.append(button);
  }

  toggle.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    toggle.setAttribute('aria-expanded', panel.hidden ? 'false' : 'true');
  });

  wrap.append(toggle, panel);
  return wrap;
}
