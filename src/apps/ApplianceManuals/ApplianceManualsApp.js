import { defineApp } from '../../components/App/defineApp.js';
import { getDeviceSessionStatus } from '../../auth/deviceSessionStore.js';
import { isOwnerUserMode } from '../../auth/userMode.js';
import { showToast } from '../../js/modules/toast.js';
import {
  APPLIANCE_MANUAL_CATEGORIES,
  formatApplianceManualDate,
  formatApplianceManualFileSize,
  MAX_APPLIANCE_MANUAL_PDF_BYTES
} from '../../services/applianceManualsConstants.js';
import {
  canManageApplianceManuals,
  getApplianceManualsState,
  refreshApplianceManuals,
  removeApplianceManual,
  replaceApplianceManualPdf,
  setApplianceManualsOwnerDraftOpen,
  subscribeToApplianceManuals,
  updateApplianceManualMetadata,
  uploadApplianceManual
} from '../../services/applianceManualsService.js';
import { renderApplianceManualViewer } from '../../widgets/HouseGuide/applianceManualsViewer.js';

/**
 * @param {HTMLElement} viewport
 */
function mountApplianceManualsApp(viewport) {
  const page = document.createElement('section');
  page.className = 'app-page appliance-manuals-app';
  page.setAttribute('aria-label', 'Appliance Manuals');

  viewport.replaceChildren(page);
  renderPage(page);
}

/**
 * @param {HTMLElement} page
 */
