import { getBinCollectionAlert } from './binCollectionService.js';
import { subscribeToBinAlertDismissal } from './binAlertDismissalService.js';
import { createBinAlertBanner } from '../apps/Home/createBinAlertBanner.js';

/**
 * Keeps a bin alert banner in sync with schedule, dismissal, and time window.
 *
 * @param {HTMLElement} host
 * @param {(appId: string) => void} navigate
 * @param {{ houseSitter?: boolean, className?: string, onDismiss?: () => void }} [options]
 * @returns {{ sync: () => void, cleanup: () => void }}
 */
export function mountBinAlertBannerHost(host, navigate, options = {}) {
  /** @type {(() => void) | null} */
  let unsubscribe = null;

  function sync() {
    const alert = getBinCollectionAlert(new Date(), { houseSitter: options.houseSitter ?? false });
    if (!alert) {
      host.replaceChildren();
      host.hidden = true;
      return;
    }

    const banner = createBinAlertBanner(alert, navigate, () => {
      sync();
      options.onDismiss?.();
    });
    if (options.className) {
      banner.classList.add(options.className);
    }
    host.replaceChildren(banner);
    host.hidden = false;
  }

  unsubscribe = subscribeToBinAlertDismissal(sync);
  sync();

  return {
    sync,
    cleanup: () => {
      unsubscribe?.();
      unsubscribe = null;
      host.replaceChildren();
      host.hidden = true;
    }
  };
}

/**
 * @param {HTMLElement} host
 */
export function clearBinAlertBannerHost(host) {
  host.replaceChildren();
  host.hidden = true;
}
