import { defineApp } from '../../components/App/defineApp.js';
import { getDeviceSessionStatus } from '../../auth/deviceSessionStore.js';
import { isOwnerUserMode } from '../../auth/userMode.js';
import { showConfirmDialog } from '../../components/ConfirmDialog/confirmDialog.js';
import { showPasswordDialog } from '../../components/PasswordDialog/passwordDialog.js';
import { showToast } from '../../js/modules/toast.js';
import {
  getGuideCategory,
  getGuideTopic,
  listGuideCategories,
  listGuideTopics
} from '../../services/guideService.js';
import {
  canManageHouseGuideContent,
  createNewHouseGuideTopic,
  getActiveGuideCatalog,
  getGuideContentState,
  importBundledGuideToCloud,
  publishAllHouseGuideChanges,
  publishHouseGuideTopicContent,
  refreshGuideContent,
  registerGuideMediaUpload,
  removeHouseGuideTopic,
  reorderHouseGuideTopicsInCategory,
  saveHouseGuideSettings,
  saveHouseGuideTopic,
  subscribeToGuideContent
} from '../../services/guideContentService.js';
import { saveSiteProfile, syncSiteProfileFromServer } from '../../services/siteProfileService.js';
import { isTestHubEnvironment } from '../../auth/hubEnvironment.js';
import { openHubSetupWizard } from '../HubSetup/hubSetupLauncher.js';
import { uploadHouseGuideMedia } from '../../api/houseGuideApi.js';
import { fetchHouseGuideExport, restoreSiteBackup } from '../../api/siteBackupApi.js';
import {
  backupRestoreSummary,
  downloadEncryptedBackupFile,
  normalizeBackupForRestore,
  readJsonFile,
  resolveBackupDocument,
  uploadedMediaRestoreHint
} from '../../utils/backupJson.js';
import { listCatalogMediaIds } from '../../content/houseguide/guideMedia.js';
import {
  normalizeGuideActionsForSave,
  renderGuideActionsEditor,
  validateGuideActions
} from './guideEditorActions.js';
import { renderMediaLibrary } from './guideEditorMedia.js';
import { moveItem, wirePointerReorder } from './guideEditorReorder.js';
import {
  createGuideEditorContextHelpLink,
  createGuideEditorHelpButton,
  createGuideEditorSectionHeading
} from './guideEditorHelp.js';
import {
  createCommaSeparatedField,
  createEmptyGuideBlock,
  EDITABLE_BLOCK_TYPES,
  GUIDE_BLOCK_TYPE_LABELS,
  renderGuideBlockEditor
} from './guideEditorUi.js';

/**
 * @param {HTMLElement} viewport
 * @param {import('../../types/app.js').ShellContext} context
 */
function mountHouseGuideEditorApp(viewport, context) {
  const page = document.createElement('section');
  page.className = 'app-page house-guide-editor-app';
  page.setAttribute('aria-label', 'House Guide Editor');
  viewport.replaceChildren(page);

  /** @type {HTMLElement | null} */
  let editorShell = null;

  function showStaticEditorPage() {
    editorShell?.cleanup?.();
    editorShell = null;
    renderEditorPage(page, context);
  }

  function ensureEditorShell() {
    const state = getGuideContentState();

    if (getDeviceSessionStatus() === 'loading') {
      showStaticEditorPage();
      return;
    }

    if (!isOwnerUserMode() || !canManageHouseGuideContent()) {
      showStaticEditorPage();
      return;
    }

    if (state.source === 'loading' || state.source === 'idle') {
      if (!editorShell) {
        showStaticEditorPage();
      }
      return;
    }

    if (!state.seeded) {
      showStaticEditorPage();
      return;
    }

    if (!editorShell) {
      page.replaceChildren();
      editorShell = createEditorShell(context);
      page.append(editorShell);
    }
  }

  const unsubscribe = subscribeToGuideContent(ensureEditorShell);
  void refreshGuideContent(fetch, { draft: true, force: true });
  ensureEditorShell();

  page.cleanup = () => {
    unsubscribe();
    editorShell?.cleanup?.();
  };
}

/**
 * @param {HTMLElement} page
 * @param {import('../../types/app.js').ShellContext} context
 */
