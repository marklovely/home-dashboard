/** @typedef {import('../../types/guideContent.js').GuideAction} GuideAction */

const TOPIC_ID_PATTERN = /^[a-z0-9-]{1,64}$/i;

export const GUIDE_ACTION_TYPE_LABELS = {
  alexa: 'Alexa routine',
  navigate: 'Open another topic',
  panel: 'Info panel'
};

/**
 * @param {GuideAction['type']} type
 */
export function createEmptyGuideAction(type) {
  if (type === 'alexa') return { type: 'alexa', buttonId: 1, label: '' };
  if (type === 'navigate') return { type: 'navigate', topicId: '', label: '' };
  return { type: 'panel', label: '', heading: '', items: [{ label: '', value: '' }] };
}

/**
 * @param {GuideAction[] | undefined} actions
 * @returns {string | null}
 */
export function validateGuideActions(actions) {
  if (!Array.isArray(actions)) return 'Quick actions must be a list.';
  if (actions.length > 12) return 'A topic can have at most 12 quick actions.';

  for (let index = 0; index < actions.length; index += 1) {
    const action = actions[index];
    const position = index + 1;

    if (!action || typeof action !== 'object') {
      return `Quick action ${position} is invalid.`;
    }

    if (action.type === 'alexa') {
      const buttonId = Number(action.buttonId);
      const label = String(action.label ?? '').trim();
      if (!label) return `Quick action ${position}: enter a button label.`;
      if (!Number.isInteger(buttonId) || buttonId < 1 || buttonId > 99) {
        return `Quick action ${position}: Alexa button number must be between 1 and 99.`;
      }
      continue;
    }

    if (action.type === 'navigate') {
      const label = String(action.label ?? '').trim();
      const topicId = String(action.topicId ?? '').trim();
      if (!label) return `Quick action ${position}: enter a button label.`;
      if (!topicId) return `Quick action ${position}: choose a topic to open.`;
      if (!TOPIC_ID_PATTERN.test(topicId)) {
        return `Quick action ${position}: topic id "${topicId}" is invalid (letters, numbers, and hyphens only).`;
      }
      continue;
    }

    if (action.type === 'panel') {
      const label = String(action.label ?? '').trim();
      if (!label) return `Quick action ${position}: enter a button label.`;
      const items = Array.isArray(action.items) ? action.items : [];
      if (items.length > 24) return `Quick action ${position}: info panel can have at most 24 rows.`;
      for (let rowIndex = 0; rowIndex < items.length; rowIndex += 1) {
        const row = items[rowIndex];
        const rowLabel = String(row?.label ?? '').trim();
        const rowValue = String(row?.value ?? '').trim();
        if (!rowLabel || !rowValue) {
          return `Quick action ${position}, row ${rowIndex + 1}: enter both label and value, or remove the row.`;
        }
      }
      continue;
    }

    return `Quick action ${position}: unknown action type "${String(action.type ?? '')}".`;
  }

  return null;
}

/**
 * @param {GuideAction[] | undefined} actions
 * @returns {GuideAction[]}
 */
export function normalizeGuideActionsForSave(actions) {
  return (actions ?? []).map((action) => {
    if (action.type === 'alexa') {
      return {
        type: 'alexa',
        buttonId: Number(action.buttonId),
        label: String(action.label ?? '').trim()
      };
    }
    if (action.type === 'navigate') {
      return {
        type: 'navigate',
        topicId: String(action.topicId ?? '').trim(),
        label: String(action.label ?? '').trim()
      };
    }
    const items = (action.items ?? [])
      .map((row) => ({
        label: String(row?.label ?? '').trim(),
        value: String(row?.value ?? '').trim()
      }))
      .filter((row) => row.label && row.value);
    const heading = String(action.heading ?? '').trim();
    return {
      type: 'panel',
      label: String(action.label ?? '').trim(),
      ...(heading ? { heading } : {}),
      items
    };
  });
}

/**
 * @param {GuideAction[]} actions
 * @param {(actions: GuideAction[]) => void} onChange
 * @param {{ id: string, title: string }[]} topicOptions
 */
