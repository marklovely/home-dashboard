/** @typedef {import('../../types/guideContent.js').GuideBlock} GuideBlock */

/**
 * @typedef {Object} GuideBlockEditorOptions
 * @property {(formData: FormData) => Promise<{ ok: boolean, message?: string, data?: { id: string } }>} [onUploadImage]
 * @property {() => Promise<void>} [onMediaRefresh]
 * @property {(message: string) => void} [onUploadStatus]
 * @property {() => void} [onAfterUpload]
 */

export const GUIDE_BLOCK_TYPE_LABELS = {
  text: 'Paragraph',
  steps: 'Numbered steps',
  tip: 'Tip',
  warning: 'Warning',
  note: 'Note',
  keyValues: 'Details list',
  heroImage: 'Photo',
  location: 'Location',
  collapsible: 'Expandable section',
  protected: 'Private info',
  contact: 'Contacts',
  place: 'Place'
};

/** @type {GuideBlock['type'][]} */
export const EDITABLE_BLOCK_TYPES = [
  'text',
  'steps',
  'tip',
  'warning',
  'note',
  'keyValues',
  'heroImage',
  'location',
  'collapsible',
  'place'
];

/**
 * @param {GuideBlock['type']} type
 */
export function createEmptyGuideBlock(type) {
  switch (type) {
    case 'text':
      return { type: 'text', content: '' };
    case 'steps':
      return { type: 'steps', heading: '', steps: [''] };
    case 'tip':
    case 'warning':
    case 'note':
      return { type, content: '' };
    case 'keyValues':
      return { type: 'keyValues', heading: '', items: [{ label: '', value: '' }] };
    case 'heroImage':
      return { type: 'heroImage', mediaId: '', caption: '' };
    case 'location':
      return { type: 'location', heading: 'Location', content: '' };
    case 'collapsible':
      return { type: 'collapsible', heading: '', content: '' };
    case 'place':
      return { type: 'place', name: '', address: '', description: '', dogFriendly: false, website: '' };
    default:
      return { type: 'text', content: '' };
  }
}

/**
 * @param {GuideBlock} block
 * @param {(block: GuideBlock) => void} onChange
 * @param {string[]} mediaIds
 * @param {GuideBlockEditorOptions} [options]
 */
export function renderGuideBlockEditor(block, onChange, mediaIds, options = {}) {
  const card = document.createElement('article');
  card.className = 'guide-editor-block';
  card.dataset.blockType = block.type;

  const header = document.createElement('header');
  header.className = 'guide-editor-block-header';
  const label = document.createElement('span');
  label.className = 'guide-editor-block-type';
  label.textContent = GUIDE_BLOCK_TYPE_LABELS[block.type] ?? block.type;
  header.append(label);

  const body = document.createElement('div');
  body.className = 'guide-editor-block-body';

  if (block.type === 'text') {
    body.append(
      createField('Heading (optional)', block.heading ?? '', (value) => onChange({ ...block, heading: value })),
      createTextArea('Content', block.content ?? '', (value) => onChange({ ...block, content: value }))
    );
  } else if (block.type === 'steps') {
    body.append(createField('Heading (optional)', block.heading ?? '', (value) => onChange({ ...block, heading: value })));
    body.append(renderStringList('Steps', block.steps ?? [], (steps) => onChange({ ...block, steps })));
  } else if (block.type === 'tip' || block.type === 'warning' || block.type === 'note') {
    body.append(
      createField('Heading (optional)', block.heading ?? '', (value) => onChange({ ...block, heading: value })),
      createTextArea('Content', block.content ?? '', (value) => onChange({ ...block, content: value }))
    );
  } else if (block.type === 'keyValues' || block.type === 'contact') {
    body.append(createField('Heading (optional)', block.heading ?? '', (value) => onChange({ ...block, heading: value })));
    body.append(
      renderKeyValueList(block.items ?? [], (items) => onChange({ ...block, items }), block.type === 'contact')
    );
  } else if (block.type === 'heroImage') {
    body.append(
      createMediaSelect('Photo', block.mediaId ?? '', mediaIds, (value) => onChange({ ...block, mediaId: value })),
      createImageUploadPanel(block.mediaId ?? '', (mediaId) => onChange({ ...block, mediaId }), options),
      createField('Caption (optional)', block.caption ?? '', (value) => onChange({ ...block, caption: value }))
    );
  } else if (block.type === 'location') {
    body.append(
      createField('Heading', block.heading ?? 'Location', (value) => onChange({ ...block, heading: value })),
      createTextArea('Content', block.content ?? '', (value) => onChange({ ...block, content: value }))
    );
  } else if (block.type === 'collapsible') {
    body.append(
      createField('Title', block.heading ?? '', (value) => onChange({ ...block, heading: value })),
      createTextArea('Content', block.content ?? '', (value) => onChange({ ...block, content: value }))
    );
  } else if (block.type === 'place') {
    body.append(
      createField('Name', block.name ?? '', (value) => onChange({ ...block, name: value })),
      createField('Address', block.address ?? '', (value) => onChange({ ...block, address: value })),
      createTextArea('Description (optional)', block.description ?? '', (value) => onChange({ ...block, description: value })),
      createCheckbox('Dog friendly', Boolean(block.dogFriendly), (checked) => onChange({ ...block, dogFriendly: checked })),
      createField('Website (optional)', block.website ?? '', (value) => onChange({ ...block, website: value }))
    );
  } else if (block.type === 'protected') {
    const note = document.createElement('p');
    note.className = 'subtle';
    note.textContent =
      'Private values (Wi‑Fi, contacts, etc.) are managed separately and are not edited here.';
    body.append(note);
  } else {
    body.append(createTextArea('Content', block.content ?? '', (value) => onChange({ ...block, content: value })));
  }

  card.append(header, body);
  return card;
}

