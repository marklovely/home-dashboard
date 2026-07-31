/** @typedef {import('../../types/guideContent.js').GuideBlock} GuideBlock */

import { buildHouseGuideMediaUrl } from '../../api/houseGuideApi.js';
import { resolveGuideMedia } from '../../content/houseguide/guideMedia.js';
import { createGuideRichTextEditor } from './createGuideRichTextEditor.js';
import { createGuideEmojiPicker } from './createGuideEmojiPicker.js';
import { createEmptyGuideBlock } from './guideEditorBlockDefaults.js';

export { createEmptyGuideBlock };

/**
 * @typedef {Object} GuideBlockEditorOptions
 * @property {(formData: FormData) => Promise<{ ok: boolean, message?: string, data?: { id: string } }>} [onUploadImage]
 * @property {(mediaId: string, alt: string, fileName?: string) => void} [onRegisterMedia]
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
  'place',
  'contact'
];

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
      createField('Heading (optional)', block.heading ?? '', (value) => onChange({ ...block, heading: value }), {
        emoji: true
      }),
      createRichTextArea('Content', block.content ?? '', (value) => onChange({ ...block, content: value }))
    );
  } else if (block.type === 'steps') {
    body.append(
      createField('Heading (optional)', block.heading ?? '', (value) => onChange({ ...block, heading: value }), {
        emoji: true
      })
    );
    body.append(
      renderStringList('Steps', block.steps ?? [], (steps) => onChange({ ...block, steps }), 'Add step', undefined, {
        richText: true,
        emoji: true
      })
    );
  } else if (block.type === 'tip' || block.type === 'warning' || block.type === 'note') {
    body.append(
      createField('Heading (optional)', block.heading ?? '', (value) => onChange({ ...block, heading: value }), {
        emoji: true
      }),
      createRichTextArea('Content', block.content ?? '', (value) => onChange({ ...block, content: value }))
    );
  } else if (block.type === 'keyValues' || block.type === 'contact') {
    body.append(
      createField('Heading (optional)', block.heading ?? '', (value) => onChange({ ...block, heading: value }), {
        emoji: true
      })
    );
    body.append(
      renderKeyValueList(block.items ?? [], (items) => onChange({ ...block, items }), block.type === 'contact')
    );
  } else if (block.type === 'heroImage') {
    body.append(renderHeroImageBlock(block, onChange, mediaIds, options));
  } else if (block.type === 'location') {
    body.append(
      createField('Heading', block.heading ?? 'Location', (value) => onChange({ ...block, heading: value }), {
        emoji: true
      }),
      createRichTextArea('Content', block.content ?? '', (value) => onChange({ ...block, content: value }))
    );
  } else if (block.type === 'collapsible') {
    body.append(
      createField('Title', block.heading ?? '', (value) => onChange({ ...block, heading: value }), { emoji: true }),
      createRichTextArea('Content', block.content ?? '', (value) => onChange({ ...block, content: value }))
    );
  } else if (block.type === 'place') {
    body.append(
      createField('Name', block.name ?? '', (value) => onChange({ ...block, name: value }), { emoji: true }),
      createField('Address', block.address ?? '', (value) => onChange({ ...block, address: value })),
      createRichTextArea('Description (optional)', block.description ?? '', (value) =>
        onChange({ ...block, description: value })
      ),
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
    body.append(createRichTextArea('Content', block.content ?? '', (value) => onChange({ ...block, content: value })));
  }

  card.append(header, body);
  return card;
}

/**
 * @param {GuideBlock & { type: 'heroImage' }} block
 * @param {(block: GuideBlock) => void} onChange
 * @param {string[]} mediaIds
 * @param {GuideBlockEditorOptions} options
 */
function renderHeroImageBlock(block, onChange, mediaIds, options) {
  const wrap = document.createElement('div');
  wrap.className = 'guide-editor-photo-block';

  if (block.mediaId) {
    wrap.append(
      createPhotoPreview(block.mediaId, () => onChange({ ...block, mediaId: '' }))
    );
  }

  wrap.append(createImageUploadPanel(block, onChange, options));

  const existingPicker = document.createElement('details');
  existingPicker.className = 'guide-editor-photo-picker';
  existingPicker.open = !block.mediaId && mediaIds.length > 0;
  const pickerSummary = document.createElement('summary');
  pickerSummary.textContent = block.mediaId ? 'Choose a different existing photo' : 'Or choose an existing photo';
  existingPicker.append(
    pickerSummary,
    createMediaSelect('Photo library', block.mediaId ?? '', mediaIds, (value) => onChange({ ...block, mediaId: value }))
  );
  wrap.append(
    existingPicker,
    createField('Caption (optional)', block.caption ?? '', (value) => onChange({ ...block, caption: value }), {
      emoji: true
    })
  );

  return wrap;
}

