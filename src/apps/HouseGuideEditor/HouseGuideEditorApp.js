import { defineApp } from '../../components/App/defineApp.js';
import { getDeviceSessionStatus } from '../../auth/deviceSessionStore.js';
import { isOwnerUserMode } from '../../auth/userMode.js';
import { showToast } from '../../js/modules/toast.js';
import {
  getGuideCategory,
  getGuideTopic,
  listGuideCategories
} from '../../services/guideService.js';
import {
  canManageHouseGuideContent,
  getActiveGuideCatalog,
  getGuideContentState,
  importBundledGuideToCloud,
  publishAllHouseGuideChanges,
  publishHouseGuideTopicContent,
  refreshGuideContent,
  saveHouseGuideSettings,
  saveHouseGuideTopic,
  subscribeToGuideContent
} from '../../services/guideContentService.js';
import { uploadHouseGuideMedia } from '../../api/houseGuideApi.js';
import { listCatalogMediaIds } from '../../content/houseguide/guideMedia.js';
import {
  createEmptyGuideBlock,
  EDITABLE_BLOCK_TYPES,
  GUIDE_BLOCK_TYPE_LABELS,
  renderGuideBlockEditor,
  renderStringList
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

  const unsubscribe = subscribeToGuideContent(() => {
    renderEditorPage(page, context);
  });
  void refreshGuideContent(fetch, { draft: true, force: true });
  renderEditorPage(page, context);

  page.cleanup = () => unsubscribe();
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

  if (!isOwnerUserMode() || !canManageHouseGuideContent()) {
    page.append(createStatus('House Guide editing is available in Owner Mode only.'));
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
  copy.textContent =
    'Copy your current guide into the cloud so you can edit it here without changing code. House sitters and guests will see updates after you publish.';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button-primary';
  button.textContent = 'Copy current guide to cloud';
  button.addEventListener('click', () => {
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

  panel.append(title, copy, button);
  return panel;
}

/** @param {import('../../types/app.js').ShellContext} context */
function createEditorShell(context) {
  const shell = document.createElement('div');
  shell.className = 'house-guide-editor-shell';

  /** @type {'categories' | 'topics' | 'topic'} */
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

  toolbar.append(draftBadge, publishAllButton);
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
        renderTopicPicker(activeCategoryId, () => {
          view = 'categories';
          activeCategoryId = null;
          renderMain();
        }, (topicId) => {
          activeTopicId = topicId;
          const topic = getGuideTopic(topicId);
          draftTopic = topic ? structuredClone(topic) : null;
          view = 'topic';
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
          }
        })
      );
    }
  }

  const unsubscribe = subscribeToGuideContent(() => {
    if (activeTopicId) {
      const refreshed = getGuideTopic(activeTopicId);
      if (refreshed) draftTopic = structuredClone(refreshed);
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
    button.className = 'guide-category-card';
    button.style.setProperty('--accent', category.accent);
    button.innerHTML = `<span class="guide-category-title">${category.title}</span><span class="guide-category-subtitle">${category.topics.length} topics</span>`;
    button.addEventListener('click', () => onOpen(category.id));
    grid.append(button);
  }

  panel.append(heading, grid);
  return panel;
}

/**
 * @param {string} categoryId
 * @param {() => void} onBack
 * @param {(topicId: string) => void} onOpen
 */
function renderTopicPicker(categoryId, onBack, onOpen) {
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

  const list = document.createElement('div');
  list.className = 'house-guide-editor-topic-list';

  for (const topic of category?.topics ?? []) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'house-guide-editor-topic-row';
    const name = document.createElement('span');
    name.className = 'house-guide-editor-topic-name';
    name.textContent = topic.title;
    const meta = document.createElement('span');
    meta.className = 'subtle';
    meta.textContent =
      topic.audience === 'owner' ? `${topic.subtitle} · Owner only` : topic.subtitle;
    row.append(name);
    if (topic.hasDraft) {
      const draftLabel = document.createElement('span');
      draftLabel.className = 'house-guide-editor-topic-draft';
      draftLabel.textContent = 'Draft';
      row.append(draftLabel);
    }
    row.append(meta);
    row.addEventListener('click', () => onOpen(topic.id));
    list.append(row);
  }

  panel.append(back, heading, list);
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

  const metaAdvanced = document.createElement('div');
  metaAdvanced.className = 'house-guide-editor-meta-advanced';
  metaAdvanced.append(
    renderStringList(
      'Search keywords',
      topic.searchTerms,
      (terms) => {
        topic.searchTerms = terms;
        handlers.onTopicChange(topic);
      },
      'Add keyword',
      'Keyword'
    ),
    renderStringList(
      'Appliance manual links',
      topic.applianceManualTerms ?? [],
      (terms) => {
        topic.applianceManualTerms = terms;
        handlers.onTopicChange(topic);
      },
      'Add appliance name',
      'Appliance name'
    )
  );
  const manualHint = document.createElement('p');
  manualHint.className = 'subtle house-guide-editor-manual-hint';
  manualHint.textContent =
    'Appliance names here link to matching manuals in House Guide (must match a published manual name).';
  metaAdvanced.append(manualHint);

  const blocksHeading = document.createElement('h4');
  blocksHeading.className = 'house-guide-editor-blocks-title';
  blocksHeading.textContent = 'Content blocks';

  const blocksHost = document.createElement('div');
  blocksHost.className = 'house-guide-editor-blocks';

  function renderBlocks() {
    const mediaIds = listCatalogMediaIds();
    const blockEditorOptions = {
      onUploadImage: (formData) => uploadHouseGuideMedia(formData),
      onMediaRefresh: () => refreshGuideContent(fetch, { draft: true, force: true }),
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

  const footer = document.createElement('div');
  footer.className = 'house-guide-editor-footer';

  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.className = 'button-secondary';
  saveButton.textContent = 'Save draft';
  saveButton.addEventListener('click', () => {
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

  footer.append(saveButton, publishButton);
  panel.append(back, heading, metaForm, metaAdvanced, blocksHeading, blocksHost, addRow, footer);
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
