import { showToast } from '../../js/modules/toast.js';
import { renderGuideTopicPage } from '../../widgets/HouseGuide/guidePageRenderer.js';

/**
 * @param {import('../../types/app.js').ShellContext} context
 * @param {import('../../types/guideContent.js').GuideTopic} topic
 * @param {{ hasUnsavedEdits?: boolean }} [options]
 */
export function openGuideEditorTopicPreview(context, topic, options = {}) {
  const draftTopic = structuredClone(topic);
  const hasUnsavedEdits = options.hasUnsavedEdits ?? false;

  const overlay = document.createElement('div');
  overlay.className = 'guide-editor-preview-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'guide-editor-preview-title');

  const panel = document.createElement('div');
  panel.className = 'guide-editor-preview-panel';

  const header = document.createElement('header');
  header.className = 'guide-editor-preview-header';

  const title = document.createElement('h2');
  title.id = 'guide-editor-preview-title';
  title.className = 'guide-editor-preview-title';
  title.textContent = 'Preview';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'button-secondary guide-editor-preview-close';
  closeButton.textContent = 'Back to editor';

  header.append(title, closeButton);

  const banner = document.createElement('p');
  banner.className = 'guide-editor-preview-banner subtle';
  banner.textContent = hasUnsavedEdits
    ? 'Showing your current edits, including unsaved changes. Guests only see the last published version.'
    : 'Showing your saved draft. Guests only see the last published version until you publish.';

  const scrollHost = document.createElement('div');
  scrollHost.className = 'guide-editor-preview-scroll house-guide-app';

  /** @type {(() => void) | null} */
  let disposeArticle = null;

  function close() {
    disposeArticle?.();
    disposeArticle = null;
    overlay.remove();
    document.body.classList.remove('guide-editor-preview-open');
    document.removeEventListener('keydown', onKeyDown);
  }

  /**
   * @param {KeyboardEvent} event
   */
  function onKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }

  const article = renderGuideTopicPage(
    draftTopic,
    context,
    close,
    () => {
      showToast(context.toast, 'Open House Guide as a sitter to browse other topics.');
    }
  );
  disposeArticle = article.cleanup ?? null;

  const topicBack = article.querySelector('.guide-back-button');
  if (topicBack instanceof HTMLButtonElement) {
    topicBack.textContent = '← Back to editor';
  }

  scrollHost.append(article);
  panel.append(header, banner, scrollHost);
  overlay.append(panel);
  document.body.append(overlay);
  document.body.classList.add('guide-editor-preview-open');
  document.addEventListener('keydown', onKeyDown);

  closeButton.addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });

  closeButton.focus();
}