function renderEditorPage(page, context) {
  page.replaceChildren();

  if (getDeviceSessionStatus() === 'loading') {
    page.append(createStatus('Loading…'));
    return;
  }

  if (getDeviceSessionStatus() === 'error') {
    page.append(
      createStatus(
        'Could not verify your session with the API. While logged in, check Network → /api/device-session (401/503 usually means test Worker secrets or Access AUD).'
      )
    );
    return;
  }

  if (!isOwnerUserMode()) {
    page.append(createStatus('House Guide editing is available in Owner Mode only.'));
    return;
  }

  if (!canManageHouseGuideContent()) {
    page.append(createStatus('House Guide editing is unavailable right now.'));
    return;
  }

  const state = getGuideContentState();
  if (state.source === 'loading' || state.source === 'idle') {
    page.append(createStatus('Loading house guide…'));
    return;
  }

  if (!state.seeded) {
    page.append(createOnboardingPanel(page, context));
    return;
  }

  page.append(createEditorShell(context));
}

/**
 * @param {string} message
 */
function createStatus(message) {
  const status = document.createElement('p');
  status.className = 'house-guide-editor-status subtle';
  status.textContent = message;
  return status;
}

/**
 * @param {HTMLElement} page
 * @param {import('../../types/app.js').ShellContext} context
 */
function createOnboardingPanel(page, context) {
  const panel = document.createElement('section');
  panel.className = 'house-guide-editor-onboarding';

  const title = document.createElement('h2');
  title.textContent = 'Set up your House Guide';

  const copy = document.createElement('p');
  copy.className = 'subtle';
  copy.textContent = isTestHubEnvironment()
    ? 'On the test hub, use Hub setup → Import starter guide to add content for this property. The production Rose Cottage guide cannot be copied here.'
    : 'Copy your current guide into the cloud so you can edit it here without changing code. House sitters and guests will see updates after you publish.';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button-primary';
  button.textContent = isTestHubEnvironment()
    ? 'Open hub setup wizard'
    : 'Copy current guide to cloud';
  button.addEventListener('click', () => {
    if (isTestHubEnvironment()) {
      openHubSetupWizard(context);
      return;
    }
    button.disabled = true;
    button.textContent = 'Copying…';
    void importBundledGuideToCloud().then((result) => {
      button.disabled = false;
      button.textContent = 'Copy current guide to cloud';
      if (!result.ok) {
        showToast(context.toast, result.message || 'Could not copy guide.');
        return;
      }
      showToast(context.toast, 'Guide copied to cloud.');
      renderEditorPage(page, context);
    });
  });

  panel.append(title, copy, button, createGuideEditorHelpButton());

  const helpHint = document.createElement('p');
  helpHint.className = 'subtle house-guide-editor-help-hint';
  helpHint.append(
    'New to the editor? Open ',
    createGuideEditorContextHelpLink('checklist', 'Writing guide'),
    ' for how topics, blocks, and publishing work.'
  );
  panel.append(helpHint);

  return panel;
}