export function renderGuideActionsEditor(actions, onChange, topicOptions) {
  const wrap = document.createElement('div');
  wrap.className = 'guide-editor-actions';

  const list = document.createElement('div');
  list.className = 'guide-editor-actions-list';

  let currentActions = [...actions];

  function updateActions(next) {
    currentActions = next;
    onChange(next);
    render();
  }

  function render() {
    list.replaceChildren();
    currentActions.forEach((action, index) => {
      const card = document.createElement('article');
      card.className = 'guide-editor-action-card';

      const header = document.createElement('header');
      header.className = 'guide-editor-action-header';
      header.textContent = GUIDE_ACTION_TYPE_LABELS[action.type] ?? action.type;

      const body = document.createElement('div');
      body.className = 'guide-editor-action-body';

      body.append(
        createField('Button label', action.label ?? '', (value) => {
          const next = [...currentActions];
          next[index] = { ...next[index], label: value };
          currentActions = next;
          onChange(next);
        })
      );

      if (action.type === 'alexa') {
        body.append(
          createField('Alexa button number', String(action.buttonId ?? ''), (value) => {
            const next = [...currentActions];
            next[index] = { ...next[index], buttonId: Number(value) || 1 };
            currentActions = next;
            onChange(next);
          })
        );
      } else if (action.type === 'navigate') {
        body.append(
          createTopicSelect('Topic to open', action.topicId ?? '', topicOptions, (value) => {
            const next = [...currentActions];
            next[index] = { ...next[index], topicId: value };
            currentActions = next;
            onChange(next);
          })
        );
      } else if (action.type === 'panel') {
        body.append(
          createField('Panel heading (optional)', action.heading ?? '', (value) => {
            const next = [...currentActions];
            next[index] = { ...next[index], heading: value };
            currentActions = next;
            onChange(next);
          }),
          renderPanelItems(action.items ?? [], (items) => {
            const next = [...currentActions];
            next[index] = { ...next[index], items };
            currentActions = next;
            onChange(next);
          })
        );
      }

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'button-secondary button-danger guide-editor-action-remove';
      remove.textContent = 'Remove action';
      remove.addEventListener('click', () => updateActions(currentActions.filter((_, i) => i !== index)));

      card.append(header, body, remove);
      list.append(card);
    });
  }

  render();

  const addRow = document.createElement('div');
  addRow.className = 'guide-editor-add-block';
  const addSelect = document.createElement('select');
  addSelect.className = 'house-guide-editor-add-select';
  addSelect.setAttribute('aria-label', 'Add quick action');
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Add a quick action…';
  addSelect.append(placeholder);
  for (const type of /** @type {GuideAction['type'][]} */ (['alexa', 'navigate', 'panel'])) {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = GUIDE_ACTION_TYPE_LABELS[type];
    addSelect.append(option);
  }
  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.className = 'button-secondary';
  addButton.textContent = 'Add';
  addButton.addEventListener('click', () => {
    const type = /** @type {GuideAction['type']} */ (addSelect.value);
    if (!type) return;
    updateActions([...currentActions, createEmptyGuideAction(type)]);
    addSelect.value = '';
  });

  addRow.append(addSelect, addButton);
  wrap.append(list, addRow);
  return wrap;
}

/**
 * @param {{ label: string, value: string }[]} items
 * @param {(items: { label: string, value: string }[]) => void} onChange
 */
function renderPanelItems(items, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'guide-editor-list';
  const label = document.createElement('span');
  label.className = 'guide-editor-list-label';
  label.textContent = 'Panel rows';
  wrap.append(label);

  const list = document.createElement('div');
  list.className = 'guide-editor-list-items';
  let currentItems = items.length ? [...items] : [{ label: '', value: '' }];

  function renderItems() {
    list.replaceChildren();
    currentItems.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'guide-editor-kv-row';
      const rowLabel = document.createElement('input');
      rowLabel.type = 'text';
      rowLabel.placeholder = 'Label';
      rowLabel.value = item.label;
      const value = document.createElement('input');
      value.type = 'text';
      value.placeholder = 'Value';
      value.value = item.value;
      const update = () => {
        currentItems = [...currentItems];
        currentItems[index] = { label: rowLabel.value, value: value.value };
        onChange(currentItems);
      };
      rowLabel.addEventListener('input', update);
      value.addEventListener('input', update);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'button-secondary guide-editor-list-remove';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => {
        currentItems = currentItems.filter((_, i) => i !== index);
        onChange(currentItems);
        renderItems();
      });
      row.append(rowLabel, value, remove);
      list.append(row);
    });
  }

  renderItems();

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'button-secondary guide-editor-list-add';
  add.textContent = 'Add row';
  add.addEventListener('click', () => {
    currentItems = [...currentItems, { label: '', value: '' }];
    onChange(currentItems);
    renderItems();
  });

  wrap.append(list, add);
  return wrap;
}

/**
 * @param {string} label
 * @param {string} value
 * @param {(value: string) => void} onChange
 */
function createField(label, value, onChange) {
  const wrap = document.createElement('label');
  wrap.className = 'guide-editor-field';
  const span = document.createElement('span');
  span.textContent = label;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = value;
  input.addEventListener('input', () => onChange(input.value));
  wrap.append(span, input);
  return wrap;
}

/**
 * @param {string} label
 * @param {string} value
 * @param {{ id: string, title: string }[]} options
 * @param {(value: string) => void} onChange
 */
function createTopicSelect(label, value, options, onChange) {
  const wrap = document.createElement('label');
  wrap.className = 'guide-editor-field';
  const span = document.createElement('span');
  span.textContent = label;
  const select = document.createElement('select');
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = 'Choose a topic…';
  select.append(empty);
  for (const option of options) {
    const node = document.createElement('option');
    node.value = option.id;
    node.textContent = option.title;
    node.selected = option.id === value;
    select.append(node);
  }
  select.addEventListener('change', () => onChange(select.value));
  wrap.append(span, select);
  return wrap;
}
