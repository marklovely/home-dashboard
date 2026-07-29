/**
 * @param {{ mediaId: string, expectedFilename?: string }} details
 * @returns {HTMLElement}
 */
export function renderGuideMediaFallback(details) {
  const figure = document.createElement('figure');
  figure.className = 'guide-hero-image guide-hero-image-unresolved';
  figure.setAttribute('role', 'img');
  figure.setAttribute(
    'aria-label',
    `Image unavailable: ${details.mediaId}`
  );

  const message = document.createElement('p');
  message.className = 'guide-media-fallback';
  message.textContent = `Image unavailable: ${details.mediaId}`;
  figure.append(message);

  if (details.expectedFilename && import.meta.env.DEV) {
    const hint = document.createElement('p');
    hint.className = 'guide-media-fallback-hint';
    hint.textContent = `Expected file: ${details.expectedFilename}`;
    figure.append(hint);
  }

  return figure;
}

/**
 * @param {HTMLImageElement} sourceImage
 */
export function openGuideImageLightbox(sourceImage) {
  const overlay = document.createElement('div');
  overlay.className = 'guide-image-lightbox';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', sourceImage.alt || 'Enlarged photo');

  const img = document.createElement('img');
  img.src = sourceImage.currentSrc || sourceImage.src;
  img.alt = sourceImage.alt;
  img.className = 'guide-image-lightbox-img';

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'guide-image-lightbox-close';
  close.textContent = 'Close';
  close.setAttribute('aria-label', 'Close enlarged image');

  const dismiss = () => overlay.remove();
  close.addEventListener('click', dismiss);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) dismiss();
  });
  overlay.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') dismiss();
  });

  overlay.append(img, close);
  document.body.append(overlay);
  close.focus();
}

/**
 * @param {HTMLImageElement} img
 */
export function wireGuideImageLightbox(img) {
  img.classList.add('guide-media-tappable');
  img.tabIndex = 0;
  img.setAttribute('role', 'button');
  img.setAttribute('aria-label', `${img.alt}. Tap to enlarge.`);

  const open = () => openGuideImageLightbox(img);
  img.addEventListener('click', open);
  img.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      open();
    }
  });
}