/** @param {import('../../types/app.js').ShellContext} context */
function createEditorShell(context) {
  const shell = document.createElement('div');
  shell.className = 'house-guide-editor-shell';

  /** @type {'categories' | 'topics' | 'topic' | 'media'} */
  let view = 'categories';
  /** @type {string | null} */
  let activeCategoryId = null;
  /** @type {string | null} */
  let activeTopicId = null;

  /** @type {import('../../types/guideContent.js').GuideTopic | null} */
  let draftTopic = null;

  const header = document.createElement('header');
  header.className = 'house-guide-editor-header';

  const title = document.createElement('h2');
  title.textContent = 'House Guide Editor';

  const intro = document.createElement('p');
  intro.className = 'subtle house-guide-editor-intro';
  intro.textContent = 'Edit help pages for house sitters and guests. Save changes as a draft, then publish when ready.';

  const toolbar = document.createElement('div');
  toolbar.className = 'house-guide-editor-toolbar';

  const draftBadge = document.createElement('span');
  draftBadge.className = 'house-guide-editor-draft-badge';
  draftBadge.hidden = true;

  const publishAllButton = document.createElement('button');
  publishAllButton.type = 'button';
  publishAllButton.className = 'button-primary';
  publishAllButton.textContent = 'Publish all changes';
  publishAllButton.addEventListener('click', () => {
    publishAllButton.disabled = true;
    void publishAllHouseGuideChanges().then((result) => {
      publishAllButton.disabled = false;
      if (!result.ok) {
        showToast(context.toast, result.message || 'Could not publish.');
        return;
      }
      showToast(context.toast, 'All changes published.');
      syncDraftBadge();
    });
  });

  const photosButton = document.createElement('button');
  photosButton.type = 'button';
  photosButton.className = 'button-secondary';
  photosButton.textContent = 'Photo library';
  photosButton.addEventListener('click', () => {
    view = 'media';
    renderMain();
  });

  const exportButton = document.createElement('button');
  exportButton.type = 'button';
  exportButton.className = 'button-secondary';
  exportButton.textContent = 'Export JSON';
  exportButton.addEventListener('click', () => {
    exportButton.disabled = true;
    void (async () => {
      try {
        const result = await fetchHouseGuideExport();
        if (!result.ok || !result.data) {
          showToast(context.toast, result.message || 'Could not export guide.');
          return;
        }
        const password = await showPasswordDialog({
          title: 'Encrypt guide export',
          message:
            'Choose a password for this export file. You will need the same password to import it later.',
          confirmLabel: 'Download',
          requireConfirmation: true
        });
        if (!password) return;
        await downloadEncryptedBackupFile('house-guide-export.json', result.data, password);
        showToast(context.toast, 'Encrypted guide export downloaded.');
      } catch (error) {
        showToast(context.toast, error instanceof Error ? error.message : 'Could not export guide.');
      } finally {
        exportButton.disabled = false;
      }
    })();
  });

  const importLabel = document.createElement('label');
  importLabel.className = 'house-guide-editor-file-input button-secondary';
  importLabel.textContent = 'Import JSON';
  const importInput = document.createElement('input');
  importInput.type = 'file';
  importInput.accept = 'application/json,.json';
  importInput.hidden = true;
  importLabel.append(importInput);
  importInput.addEventListener('change', () => {
    const file = importInput.files?.[0];
    importInput.value = '';
    if (!file) return;

    void (async () => {
      try {
        const raw = await readJsonFile(file);
        const decrypted = await resolveBackupDocument(raw, () =>
          showPasswordDialog({
            title: 'Decrypt guide export',
            message: 'Enter the password used when this file was exported.',
            confirmLabel: 'Continue'
          })
        );
        const backup = normalizeBackupForRestore(decrypted);
        const uploaded = /** @type {{ id: string, alt: string }[]} */ (
          backup.guide?.uploadedMedia ?? []
        );
        const confirmed = await showConfirmDialog({
          title: 'Import House Guide?',
          message: `${backupRestoreSummary(backup)}${uploadedMediaRestoreHint(uploaded)}`,
          confirmLabel: 'Import',
          danger: true
        });
        if (!confirmed) return;

        showToast(context.toast, 'Importing guide…', 120000);
        const result = await restoreSiteBackup(backup);
        if (!result.ok) {
          showToast(context.toast, result.message || 'Import failed.');
          return;
        }
        await refreshGuideContent(fetch, { draft: true, force: true });
        await saveSiteProfile({ onboardingComplete: true });
        await syncSiteProfileFromServer();
        showToast(context.toast, 'House Guide imported.');
        view = 'categories';
        activeCategoryId = null;
        activeTopicId = null;
        renderMain();
        syncDraftBadge();
      } catch (error) {
        showToast(context.toast, error instanceof Error ? error.message : 'Invalid guide file.');
      }
    })();
  });

  const helpButton = createGuideEditorHelpButton();
  toolbar.append(helpButton, draftBadge, exportButton, importLabel, photosButton, publishAllButton);
  header.append(title, intro, renderGuideIntroSettings(context), toolbar);

  const main = document.createElement('div');
  main.className = 'house-guide-editor-main';

  shell.append(header, main);

  function syncDraftBadge() {
    const count = getGuideContentState().draftCount;
    draftBadge.hidden = count === 0;
    draftBadge.textContent = count === 1 ? '1 unpublished change' : `${count} unpublished changes`;
    publishAllButton.hidden = count === 0;
  }

  function renderMain() {
    main.replaceChildren();
    syncDraftBadge();

    if (view === 'categories') {
      main.append(renderCategoryPicker((categoryId) => {
        activeCategoryId = categoryId;
        view = 'topics';
        renderMain();
      }));
      return;
    }

    if (view === 'topics' && activeCategoryId) {
      main.append(
        renderTopicPicker(activeCategoryId, context, () => {
          view = 'categories';
          activeCategoryId = null;
          renderMain();
        }, (topicId) => {
          activeTopicId = topicId;
          const topic = getGuideTopic(topicId);
          draftTopic = topic ? structuredClone(topic) : null;
          view = 'topic';
          renderMain();
        }, () => renderMain())
      );
      return;
    }

    if (view === 'media') {
      main.append(
        renderMediaLibrary(context, () => {
          view = 'categories';
          renderMain();
        })
      );
      return;
    }

    if (view === 'topic' && activeTopicId && draftTopic) {
      main.append(
        renderTopicEditor(draftTopic, context, {
          onBack: () => {
            view = 'topics';
            activeTopicId = null;
            draftTopic = null;
            renderMain();
          },
          onTopicChange: (next) => {
            draftTopic = next;
          },
          onSaved: () => {
            syncDraftBadge();
            showToast(context.toast, 'Draft saved.');
          },
          onPublished: () => {
            syncDraftBadge();
            showToast(context.toast, 'Topic published.');
          },
          onDeleted: () => {
            view = 'topics';
            activeTopicId = null;
            draftTopic = null;
            renderMain();
            showToast(context.toast, 'Topic deleted.');
          }
        })
      );
    }
  }

  const unsubscribe = subscribeToGuideContent(() => {
    if (view !== 'topic' || !draftTopic) {
      if (activeTopicId) {
        const refreshed = getGuideTopic(activeTopicId);
        if (refreshed) draftTopic = structuredClone(refreshed);
      }
    }
    renderMain();
  });

  renderMain();

  shell.cleanup = () => unsubscribe();
  return shell;
}

