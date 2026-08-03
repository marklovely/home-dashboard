import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/** @typedef {() => void} PdfCanvasCleanup */

/**
 * Render a PDF blob into scrollable canvas pages (kiosk-safe; no new tab/window).
 *
 * @param {Blob} blob
 * @param {HTMLElement} host
 * @param {{ onStatus?: (message: string) => void, scale?: number }} [options]
 * @returns {Promise<PdfCanvasCleanup>}
 */
export async function renderPdfBlobToContainer(blob, host, options = {}) {
  const scale = options.scale ?? 1.35;
  const data = await blob.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;

  host.replaceChildren();
  host.classList.add('appliance-manual-pdf-pages');

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    if (pdf.numPages > 1) {
      options.onStatus?.(`Loading page ${pageNum} of ${pdf.numPages}…`);
    }
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.className = 'appliance-manual-pdf-page';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `Page ${pageNum} of ${pdf.numPages}`);

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not render PDF');
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: context, viewport, canvas }).promise;
    host.append(canvas);
  }

  options.onStatus?.('');

  return () => {
    void loadingTask.destroy();
    host.replaceChildren();
    host.classList.remove('appliance-manual-pdf-pages');
  };
}

/**
 * @param {Blob} blob
 * @param {string} filename
 */
export function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