function renderPage(page) {
  page.replaceChildren();

  if (getDeviceSessionStatus() === 'loading') {
    const loading = document.createElement('p');
    loading.className = 'appliance-manuals-status subtle';
    loading.textContent = 'Loading…';
    page.append(loading);
    return;
  }

  if (!isOwnerUserMode() || !canManageApplianceManuals()) {
    const denied = document.createElement('p');
    denied.className = 'appliance-manuals-status';
    denied.textContent = 'Appliance manual management is available in Owner Mode only.';
    page.append(denied);
    return;
  }

  const header = document.createElement('header');
  header.className = 'appliance-manuals-owner-header';
  const title = document.createElement('h2');
  title.textContent = 'Appliance Manuals';
  const intro = document.createElement('p');
  intro.className = 'subtle';
  intro.textContent = 'Upload and publish PDF user guides for house sitters.';
  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.className = 'button-primary';
  addButton.textContent = 'Add manual';
  header.append(title, intro, addButton);

  const status = document.createElement('p');
  status.className = 'appliance-manuals-status subtle';
  status.setAttribute('aria-live', 'polite');

  const list = document.createElement('div');
  list.className = 'appliance-manuals-owner-list';

  const dialogHost = document.createElement('div');
  dialogHost.className = 'appliance-manuals-dialog-host';

  const viewerHost = document.createElement('div');
  viewerHost.className = 'appliance-manuals-viewer-host';
  viewerHost.hidden = true;
  viewerHost.inert = true;

  page.append(header, status, list, dialogHost, viewerHost);

  /** @type {(HTMLElement & { cleanup?: () => void }) | null} */
  let activeViewer = null;

  function closeViewer() {
    activeViewer?.cleanup?.();
    activeViewer = null;
    viewerHost.hidden = true;
    viewerHost.inert = true;
    viewerHost.replaceChildren();
    header.hidden = false;
    list.hidden = false;
    status.hidden = false;
  }

  /**
   * @param {import('../../api/applianceManualsApi.js').ApplianceManual} manual
   */
  function openViewer(manual) {
    activeViewer?.cleanup?.();
    const viewer = renderApplianceManualViewer(manual, closeViewer, { allowDownload: true });
    activeViewer = viewer;
    viewerHost.replaceChildren(viewer);
    viewerHost.hidden = false;
    viewerHost.inert = false;
    header.hidden = true;
    list.hidden = true;
    status.hidden = true;
  }

  function renderList() {
    const current = getApplianceManualsState();
    list.replaceChildren();

    if (current.status === 'loading' || current.status === 'idle') {
      status.textContent = 'Loading appliance manuals…';
      return;
    }

    if (current.status === 'unavailable') {
      status.textContent = 'Appliance manuals are temporarily unavailable.';
      return;
    }

    status.textContent =
      current.manuals.length === 0
        ? 'No manuals yet. Add your first appliance user guide.'
        : `${current.manuals.length} manual${current.manuals.length === 1 ? '' : 's'}`;

    for (const manual of current.manuals) {
      list.append(renderOwnerManualRow(manual, {
        onEdit: () => openEditor(manual),
        onReplace: () => openReplaceDialog(manual),
        onTogglePublish: () => void togglePublish(manual),
        onDelete: () => openDeleteDialog(manual),
        onView: () => openViewer(manual)
      }));
    }
  }

  /**
   * @param {import('../../api/applianceManualsApi.js').ApplianceManual} manual
   * @param {Object} handlers
   */
  function renderOwnerManualRow(manual, handlers) {
    const row = document.createElement('article');
    row.className = 'appliance-manual-owner-row';

    const main = document.createElement('div');
    main.className = 'appliance-manual-owner-main';
    const heading = document.createElement('h3');
    heading.textContent = manual.applianceName;
    const sub = document.createElement('p');
    sub.className = 'subtle';
    sub.textContent = `${manual.title} · ${manual.category}`;
    const meta = document.createElement('p');
    meta.className = 'appliance-manual-owner-meta subtle';
    meta.textContent = `${formatApplianceManualFileSize(manual.fileSize)} · Uploaded ${formatApplianceManualDate(manual.createdAt)}`;
    const badge = document.createElement('span');
    badge.className = manual.published
      ? 'appliance-manual-badge appliance-manual-badge--published'
      : 'appliance-manual-badge';
    badge.textContent = manual.published ? 'Published' : 'Hidden from House Sitters';
    main.append(heading, sub, meta, badge);

    const actions = document.createElement('div');
    actions.className = 'appliance-manual-owner-actions';

    const viewButton = createActionButton('View', handlers.onView);
    const editButton = createActionButton('Edit', handlers.onEdit);
    const replaceButton = createActionButton('Replace PDF', handlers.onReplace);
    const publishButton = createActionButton(
      manual.published ? 'Hide from House Sitters' : 'Publish',
      handlers.onTogglePublish
    );
    const deleteButton = createActionButton('Delete', handlers.onDelete, true);

    actions.append(viewButton, editButton, replaceButton, publishButton, deleteButton);
    row.append(main, actions);
    return row;
  }

  function createActionButton(label, handler, destructive = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = destructive ? 'button-secondary button-danger' : 'button-secondary';
    button.textContent = label;
    button.addEventListener('click', handler);
    return button;
  }

  /**
   * @param {import('../../api/applianceManualsApi.js').ApplianceManual | null} manual
   */
  function openEditor(manual) {
    closeDialog();
    setApplianceManualsOwnerDraftOpen(true);
    const dialog = createFormDialog({
      title: manual ? 'Edit manual' : 'Add manual',
      manual,
      onClose: () => {
        closeDialog();
        setApplianceManualsOwnerDraftOpen(false);
      },
      onSubmit: async (formData, setBusy, setError) => {
        setBusy(true);
        setError('');
        const result = manual
          ? await updateApplianceManualMetadata(manual.id, formDataToPatch(formData))
          : await uploadApplianceManual(formData);
        setBusy(false);
        if (!result.ok) {
          setError(result.message || 'Could not save manual.');
          return;
        }
        showToast(manual ? 'Manual updated.' : 'Manual added.');
        closeDialog();
        setApplianceManualsOwnerDraftOpen(false);
      }
    });
    dialogHost.append(dialog);
  }

  /**
   * @param {import('../../api/applianceManualsApi.js').ApplianceManual} manual
   */
  function openReplaceDialog(manual) {
    closeDialog();
    const dialog = createReplaceDialog(manual, closeDialog);
    dialogHost.append(dialog);
  }

  /**
   * @param {import('../../api/applianceManualsApi.js').ApplianceManual} manual
   */
  function openDeleteDialog(manual) {
    closeDialog();
    const dialog = createDeleteDialog(manual, closeDialog);
    dialogHost.append(dialog);
  }

  function closeDialog() {
    dialogHost.replaceChildren();
  }

  /**
   * @param {import('../../api/applianceManualsApi.js').ApplianceManual} manual
   */
  async function togglePublish(manual) {
    const result = await updateApplianceManualMetadata(manual.id, { published: !manual.published });
    if (!result.ok) {
      showToast(result.message || 'Could not update manual.');
      return;
    }
    showToast(manual.published ? 'Manual hidden from house sitters.' : 'Manual published.');
  }

  addButton.addEventListener('click', () => openEditor(null));

  const unsubscribe = subscribeToApplianceManuals(renderList);
  void refreshApplianceManuals(fetch, { owner: true, force: true });
  renderList();

  page.cleanup = () => {
    unsubscribe();
    activeViewer?.cleanup?.();
    closeDialog();
    setApplianceManualsOwnerDraftOpen(false);
  };
}