/**
 * @param {(categoryId: string) => void} onOpen
 */
function renderCategoryPicker(onOpen) {
  const panel = document.createElement('section');
  panel.className = 'house-guide-editor-picker';

  const heading = document.createElement('h3');
  heading.className = 'guide-section-heading';
  heading.textContent = 'Choose an area';

  const grid = document.createElement('div');
  grid.className = 'guide-category-grid';

  for (const category of listGuideCategories()) {
    if (category.id === 'appliance-manuals') continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'guide-category-card house-guide-editor-category-card';
    button.style.setProperty('--accent', category.accent);
    button.innerHTML = `<span class="guide-category-title">${category.title}</span><span class="guide-category-subtitle">${category.topics.length} topic${category.topics.length === 1 ? '' : 's'}</span>`;
    button.addEventListener('click', () => onOpen(category.id));
    grid.append(button);
  }

  if (!grid.children.length) {
    const empty = document.createElement('p');
    empty.className = 'house-guide-editor-empty subtle';
    empty.textContent = 'No guide areas found. Use “Copy current guide to cloud” on first setup.';
    panel.append(heading, empty);
    return panel;
  }

  panel.append(heading, grid);
  return panel;
}

/**
 * @param {string} categoryId
 * @param {import('../../types/app.js').ShellContext} context
 * @param {() => void} onBack
 * @param {(topicId: string) => void} onOpen
 * @param {(topicId: string) => void} onOpen
 * @param {() => void} onRevert
 */
