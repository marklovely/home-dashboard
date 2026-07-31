/** @typedef {import('../../types/guideContent.js').GuideAction} GuideAction */

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
          next[index] = { ...action, label: value };
          currentActions = next;
          onChange(next);
        })
      );

      if (action.type === 'alexa') {
        body.append(
          createField('Alexa button number', String(action.buttonId ?? ''), (value) => {
            const next = [...currentActions];
            next[index] = { ...action, buttonId: Number(value) || 1 };
            currentActions = next;
            onChange(next);
          })
        );
      } else if (action.type === 'navigate') {
        body.append(
          createTopicSelect('Topic to open', action.topicId ?? '', topicOptions, (value) => {
            const next = [...currentActions];
            next[index] = { ...action, topicId: value };
            currentActions = next;
            onChange(next);
          })
        );
      } else if (action.type === 'panel') {
        body.append(
          createField('Panel heading (optional)', action.heading ?? '', (value) => {
            const next = [...currentActions];
            next[index] = { ...action, heading: value };
            currentActions = next;
            onChange(next);
          }),
          renderPanelItems(action.items ?? [], (items) => {
            const next = [...currentActions];
            next[index] = { ...action, items };
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
