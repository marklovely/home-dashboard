import { fetchApplianceManualPdfBlob } from '../../api/applianceManualsApi.js';
import { withAsyncButtonFeedback } from '../../lib/asyncButtonFeedback.js';
import {
  renderPdfBlobToContainer,
  triggerBlobDownload
} from './pdfCanvasViewer.js';

/**
 * @param {import('../../api/applianceManualsApi.js').ApplianceManual} manual
 * @param {() => void} onBack
 * @param {{ allowDownload?: boolean }} [options]
 */
export function renderApplianceManualViewer(manual, onBack, options = {}) {
  const allowDownload = options.allowDownload ?? false;
  const panel = document.createElement('section');
  panel.className = 'appliance-manual-viewer';
  panel.setAttribute('aria-label', `${manual.title} user guide`);

  const header = document.createElement('header');
  header.className = 'appliance-manual-viewer-header';

  const backButton = document.createElement('button');
  backButton.type = 'button';
  backButton.className = 'guide-back-button';
  backButton.textContent = 'Back';

  const titles = document.createElement('div');
  titles.className = 'appliance-manual-viewer-titles';
  const title = document.createElement('h2');
  title.className = 'appliance-manual-viewer-title';
  title.textContent = manual.title;
  const appliance = document.createElement('p');
  appliance.className = 'appliance-manual-viewer-appliance subtle';
  appliance.textContent = manual.applianceName;
  titles.append(title, appliance);

  const actions = document.createElement('div');
  actions.className = 'appliance-manual-viewer-actions';

  /** @type {HTMLButtonElement | null} */
  let downloadButton = null;
  if (allowDownload) {
    downloadButton = document.createElement('button');
    downloadButton.type = 'button';
    downloadButton.className = 'button-secondary appliance-manual-download';
    downloadButton.textContent = 'Download';
    downloadButton.disabled = true;
    downloadButton.addEventListener('click', () => {
      if (!pdfBlob) return;
      triggerBlobDownload(pdfBlob, manual.originalFilename || 'manual.pdf');
    });
    actions.append(downloadButton);
  }

  header.append(backButton, titles, actions);

  const status = document.createElement('p');
  status.className = 'appliance-manual-viewer-status subtle';
  status.setAttribute('aria-live', 'polite');
  status.textContent = 'Loading user guide…';

  const frameHost = document.createElement('div');
  frameHost.className = 'appliance-manual-viewer-frame-host';

  panel.append(header, status, frameHost);
  backButton.addEventListener('click', onBack);

  /** @type {Blob | null} */
  let pdfBlob = null;
  /** @type {(() => void) | null} */
  let disposePdfRender = null;
  let disposed = false;

  void loadPdf();

  async function loadPdf() {
    status.textContent = 'Loading user guide…';
    disposePdfRender?.();
    disposePdfRender = null;
    frameHost.replaceChildren();

    const result = await fetchApplianceManualPdfBlob(manual.id);
    if (disposed) return;

    if (!result.ok || !result.blob) {
      status.textContent = 'This user guide could not be loaded. Check your connection and try again.';
      frameHost.replaceChildren(createRetryPanel(loadPdf));
      return;
    }

    pdfBlob = result.blob;

    if (downloadButton) {
      downloadButton.disabled = false;
    }

    try {
      disposePdfRender = await renderPdfBlobToContainer(pdfBlob, frameHost, {
        onStatus: (message) => {
          status.textContent = message;
        }
      });
      if (disposed) {
        disposePdfRender?.();
        return;
      }
      status.textContent = '';
    } catch (error) {
      console.error('PDF render failed:', error);
      status.textContent = 'This user guide could not be displayed on this device.';
      frameHost.replaceChildren(createRetryPanel(loadPdf));
    }
  }

  panel.cleanup = () => {
    disposed = true;
    disposePdfRender?.();
  };

  return panel;
}

/**
 * @param {() => void | Promise<void>} onRetry
 */
function createRetryPanel(onRetry) {
  const fallback = document.createElement('div');
  fallback.className = 'appliance-manual-viewer-fallback';

  const copy = document.createElement('p');
  copy.textContent = 'Tap below to try loading this user guide again.';

  const retryButton = document.createElement('button');
  retryButton.type = 'button';
  retryButton.className = 'button-primary';
  retryButton.textContent = 'Try again';
  retryButton.addEventListener('click', () => {
    void withAsyncButtonFeedback(retryButton, 'Retrying…', () => Promise.resolve(onRetry()));
  });

  fallback.append(copy, retryButton);
  return fallback;
}