function renderTopicPicker(categoryId, context, onBack, onOpen, onRevert) {
  const category = getGuideCategory(categoryId);
  const panel = document.createElement('section');
  panel.className = 'house-guide-editor-picker';

  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'guide-back-button';
  back.textContent = '← All areas';
  back.addEventListener('click', onBack);

  const heading = document.createElement('h3');
  heading.className = 'guide-section-heading';
  heading.textContent = category?.title ?? 'Topics';

  const reorderHint = document.createElement('p');
  reorderHint.className = 'subtle house-guide-editor-reorder-hint';
  reorderHint.textContent = 'Drag the handle beside a topic to change its order.';

  const list = document.createElement('div');
  list.className = 'house-guide-editor-topic-list';

  /** @type {import('../../types/guideContent.js').GuideTopic[]} */
  let topics = [...(category?.topics ?? [])];

  function renderTopicRows() {
    list.replaceChildren();
    topics.forEach((topic) => {
      const row = document.createElement('div');
      row.className = 'house-guide-editor-topic-row-wrap';
      row.dataset.reorderRow = 'true';

      const handle = document.createElement('button');
      handle.type = 'button';
      handle.className = 'guide-editor-drag-handle';
      handle.dataset.reorderHandle = 'true';
      handle.setAttribute('aria-label', `Drag to reorder ${topic.title}`);
      handle.innerHTML = '<span aria-hidden="true">⠿</span>';

      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'house-guide-editor-topic-row';
      const name = document.createElement('span');
      name.className = 'house-guide-editor-topic-name';
      name.textContent = topic.title;
      const meta = document.createElement('span');
      meta.className = 'subtle';
      meta.textContent =
        topic.audience === 'owner' ? `${topic.subtitle} · Owner only` : topic.subtitle;
      open.append(name);
      if (topic.hasDraft) {
        const draftLabel = document.createElement('span');
        draftLabel.className = 'house-guide-editor-topic-draft';
        draftLabel.textContent = 'Draft';
        open.append(draftLabel);
      }
      open.append(meta);
      open.addEventListener('click', () => onOpen(topic.id));

      row.append(handle, open);
      list.append(row);
    });
  }

  renderTopicRows();

  wirePointerReorder(list, (fromIndex, toIndex) => {
    const previous = topics.map((topic) => topic.id);
    const nextIds = moveItem(previous, fromIndex, toIndex);
    topics = moveItem(topics, fromIndex, toIndex);

    void reorderHouseGuideTopicsInCategory(categoryId, nextIds).then((result) => {
      if (!result.ok) {
        topics = [...(getGuideCategory(categoryId)?.topics ?? [])];
        renderTopicRows();
        showToast(context.toast, result.message || 'Could not reorder topics.');
        onRevert();
      }
    });
  });

  const addSection = document.createElement('section');
  addSection.className = 'house-guide-editor-new-topic';
  const addHeading = document.createElement('h4');
  addHeading.className = 'house-guide-editor-blocks-title';
  addHeading.textContent = 'Add a new topic';

  let newTopicId = '';
  let newTitle = '';
  let newSubtitle = '';
  let newSummary = '';

  addSection.append(
    addHeading,
    createEditorField('Topic id', '', (value) => {
      newTopicId = value;
    }),
    createEditorField('Title', '', (value) => {
      newTitle = value;
    }),
    createEditorField('Subtitle', '', (value) => {
      newSubtitle = value;
    }),
    createEditorField('Summary', '', (value) => {
      newSummary = value;
    })
  );

  const idHint = document.createElement('p');
  idHint.className = 'subtle house-guide-editor-manual-hint';
  idHint.textContent = 'Use a short id with letters, numbers, and hyphens (e.g. bin-day). New topics start unpublished until you publish them.';
  addSection.append(idHint);

  const createButton = document.createElement('button');
  createButton.type = 'button';
  createButton.className = 'button-primary';
  createButton.textContent = 'Create topic';
  createButton.addEventListener('click', () => {
    createButton.disabled = true;
    void createNewHouseGuideTopic({
      id: newTopicId.trim(),
      categoryId,
      title: newTitle.trim(),
      subtitle: newSubtitle.trim(),
      summary: newSummary.trim(),
      audience: 'guest'
    }).then((result) => {
      createButton.disabled = false;
      if (!result.ok) {
        showToast(context.toast, result.message || 'Could not create topic.');
        return;
      }
      showToast(context.toast, 'Topic created.');
      onOpen(newTopicId.trim());
    });
  });
  addSection.append(createButton);

  panel.append(back, heading, reorderHint, list, addSection);
  return panel;
}

