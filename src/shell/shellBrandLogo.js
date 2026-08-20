/**
 * Shell header logo loaded from R2 via /api/branding/logo.
 */

const LOGO_PATH = '/api/branding/logo';
const HOME_TAP_MS = 450;

/**
 * @param {{ onNavigateHome?: () => void, onRouteChange?: (isHome: boolean) => void }} [options]
 */
export function initShellBrandLogo(options = {}) {
  const button = document.querySelector('#shell-logo-button');
  const logo = document.querySelector('#shell-logo');
  const titleBlock = document.querySelector('.shell-chrome-title-block');
  const eyebrow = document.querySelector('#shell-eyebrow');
  if (!(button instanceof HTMLButtonElement) || !(logo instanceof HTMLImageElement) || !titleBlock) {
    return;
  }

  /** @type {number | null} */
  let pointerDownAt = null;

  const showTextFallback = () => {
    titleBlock.classList.remove('has-shell-logo');
    logo.hidden = true;
    if (eyebrow instanceof HTMLElement) eyebrow.hidden = false;
  };

  const showLogo = () => {
    logo.hidden = false;
    titleBlock.classList.add('has-shell-logo');
    if (eyebrow instanceof HTMLElement) eyebrow.hidden = true;
  };

  if (logo.complete) {
    if (logo.naturalWidth > 0) showLogo();
    else showTextFallback();
  }

  logo.addEventListener('load', showLogo);
  logo.addEventListener('error', showTextFallback);

  if (logo.getAttribute('src') !== LOGO_PATH) {
    logo.src = LOGO_PATH;
  }

  button.addEventListener('pointerdown', () => {
    pointerDownAt = Date.now();
  });

  button.addEventListener('click', (event) => {
    const heldMs = pointerDownAt === null ? 0 : Date.now() - pointerDownAt;
    pointerDownAt = null;
    if (heldMs > HOME_TAP_MS) {
      event.preventDefault();
      return;
    }
    options.onNavigateHome?.();
  });

  options.onRouteChange?.(document.body.classList.contains('shell-route-home'));
}

/**
 * @param {boolean} isHome
 */
export function syncShellBrandLogoRoute(isHome) {
  const button = document.querySelector('#shell-logo-button');
  if (!(button instanceof HTMLButtonElement)) return;
  button.setAttribute('aria-current', isHome ? 'page' : 'false');
}