/**
 * @param {FormData} formData
 */
function formDataToPatch(formData) {
  return {
    title: String(formData.get('title') ?? ''),
    applianceName: String(formData.get('applianceName') ?? ''),
    manufacturer: nullableField(formData.get('manufacturer')),
    model: nullableField(formData.get('model')),
    category: String(formData.get('category') ?? ''),
    location: nullableField(formData.get('location')),
    description: nullableField(formData.get('description')),
    published: formData.get('published') === 'on'
  };
}

/**
 * @param {FormDataEntryValue | null} value
 */
function nullableField(value) {
  const text = String(value ?? '').trim();
  return text ? text : null;
}

/**
 * @param {Object} options
 */
function createFormDialog(options) {
  const dialog = document.createElement('dialog');
  dialog.className = 'appliance-manuals-dialog';
  dialog.setAttribute('aria-labelledby', 'appliance-manual-dialog-title');

  const form = document.createElement('form');
  form.method = 'dialog';
  form.className = 'appliance-manuals-form';
  form.enctype = 'multipart/form-data';

  const title = document.createElement('h3');
  title.id = 'appliance-manual-dialog-title';
  title.textContent = options.title;

  const error = document.createElement('p');
  error.className = 'appliance-manuals-form-error';
  error.hidden = true;
  error.setAttribute('role', 'alert');

  form.append(title, error);
  form.append(createField('Manual title', 'title', 'text', options.manual?.title ?? '', true));
  form.append(
    createField('Appliance name', 'applianceName', 'text', options.manual?.applianceName ?? '', true)
  );
  form.append(createField('Manufacturer', 'manufacturer', 'text', options.manual?.manufacturer ?? ''));
  form.append(createField('Model', 'model', 'text', options.manual?.model ?? ''));
  form.append(createCategoryField(options.manual?.category ?? 'Kitchen'));
  form.append(createField('Location', 'location', 'text', options.manual?.location ?? ''));
  form.append(createTextArea('Description', 'description', options.manual?.description ?? ''));

  if (!options.manual) {
    form.append(createPdfField(true));
  }

  const publishedWrap = document.createElement('label');
  publishedWrap.className = 'appliance-manuals-checkbox';
  const published = document.createElement('input');
  published.type = 'checkbox';
  published.name = 'published';
  published.checked = options.manual?.published ?? false;
  publishedWrap.append(published, document.createTextNode(' Published'));
  form.append(publishedWrap);

  const actions = document.createElement('div');
  actions.className = 'appliance-manuals-form-actions';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'button-secondary';
  cancel.textContent = 'Cancel';
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'button-primary';
  submit.textContent = options.manual ? 'Save changes' : 'Add manual';
  actions.append(cancel, submit);
  form.append(actions);

  cancel.addEventListener('click', () => options.onClose());
  form.addEventListener('close', () => options.onClose());

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (submit.disabled) return;

    const formData = new FormData(form);
    if (!options.manual) {
      const file = formData.get('file');
      if (!(file instanceof File) || !file.name) {
        showFieldError(error, 'Please select a PDF file.');
        return;
      }
      if (file.size > MAX_APPLIANCE_MANUAL_PDF_BYTES) {
        showFieldError(error, 'The PDF must be smaller than 15 MB.');
        return;
      }
      if (!/\.pdf$/i.test(file.name)) {
        showFieldError(error, 'Please select a PDF file.');
        return;
      }
    }

    if (!String(formData.get('title') ?? '').trim()) {
      showFieldError(error, 'Manual title is required.');
      return;
    }
    if (!String(formData.get('applianceName') ?? '').trim()) {
      showFieldError(error, 'Appliance name is required.');
      return;
    }

    void options.onSubmit(
      formData,
      (busy) => {
        submit.disabled = busy;
        submit.textContent = busy ? 'Uploading…' : options.manual ? 'Save changes' : 'Add manual';
      },
      (message) => showFieldError(error, message)
    );
  });

  dialog.append(form);
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    options.onClose();
  });
  dialog.showModal();
  return dialog;
}

/**
 * @param {import('../../api/applianceManualsApi.js').ApplianceManual} manual
 * @param {() => void} onClose
 */