/**
 * @param {import('../../types/guideContent.js').GuideTopic} topic
 * @param {import('../../types/app.js').ShellContext} context
 * @param {Object} handlers
 */
function renderTopicEditor(topic, context, handlers) {
  if (!topic.audience) topic.audience = 'guest';

  const panel = document.createElement('section');
  panel.className = 'house-guide-editor-topic';

  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'guide-back-button';
  back.textContent = '← Topics';
  back.addEventListener('click', handlers.onBack);

  const heading = document.createElement('h3');
  heading.className = 'guide-section-heading';
  heading.textContent = topic.title;

  const metaForm = document.createElement('div');
  metaForm.className = 'house-guide-editor-meta';
  metaForm.append(
    createEditorSelect(
      'Who can see this topic',
      topic.audience === 'owner' ? 'owner' : 'guest',
      [
        { value: 'guest', label: 'House sitters and guests' },
        { value: 'owner', label: 'Owner notes only (hidden from sitters)' }
      ],
      (value) => {
        topic.audience = /** @type {'guest' | 'owner'} */ (value);
        handlers.onTopicChange(topic);
      }
    ),
    createEditorField('Title', topic.title, (value) => {
      topic.title = value;
      handlers.onTopicChange(topic);
    }),
    createEditorField('Subtitle', topic.subtitle, (value) => {
      topic.subtitle = value;
      handlers.onTopicChange(topic);
    }),
    createEditorField('Summary', topic.summary, (value) => {
      topic.summary = value;
      handlers.onTopicChange(topic);
    })
  );

  if (!topic.searchTerms) topic.searchTerms = [];
  if (!topic.applianceManualTerms) topic.applianceManualTerms = [];

  if (!topic.actions) topic.actions = [];

  const actionsHeading = createGuideEditorSectionHeading('Quick actions', 'quick-actions');
  const actionsHint = document.createElement('p');
  actionsHint.className = 'subtle house-guide-editor-manual-hint';
  actionsHint.textContent = 'Optional buttons at the bottom of a guide page (Alexa routines, links to other topics).';
  const actionsEditor = renderGuideActionsEditor(
    topic.actions,
    (next) => {
      topic.actions = next;
      handlers.onTopicChange(topic);
    },
    listGuideTopics().map((hit) => ({ id: hit.id, title: hit.title }))
  );

  const blocksHeading = createGuideEditorSectionHeading('Content blocks', 'blocks');

  const blocksHost = document.createElement('div');
  blocksHost.className = 'house-guide-editor-blocks';

  function renderBlocks() {
    const mediaIds = listCatalogMediaIds();
    const blockEditorOptions = {
      onUploadImage: (formData) => uploadHouseGuideMedia(formData),
      onRegisterMedia: (mediaId, alt, fileName) => registerGuideMediaUpload(mediaId, alt, fileName),
      onMediaRefresh: () => refreshGuideContent(fetch, { draft: true, force: true, silent: true }),
      onUploadStatus: (message) => showToast(context.toast, message),
      onAfterUpload: () => renderBlocks()
    };
    blocksHost.replaceChildren();
    topic.blocks.forEach((block, index) => {
      const card = renderGuideBlockEditor(
        block,
        (next) => {
          topic.blocks[index] = next;
          handlers.onTopicChange(topic);
        },
        mediaIds,
        blockEditorOptions
      );

      const actions = document.createElement('div');
      actions.className = 'guide-editor-block-actions';

      if (index > 0) {
        const up = document.createElement('button');
        up.type = 'button';
        up.className = 'button-secondary';
        up.textContent = 'Move up';
        up.addEventListener('click', () => {
          const blocks = [...topic.blocks];
          [blocks[index - 1], blocks[index]] = [blocks[index], blocks[index - 1]];
          topic.blocks = blocks;
          handlers.onTopicChange(topic);
          renderBlocks();
        });
        actions.append(up);
      }

      if (index < topic.blocks.length - 1) {
        const down = document.createElement('button');
        down.type = 'button';
        down.className = 'button-secondary';
        down.textContent = 'Move down';
        down.addEventListener('click', () => {
          const blocks = [...topic.blocks];
          [blocks[index + 1], blocks[index]] = [blocks[index], blocks[index + 1]];
          topic.blocks = blocks;
          handlers.onTopicChange(topic);
          renderBlocks();
        });
        actions.append(down);
      }

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'button-secondary button-danger';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => {
        topic.blocks = topic.blocks.filter((_, i) => i !== index);
        handlers.onTopicChange(topic);
        renderBlocks();
      });
      actions.append(remove);

      card.append(actions);
      blocksHost.append(card);
    });
  }

  renderBlocks();

  const addRow = document.createElement('div');
  addRow.className = 'house-guide-editor-add-block';
  const addSelect = document.createElement('select');
  addSelect.className = 'house-guide-editor-add-select';
  addSelect.setAttribute('aria-label', 'Add content block');
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Add a block…';
  addSelect.append(placeholder);
  for (const type of EDITABLE_BLOCK_TYPES) {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = GUIDE_BLOCK_TYPE_LABELS[type] ?? type;
    addSelect.append(option);
  }
  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.className = 'button-secondary';
  addButton.textContent = 'Add';
  addButton.addEventListener('click', () => {
    const type = /** @type {import('../../types/guideContent.js').GuideBlock['type']} */ (addSelect.value);
    if (!type) return;
    topic.blocks.push(createEmptyGuideBlock(type));
    handlers.onTopicChange(topic);
    addSelect.value = '';
    renderBlocks();
  });
  addRow.append(addSelect, addButton);

  const discovery = document.createElement('div');
  discovery.className = 'house-guide-editor-discovery';
  discovery.append(
    createGuideEditorSectionHeading('Search & links', 'search-keywords'),
    createCommaSeparatedField(
      'Search keywords',
      topic.searchTerms,
      (terms) => {
        topic.searchTerms = terms;
        handlers.onTopicChange(topic);
      },
      {
        placeholder: 'e.g. netflix, wifi, kettle, bbq, charger',
        hint: 'Comma-separated words sitters might search for. Title and body text are searched too.'
      }
    ),
    createCommaSeparatedField(
      'Appliance manual links',
      topic.applianceManualTerms ?? [],
      (terms) => {
        topic.applianceManualTerms = terms;
        handlers.onTopicChange(topic);
      },
      {
        placeholder: 'e.g. Washing machine, Weber BBQ',
        hint: 'Must match a published manual name exactly.'
      }
    )
  );

  const footer = document.createElement('div');
  footer.className = 'house-guide-editor-footer';

  const footerPrimary = document.createElement('div');
  footerPrimary.className = 'house-guide-editor-footer-primary';

  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.className = 'button-secondary';
  saveButton.textContent = 'Save draft';
  saveButton.addEventListener('click', () => {
    const actionsError = validateGuideActions(topic.actions);
    if (actionsError) {
      showToast(context.toast, actionsError);
      return;
    }
    saveButton.disabled = true;
    void saveHouseGuideTopic(topic.id, buildTopicPatch(topic)).then((result) => {
      saveButton.disabled = false;
      if (!result.ok) {
        showToast(context.toast, result.message || 'Could not save.');
        return;
      }
      handlers.onSaved();
    });
  });

  const publishButton = document.createElement('button');
  publishButton.type = 'button';
  publishButton.className = 'button-primary';
  publishButton.textContent = 'Publish topic';
  publishButton.addEventListener('click', () => {
    const actionsError = validateGuideActions(topic.actions);
    if (actionsError) {
      showToast(context.toast, actionsError);
      return;
    }
    publishButton.disabled = true;
    void saveHouseGuideTopic(topic.id, buildTopicPatch(topic))
      .then((saveResult) => {
        if (!saveResult.ok) return saveResult;
        return publishHouseGuideTopicContent(topic.id);
      })
      .then((result) => {
        publishButton.disabled = false;
        if (!result?.ok) {
          showToast(context.toast, result?.message || 'Could not publish.');
          return;
        }
        handlers.onPublished();
      });
  });

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'button-secondary button-danger house-guide-editor-footer-delete';
  deleteButton.textContent = 'Delete topic';
  deleteButton.addEventListener('click', () => {
    void showConfirmDialog({
      title: `Delete "${topic.title}"?`,
      message: 'This cannot be undone.',
      confirmLabel: 'Delete topic',
      cancelLabel: 'Cancel',
      danger: true
    }).then((confirmed) => {
      if (!confirmed) return;
      deleteButton.disabled = true;
      void removeHouseGuideTopic(topic.id).then((result) => {
        deleteButton.disabled = false;
        if (!result.ok) {
          showToast(context.toast, result.message || 'Could not delete topic.');
          return;
        }
        handlers.onDeleted();
      });
    });
  });

  footerPrimary.append(saveButton, publishButton);
  footer.append(footerPrimary, deleteButton);
  panel.append(
    back,
    heading,
    metaForm,
    actionsHeading,
    actionsHint,
    actionsEditor,
    blocksHeading,
    blocksHost,
    addRow,
    discovery,
    footer
  );
  return panel;
}

