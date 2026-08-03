import { CircleHelp, createElement } from 'lucide';

/**
 * Short always-visible hint under a field label (tablet-friendly; no hover required).
 *
 * @param {string} text
 */
export function createFieldHint(text) {
  const hint = document.createElement('p');
  hint.className = 'field-help-hint subtle';
  hint.textContent = text;
  return hint;
}

/**
 * Tap-to-expand detail panel beside a field label.
 *
 * @param {string} helpText
 * @param {string} [label]
 */
export function createFieldInfoHint(helpText, label = 'More information') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'field-info-button hub-setup-info-button';
  button.setAttribute('aria-label', label);
  button.setAttribute('aria-expanded', 'false');
  button.append(
    createElement(CircleHelp, {
      width: 20,
      height: 20,
      'stroke-width': 1.75,
      'aria-hidden': 'true'
    })
  );

  const panel = document.createElement('p');
  panel.className = 'settings-help subtle field-info-panel hub-setup-info-panel';
  panel.hidden = true;
  panel.textContent = helpText;

  button.addEventListener('click', () => {
    const expanded = panel.hidden;
    panel.hidden = !expanded;
    button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  });

  return { button, panel };
}

/**
 * @param {string} label
 * @param {{ hint?: string, helpText?: string, helpLabel?: string }} [options]
 */
export function createFieldLabelBlock(label, options = {}) {
  const fragment = document.createDocumentFragment();

  const labelRow = document.createElement('div');
  labelRow.className = 'field-label-row';

  const title = document.createElement('span');
  title.className = 'settings-subsection-title';
  title.textContent = label;
  labelRow.append(title);

  /** @type {HTMLElement | null} */
  let helpPanel = null;
  if (options.helpText) {
    const info = createFieldInfoHint(options.helpText, options.helpLabel ?? `Help: ${label}`);
    labelRow.append(info.button);
    helpPanel = info.panel;
  }

  fragment.append(labelRow);
  if (options.hint) fragment.append(createFieldHint(options.hint));
  if (helpPanel) fragment.append(helpPanel);

  return { fragment, labelRow, helpPanel };
}