/**
 * @param {string} mediaId
 * @param {() => void} onClear
 */
function createPhotoPreview(mediaId, onClear) {
  const wrap = document.createElement('div');
  wrap.className = 'guide-editor-photo-preview';

  const frame = document.createElement('div');
  frame.className = 'guide-editor-photo-preview-frame';
  const resolved = resolveGuideMedia(mediaId);
  const img = document.createElement('img');
  img.alt = resolved.ok ? resolved.alt : mediaId;
  img.src = resolved.ok ? resolved.url : buildHouseGuideMediaUrl(mediaId);
  frame.append(img);

  const meta = document.createElement('div');
  meta.className = 'guide-editor-photo-preview-meta';
  const label = document.createElement('span');
  label.className = 'guide-editor-photo-preview-label';
  label.textContent = 'Selected photo';
  const id = document.createElement('strong');
  id.className = 'guide-editor-photo-preview-id';
  id.textContent = mediaId;
  meta.append(label, id);

  const clear = document.createElement('button');
  clear.type = 'button';
  clear.className = 'button-secondary guide-editor-photo-clear';
  clear.textContent = 'Remove photo';
  clear.addEventListener('click', onClear);

  wrap.append(frame, meta, clear);
  return wrap;
}

/**
 * @param {GuideBlock & { type: 'heroImage' }} block
 * @param {(block: GuideBlock) => void} onChange
 * @param {GuideBlockEditorOptions} options
 */