/**
 * @param {string} currentMediaId
 * @param {(mediaId: string) => void} onSelect
 * @param {GuideBlockEditorOptions} options
 */
function createImageUploadPanel(currentMediaId, onSelect, options) {
  const wrap = document.createElement('div');
  wrap.className = 'guide-editor-image-upload';

  const heading = document.createElement('span');
  heading.className = 'guide-editor-image-upload-title';
  heading.textContent = 'Upload a new photo';

  const hint = document.createElement('p');
  hint.className = 'subtle guide-editor-image-upload-hint';
  hint.textContent = 'Use a short id (letters, numbers, hyphens). After upload it appears in the photo list above.';

  const idField = createField('Photo id', currentMediaId, () => {});
  const idInput = /** @type {HTMLInputElement} */ (idField.querySelector('input'));
  idInput.placeholder = 'e.g. garden-hose-bins';

  const altField = createField('Alt text', '', () => {});
  const altInput = /** @type {HTMLInputElement} */ (altField.querySelector('input'));
  altInput.placeholder = 'Describe the photo for accessibility';

  const fileLabel = document.createElement('label');
  fileLabel.className = 'guide-editor-field';
  const fileSpan = document.createElement('span');
  fileSpan.textContent = 'Image file';
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/jpeg,image/png,image/webp,image/gif';
  fileLabel.append(fileSpan, fileInput);

  const status = document.createElement('p');
  status.className = 'guide-editor-upload-status subtle';
  status.hidden = true;

  const uploadButton = document.createElement('button');
  uploadButton.type = 'button';
  uploadButton.className = 'button-secondary guide-editor-upload-button';
  uploadButton.textContent = 'Upload photo';

  uploadButton.addEventListener('click', () => {
    if (!options.onUploadImage) {
      status.hidden = false;
      status.textContent = 'Upload is not available right now.';
      return;
    }

    const mediaId = idInput.value.trim();
    const alt = altInput.value.trim();
    const file = fileInput.files?.[0];

    if (!mediaId || !alt || !file) {
      status.hidden = false;
      status.textContent = 'Photo id, alt text, and an image file are required.';
      return;
    }

    uploadButton.disabled = true;
    status.hidden = false;
    status.textContent = 'Uploading…';

    const formData = new FormData();
    formData.set('id', mediaId);
    formData.set('alt', alt);
    formData.set('file', file);

    void options
      .onUploadImage(formData)
      .then(async (result) => {
        if (!result.ok) {
          status.textContent = result.message || 'Upload failed.';
          return;
        }
        await options.onMediaRefresh?.();
        onSelect(result.data?.id ?? mediaId);
        options.onAfterUpload?.();
        status.textContent = 'Photo uploaded. It is selected above.';
        options.onUploadStatus?.('Photo uploaded.');
        fileInput.value = '';
      })
      .finally(() => {
        uploadButton.disabled = false;
      });
  });

  wrap.append(heading, hint, idField, altField, fileLabel, uploadButton, status);
  return wrap;
}

