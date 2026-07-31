import {
  buildApplianceManualFileUrl,
  fetchApplianceManualPdfBlob
} from '../../api/applianceManualsApi.js';
import { withApiCredentials } from '../../api/accessFetch.js';

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

  const openTabLink = document.createElement('a');
  openTabLink.className = 'button-secondary appliance-manual-open-tab';
  openTabLink.textContent = 'Open PDF in new tab';
  openTabLink.target = '_blank';
  openTabLink.rel = 'noopener noreferrer';
  openTabLink.href = buildApplianceManualFileUrl(manual.id);

  actions.append(openTabLink);

  if (allowDownload) {
    const downloadLink = document.createElement('a');
    downloadLink.className = 'button-secondary appliance-manual-download';
    downloadLink.textContent = 'Download';
    downloadLink.href = buildApplianceManualFileUrl(manual.id);
    downloadLink.setAttribute('download', manual.originalFilename || 'manual.pdf');
    actions.append(downloadLink);
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

  let objectUrl = null;
  let disposed = false;

  void loadPdf();

  async function loadPdf() {
    const result = await fetchApplianceManualPdfBlob(manual.id);
    if (disposed) return;

    if (!result.ok || !result.blob) {
      status.textContent = 'This user guide could not be loaded here.';
      frameHost.replaceChildren(createFallbackPanel(manual));
      return;
    }

    objectUrl = URL.createObjectURL(result.blob);
    status.textContent = '';

    const iframe = document.createElement('iframe');
    iframe.className = 'appliance-manual-viewer-frame';
    iframe.title = `${manual.title} PDF`;
    iframe.src = objectUrl;

    iframe.addEventListener('error', () => {
      status.textContent = 'Your browser may not support embedded PDFs.';
      frameHost.replaceChildren(createFallbackPanel(manual));
    });

    frameHost.replaceChildren(iframe);

    openTabLink.addEventListener('click', (event) => {
      event.preventDefault();
      window.open(buildApplianceManualFileUrl(manual.id), '_blank', 'noopener,noreferrer');
    });
  }

  panel.cleanup = () => {
    disposed = true;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  };

  return panel;
}

/**
 * @param {import('../../api/applianceManualsApi.js').ApplianceManual} manual
 */
function createFallbackPanel(manual) {
  const fallback = document.createElement('div');
  fallback.className = 'appliance-manual-viewer-fallback';

  const copy = document.createElement('p');
  copy.textContent = 'Use the button below to open this user guide in a new tab.';

  const openButton = document.createElement('button');
  openButton.type = 'button';
  openButton.className = 'button-primary';
  openButton.textContent = 'Open PDF in new tab';
  openButton.addEventListener('click', async () => {
    const response = await fetch(
      buildApplianceManualFileUrl(manual.id),
      withApiCredentials({ headers: { Accept: 'application/pdf' }, cache: 'no-store' })
    );
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  });

  fallback.append(copy, openButton);
  return fallback;
}