function createImageUploadPanel(block, onChange, options) {
  const wrap = document.createElement('div');
  wrap.className = 'guide-editor-image-upload';

  const heading = document.createElement('span');
  heading.className = 'guide-editor-image-upload-title';
  heading.textContent = block.mediaId ? 'Replace with a new upload' : 'Upload a photo';

  const hint = document.createElement('p');
  hint.className = 'subtle guide-editor-image-upload-hint';
  hint.textContent =
    'Pick a file and upload — it will be attached to this block automatically. Use a short id (letters, numbers, hyphens).';

  const idField = createField('Photo id', block.mediaId ?? '', () => {});
  const idInput = /** @type {HTMLInputElement} */ (idField.querySelector('input'));
  idInput.placeholder = 'e.g. test-topic-photo';

  const altField = createField('Alt text', '', () => {});
  const altInput = /** @type {HTMLInputElement} */ (altField.querySelector('input'));
  altInput.placeholder = 'Describe the photo for accessibility';

  const fileLabel = document.createElement('label');
  fileLabel.className = 'guide-editor-field guide-editor-file-field';
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
  uploadButton.className = 'button-primary guide-editor-upload-button';
  uploadButton.textContent = block.mediaId ? 'Upload and replace' : 'Upload and use photo';

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

        const uploadedId = result.data?.id ?? mediaId;
        onChange({ ...block, mediaId: uploadedId });
        options.onRegisterMedia?.(uploadedId, alt, file.name);
        options.onAfterUpload?.();
        await options.onMediaRefresh?.();
        status.textContent = 'Photo uploaded and attached to this block.';
        options.onUploadStatus?.('Photo uploaded and attached to this block.');
        fileInput.value = '';
        altInput.value = '';
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
 * @param {{ emoji?: boolean }} [options]
 */
function createField(label, value, onChange, options = {}) {
  const wrap = document.createElement('label');
  wrap.className = 'guide-editor-field';
  const span = document.createElement('span');
  span.textContent = label;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = value;
  input.addEventListener('input', () => onChange(input.value));

  wrap.append(span);
  if (options.emoji) {
    const row = document.createElement('div');
    row.className = 'guide-editor-inline-field';
    row.append(input, createGuideEmojiPicker(() => input));
    wrap.append(row);
  } else {
    wrap.append(input);
  }
  return wrap;
}

/**
 * @param {string} label
 * @param {string} value
 * @param {(value: string) => void} onChange
 */
function createRichTextArea(label, value, onChange) {
  return createGuideRichTextEditor(label, value, onChange);
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
 * @param {string} [addLabel]
 * @param {string} [itemPlaceholder]
 * @param {{ richText?: boolean, emoji?: boolean }} [options]
 */
export function renderStringList(label, items, onChange, addLabel = 'Add item', itemPlaceholder, options = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'guide-editor-list';
  const heading = document.createElement('span');
  heading.className = 'guide-editor-list-label';
  heading.textContent = label;
  wrap.append(heading);

  const list = document.createElement('div');
  list.className = 'guide-editor-list-items';

  let currentItems = items.length ? [...items] : [];
  /** @type {Array<() => void>} */
  let destroyEditors = [];

  function render() {
    for (const destroy of destroyEditors) {
      destroy();
    }
    destroyEditors = [];
    list.replaceChildren();
    currentItems.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'guide-editor-list-row guide-editor-list-row-rich';

      if (options.richText) {
        const editor = createGuideRichTextEditor(`Step ${index + 1}`, item, (next) => {
          currentItems = [...currentItems];
          currentItems[index] = next;
          onChange(currentItems);
        }, { compact: true });
        if (editor.destroyEditor) {
          destroyEditors.push(editor.destroyEditor);
        }
        row.append(editor);
      } else {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = item;
        input.placeholder = itemPlaceholder ?? `Item ${index + 1}`;
        input.addEventListener('input', () => {
          currentItems = [...currentItems];
          currentItems[index] = input.value;
          onChange(currentItems);
        });
        if (options.emoji) {
          row.append(createGuideEmojiPicker(() => input), input);
        } else {
          row.append(input);
        }
      }
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'button-secondary guide-editor-list-remove';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => {
        currentItems = currentItems.filter((_, i) => i !== index);
        onChange(currentItems);
        render();
      });
      row.append(remove);
      list.append(row);
    });
  }

  render();

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'button-secondary guide-editor-list-add';
  add.textContent = addLabel;
  add.addEventListener('click', () => {
    currentItems = [...currentItems, ''];
    onChange(currentItems);
    render();
  });

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

  let currentItems = items.length ? [...items] : [];

  function render() {
    list.replaceChildren();
    currentItems.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = allowHref ? 'guide-editor-contact-row' : 'guide-editor-kv-row';
      const label = document.createElement('input');
      label.type = 'text';
      label.placeholder = 'Label';
      label.value = item.label;
      const value = document.createElement('input');
      value.type = 'text';
      value.placeholder = 'Value';
      value.value = item.value;
      /** @type {HTMLInputElement | null} */
      let href = null;
      if (allowHref) {
        href = document.createElement('input');
        href.type = 'text';
        href.placeholder = 'Link (optional, e.g. tel:… or https://…)';
        href.value = item.href ?? '';
      }
      const update = () => {
        currentItems = [...currentItems];
        const rowValue = {
          label: label.value,
          value: value.value
        };
        if (allowHref && href) {
          const hrefValue = href.value.trim();
          if (hrefValue) rowValue.href = hrefValue;
        }
        currentItems[index] = rowValue;
        onChange(currentItems);
      };
      label.addEventListener('input', update);
      value.addEventListener('input', update);
      href?.addEventListener('input', update);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'button-secondary guide-editor-list-remove';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => {
        currentItems = currentItems.filter((_, i) => i !== index);
        onChange(currentItems);
        render();
      });
      if (href) {
        row.append(label, value, href, remove);
      } else {
        row.append(label, value, remove);
      }
      list.append(row);
    });
  }

  render();

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'button-secondary guide-editor-list-add';
  add.textContent = 'Add row';
  add.addEventListener('click', () => {
    currentItems = [
      ...currentItems,
      allowHref ? { label: '', value: '', href: '' } : { label: '', value: '' }
    ];
    onChange(currentItems);
    render();
  });

  wrap.append(list, add);
  return wrap;
}

/**
 * @param {string} value
 * @returns {string[]}
 */
export function parseGuideCommaList(value) {
  return value
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * @param {string[] | undefined} items
 */
export function formatGuideCommaList(items) {
  return (items ?? []).join(', ');
}

/**
 * @param {string} label
 * @param {string[]} items
 * @param {(items: string[]) => void} onChange
 * @param {{ placeholder?: string, hint?: string }} [options]
 */
export function createCommaSeparatedField(label, items, onChange, options = {}) {
  const wrap = document.createElement('label');
  wrap.className = 'guide-editor-field guide-editor-comma-field';

  const span = document.createElement('span');
  span.textContent = label;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'guide-editor-comma-input';
  input.value = formatGuideCommaList(items);
  input.placeholder = options.placeholder ?? 'Separate with commas';

  function commit() {
    const parsed = parseGuideCommaList(input.value);
    input.value = formatGuideCommaList(parsed);
    onChange(parsed);
  }

  input.addEventListener('change', commit);
  input.addEventListener('blur', commit);

  wrap.append(span, input);
  if (options.hint) {
    const hint = document.createElement('p');
    hint.className = 'subtle guide-editor-field-hint';
    hint.textContent = options.hint;
    wrap.append(hint);
  }

  return wrap;
}