/**
 * @param {string} label
 * @param {boolean} checked
 * @param {(checked: boolean) => void} onChange
 */
function createCheckbox(label, checked, onChange) {
  const wrap = document.createElement('label');
  wrap.className = 'guide-editor-field guide-editor-checkbox';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));
  const span = document.createElement('span');
  span.textContent = label;
  wrap.append(input, span);
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
 * @param {(value: string) => void} onChange
 */
function createTextArea(label, value, onChange) {
  const wrap = document.createElement('label');
  wrap.className = 'guide-editor-field';
  const span = document.createElement('span');
  span.textContent = label;
  const textarea = document.createElement('textarea');
  textarea.rows = 4;
  textarea.value = value;
  textarea.addEventListener('input', () => onChange(textarea.value));
  wrap.append(span, textarea);
  return wrap;
}

/**
 * @param {string} label
 * @param {string} value
 * @param {string[]} options
 * @param {(value: string) => void} onChange
 */
function createMediaSelect(label, value, options, onChange) {
  const wrap = document.createElement('label');
  wrap.className = 'guide-editor-field';
  const span = document.createElement('span');
  span.textContent = label;
  const select = document.createElement('select');
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = 'Choose a photo…';
  select.append(empty);
  for (const mediaId of options) {
    const option = document.createElement('option');
    option.value = mediaId;
    option.textContent = mediaId;
    option.selected = mediaId === value;
    select.append(option);
  }
  select.addEventListener('change', () => onChange(select.value));
  wrap.append(span, select);
  return wrap;
}

/**
 * @param {string} label
 * @param {string[]} items
 * @param {(items: string[]) => void} onChange
 */
function renderStringList(label, items, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'guide-editor-list';
  const heading = document.createElement('span');
  heading.className = 'guide-editor-list-label';
  heading.textContent = label;
  wrap.append(heading);

  const list = document.createElement('div');
  list.className = 'guide-editor-list-items';

  function render() {
    list.replaceChildren();
    items.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'guide-editor-list-row';
      const input = document.createElement('input');
      input.type = 'text';
      input.value = item;
      input.placeholder = `Step ${index + 1}`;
      input.addEventListener('input', () => {
        const next = [...items];
        next[index] = input.value;
        onChange(next);
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'button-secondary guide-editor-list-remove';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => {
        const next = items.filter((_, i) => i !== index);
        onChange(next.length ? next : ['']);
      });
      row.append(input, remove);
      list.append(row);
    });
  }

  render();

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'button-secondary guide-editor-list-add';
  add.textContent = 'Add step';
  add.addEventListener('click', () => onChange([...items, '']));

  wrap.append(list, add);
  return wrap;
}

/**
 * @param {{ label: string, value: string, href?: string }[]} items
 * @param {(items: { label: string, value: string, href?: string }[]) => void} onChange
 * @param {boolean} allowHref
 */
function renderKeyValueList(items, onChange, allowHref = false) {
  const wrap = document.createElement('div');
  wrap.className = 'guide-editor-list';
  const list = document.createElement('div');
  list.className = 'guide-editor-list-items';

  function render() {
    list.replaceChildren();
    items.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'guide-editor-kv-row';
      const label = document.createElement('input');
      label.type = 'text';
      label.placeholder = 'Label';
      label.value = item.label;
      const value = document.createElement('input');
      value.type = 'text';
      value.placeholder = 'Value';
      value.value = item.value;
      const update = () => {
        const next = [...items];
        next[index] = {
          label: label.value,
          value: value.value,
          ...(allowHref && item.href !== undefined ? { href: item.href } : {})
        };
        onChange(next);
      };
      label.addEventListener('input', update);
      value.addEventListener('input', update);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'button-secondary guide-editor-list-remove';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => {
        onChange(items.filter((_, i) => i !== index));
      });
      row.append(label, value, remove);
      list.append(row);
    });
  }

  render();

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'button-secondary guide-editor-list-add';
  add.textContent = 'Add row';
  add.addEventListener('click', () => onChange([...items, { label: '', value: '' }]));

  wrap.append(list, add);
  return wrap;
}
