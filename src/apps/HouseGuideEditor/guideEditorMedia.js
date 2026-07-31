import { buildHouseGuideMediaUrl, uploadHouseGuideMedia } from '../../api/houseGuideApi.js';
import {
  loadHouseGuideMediaLibrary,
  refreshGuideContent,
  removeHouseGuideMediaItem
} from '../../services/guideContentService.js';
import { showConfirmDialog } from '../../components/ConfirmDialog/confirmDialog.js';
import { showToast } from '../../js/modules/toast.js';

/**
 * @param {import('../../types/app.js').ShellContext} context
 * @param {() => void} onBack
 */
export function renderMediaLibrary(context, onBack) {
  const panel = document.createElement('section');
  panel.className = 'house-guide-editor-media-library';

  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'guide-back-button';
  back.textContent = '← Editor';
  back.addEventListener('click', onBack);

  const heading = document.createElement('h3');
  heading.className = 'guide-section-heading';
  heading.textContent = 'Photo library';

  const intro = document.createElement('p');
  intro.className = 'subtle';
  intro.textContent =
    'Uploaded photos appear in guide blocks. Bundled photos from the original guide cannot be deleted here.';

  const listHost = document.createElement('div');
  listHost.className = 'house-guide-editor-media-list';

  panel.append(back, heading, intro, listHost);
  void loadAndRender(context, listHost);
  return panel;
}

/**
 * @param {import('../../types/app.js').ShellContext} context
 * @param {HTMLElement} listHost
 */
async function loadAndRender(context, listHost) {
  listHost.replaceChildren(createStatus('Loading photos…'));
  const result = await loadHouseGuideMediaLibrary();
  if (!result.ok || !result.data?.media) {
    listHost.replaceChildren(createStatus(result.message || 'Could not load photos.'));
    return;
  }

  const media = /** @type {Array<{ id: string, alt: string, hasUpload?: boolean, sourceFile?: string | null }>} */ (
    result.data.media
  );
  if (!media.length) {
    listHost.replaceChildren(createStatus('No photos yet. Upload one from a photo block in any topic.'));
    return;
  }

  listHost.replaceChildren();
  for (const item of media) {
    listHost.append(renderMediaRow(item, context, () => loadAndRender(context, listHost)));
  }
}

/**
 * @param {{ id: string, alt: string, hasUpload?: boolean, sourceFile?: string | null }} item
 * @param {import('../../types/app.js').ShellContext} context
 * @param {() => void} onChange
 */
function renderMediaRow(item, context, onChange) {
  const row = document.createElement('article');
  row.className = 'house-guide-editor-media-row';

  const preview = document.createElement('div');
  preview.className = 'house-guide-editor-media-preview';
  if (item.hasUpload) {
    const img = document.createElement('img');
    img.src = buildHouseGuideMediaUrl(item.id);
    img.alt = item.alt;
    img.loading = 'lazy';
    preview.append(img);
  } else {
    preview.textContent = 'Bundled';
  }

  const meta = document.createElement('div');
  meta.className = 'house-guide-editor-media-meta';
  const title = document.createElement('strong');
  title.textContent = item.id;
  const alt = document.createElement('p');
  alt.className = 'subtle';
  alt.textContent = item.alt;
  const tag = document.createElement('span');
  tag.className = 'house-guide-editor-media-tag subtle';
  tag.textContent = item.hasUpload ? 'Uploaded' : 'Bundled (read-only)';
  meta.append(title, alt, tag);

  const actions = document.createElement('div');
  actions.className = 'house-guide-editor-media-actions';

  if (item.hasUpload) {
    const replaceInput = document.createElement('input');
    replaceInput.type = 'file';
    replaceInput.accept = 'image/jpeg,image/png,image/webp,image/gif';
    replaceInput.hidden = true;
    const replaceButton = document.createElement('button');
    replaceButton.type = 'button';
    replaceButton.className = 'button-secondary';
    replaceButton.textContent = 'Replace';
    replaceButton.addEventListener('click', () => replaceInput.click());
    replaceInput.addEventListener('change', () => {
      const file = replaceInput.files?.[0];
      if (!file) return;
      replaceButton.disabled = true;
      const formData = new FormData();
      formData.set('id', item.id);
      formData.set('alt', item.alt);
      formData.set('file', file);
      void uploadHouseGuideMedia(formData)
        .then(async (uploadResult) => {
          replaceButton.disabled = false;
          if (!uploadResult.ok) {
            showToast(context.toast, uploadResult.message || 'Could not replace photo.');
            return;
          }
          await refreshGuideContent(fetch, { draft: true, force: true });
          showToast(context.toast, 'Photo replaced.');
          onChange();
        });
    });

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'button-secondary button-danger';
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => {
      void showConfirmDialog({
        title: `Delete photo "${item.id}"?`,
        message: 'Topics using this photo will show a broken image until you pick another.',
        confirmLabel: 'Delete photo',
        cancelLabel: 'Cancel',
        danger: true
      }).then((confirmed) => {
        if (!confirmed) return;
        deleteButton.disabled = true;
        void removeHouseGuideMediaItem(item.id).then((deleteResult) => {
          deleteButton.disabled = false;
          if (!deleteResult.ok) {
            showToast(context.toast, deleteResult.message || 'Could not delete photo.');
            return;
          }
          showToast(context.toast, 'Photo deleted.');
          onChange();
        });
      });
    });

    actions.append(replaceButton, deleteButton, replaceInput);
  }

  row.append(preview, meta, actions);
  return row;
}

/**
 * @param {string} message
 */
function createStatus(message) {
  const status = document.createElement('p');
  status.className = 'subtle';
  status.textContent = message;
  return status;
}