function createReplaceDialog(manual, onClose) {
  const dialog = document.createElement('dialog');
  dialog.className = 'appliance-manuals-dialog';

  const form = document.createElement('form');
  form.className = 'appliance-manuals-form';

  const title = document.createElement('h3');
  title.textContent = 'Replace PDF';

  const copy = document.createElement('p');
  copy.className = 'subtle';
  copy.textContent = `Replace the user guide for ${manual.applianceName}.`;

  const error = document.createElement('p');
  error.className = 'appliance-manuals-form-error';
  error.hidden = true;

  form.append(title, copy, error, createPdfField(true));

  const actions = document.createElement('div');
  actions.className = 'appliance-manuals-form-actions';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'button-secondary';
  cancel.textContent = 'Cancel';
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'button-primary';
  submit.textContent = 'Replace PDF';
  actions.append(cancel, submit);
  form.append(actions);

  cancel.addEventListener('click', onClose);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submit.disabled) return;
    const formData = new FormData(form);
    const file = formData.get('file');
    if (!(file instanceof File) || !file.name) {
      showFieldError(error, 'Please select a PDF file.');
      return;
    }
    submit.disabled = true;
    submit.textContent = 'Uploading…';
    const uploadData = new FormData();
    uploadData.append('file', file);
    const result = await replaceApplianceManualPdf(manual.id, uploadData);
    submit.disabled = false;
    submit.textContent = 'Replace PDF';
    if (!result.ok) {
      showFieldError(error, result.message || 'Could not replace PDF.');
      return;
    }
    showToast('PDF replaced.');
    onClose();
  });

  dialog.append(form);
  dialog.showModal();
  return dialog;
}

/**
 * @param {import('../../api/applianceManualsApi.js').ApplianceManual} manual
 * @param {() => void} onClose
 */
function createDeleteDialog(manual, onClose) {
  const dialog = document.createElement('dialog');
  dialog.className = 'appliance-manuals-dialog';

  const title = document.createElement('h3');
  title.textContent = 'Delete appliance manual?';

  const copy = document.createElement('p');
  copy.textContent =
    'This will permanently remove the manual and its PDF. House sitters will no longer be able to view it.';

  const actions = document.createElement('div');
  actions.className = 'appliance-manuals-form-actions';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'button-secondary';
  cancel.textContent = 'Cancel';
  const submit = document.createElement('button');
  submit.type = 'button';
  submit.className = 'button-primary button-danger';
  submit.textContent = 'Delete Manual';
  actions.append(cancel, submit);

  cancel.addEventListener('click', onClose);
  submit.addEventListener('click', async () => {
    submit.disabled = true;
    const result = await removeApplianceManual(manual.id);
    submit.disabled = false;
    if (!result.ok) {
      showToast(result.message || 'Could not delete manual.');
      return;
    }
    showToast('Manual deleted.');
    onClose();
  });

  dialog.append(title, copy, actions);
  dialog.showModal();
  return dialog;
}

function createField(labelText, name, type, value, required = false) {
  const label = document.createElement('label');
  label.className = 'appliance-manuals-field';
  const span = document.createElement('span');
  span.textContent = labelText;
  const input = document.createElement('input');
  input.name = name;
  input.type = type;
  input.value = value ?? '';
  input.required = required;
  label.append(span, input);
  return label;
}

function createTextArea(labelText, name, value) {
  const label = document.createElement('label');
  label.className = 'appliance-manuals-field';
  const span = document.createElement('span');
  span.textContent = labelText;
  const textarea = document.createElement('textarea');
  textarea.name = name;
  textarea.value = value ?? '';
  textarea.rows = 3;
  label.append(span, textarea);
  return label;
}

function createCategoryField(selected) {
  const label = document.createElement('label');
  label.className = 'appliance-manuals-field';
  const span = document.createElement('span');
  span.textContent = 'Category';
  const select = document.createElement('select');
  select.name = 'category';
  select.required = true;
  for (const category of APPLIANCE_MANUAL_CATEGORIES) {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    option.selected = category === selected;
    select.append(option);
  }
  label.append(span, select);
  return label;
}

function createPdfField(required) {
  const label = document.createElement('label');
  label.className = 'appliance-manuals-field';
  const span = document.createElement('span');
  span.textContent = 'PDF file';
  const input = document.createElement('input');
  input.type = 'file';
  input.name = 'file';
  input.accept = 'application/pdf,.pdf';
  input.required = required;
  label.append(span, input);
  return label;
}

function showFieldError(element, message) {
  element.textContent = message;
  element.hidden = !message;
}

export const applianceManualsApp = defineApp({
  id: 'appliance-manuals',
  title: 'Appliance Manuals',
  iconId: 'book-open',
  description: 'Upload and manage appliance user guides',
  capabilities: ['documents', 'owner-private'],
  accent: '#5b8def',
  profiles: ['owner'],
  mount(viewport) {
    mountApplianceManualsApp(viewport);
  }
});