/**
 * @param {import('../../types/app.js').ShellContext} context
 */
function renderGuideIntroSettings(context) {
  const catalog = getActiveGuideCatalog();
  const details = document.createElement('details');
  details.className = 'house-guide-editor-intro-settings';

  const summary = document.createElement('summary');
  summary.textContent = 'Guide intro text';

  const form = document.createElement('div');
  form.className = 'house-guide-editor-intro-form';

  let homeSummaryTitle = catalog.homeSummaryTitle;
  let homeSummarySubtitle = catalog.homeSummarySubtitle;

  form.append(
    createEditorField('Home title', homeSummaryTitle, (value) => {
      homeSummaryTitle = value;
    }),
    createEditorField('Home subtitle', homeSummarySubtitle, (value) => {
      homeSummarySubtitle = value;
    })
  );

  const hint = document.createElement('p');
  hint.className = 'subtle';
  hint.textContent = 'Shown at the top of House Guide on the dashboard. Updates apply immediately after saving.';

  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.className = 'button-secondary';
  saveButton.textContent = 'Save intro';
  saveButton.addEventListener('click', () => {
    saveButton.disabled = true;
    void saveHouseGuideSettings({
      homeSummaryTitle: homeSummaryTitle.trim(),
      homeSummarySubtitle: homeSummarySubtitle.trim()
    }).then((result) => {
      saveButton.disabled = false;
      if (!result.ok) {
        showToast(context.toast, result.message || 'Could not save intro.');
        return;
      }
      showToast(context.toast, 'Guide intro saved.');
    });
  });

  form.append(hint, saveButton);
  details.append(summary, form);
  return details;
}

