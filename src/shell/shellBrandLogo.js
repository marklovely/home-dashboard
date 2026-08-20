/**
 * Shell header logo loaded from R2 via /api/branding/logo.
 */

const LOGO_PATH = '/api/branding/logo';

export function initShellBrandLogo() {
  const logo = document.querySelector('#shell-logo');
  const titleBlock = document.querySelector('.shell-chrome-title-block');
  if (!(logo instanceof HTMLImageElement) || !titleBlock) return;

  const showTextFallback = () => {
    titleBlock.classList.remove('has-shell-logo');
    logo.hidden = true;
  };

  const showLogo = () => {
    logo.hidden = false;
    titleBlock.classList.add('has-shell-logo');
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
}