function buildTopicPatch(topic) {
  return {
    title: topic.title,
    subtitle: topic.subtitle,
    summary: topic.summary,
    audience: topic.audience === 'owner' ? 'owner' : 'guest',
    searchTerms: (topic.searchTerms ?? []).map((term) => term.trim()).filter(Boolean),
    applianceManualTerms: (topic.applianceManualTerms ?? []).map((term) => term.trim()).filter(Boolean),
    actions: normalizeGuideActionsForSave(topic.actions),
    blocks: topic.blocks
  };
}

/**
 * @param {string} label
 * @param {string} value
 * @param {(value: string) => void} onChange
 */
function createEditorField(label, value, onChange) {
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
 * @param {{ value: string, label: string }[]} options
 * @param {(value: string) => void} onChange
 */
function createEditorSelect(label, value, options, onChange) {
  const wrap = document.createElement('label');
  wrap.className = 'guide-editor-field';
  const span = document.createElement('span');
  span.textContent = label;
  const select = document.createElement('select');
  for (const option of options) {
    const node = document.createElement('option');
    node.value = option.value;
    node.textContent = option.label;
    node.selected = option.value === value;
    select.append(node);
  }
  select.addEventListener('change', () => onChange(select.value));
  wrap.append(span, select);
  return wrap;
}

export const houseGuideEditorApp = defineApp({
  id: 'house-guide-editor',
  title: 'Guide Editor',
  iconId: 'notebook',
  description: 'Edit House Guide content for guests and sitters',
  capabilities: ['documents', 'owner-private'],
  accent: '#f4b64f',
  profiles: ['owner'],
  mount(viewport, context) {
    mountHouseGuideEditorApp(viewport, context);
  }
});
