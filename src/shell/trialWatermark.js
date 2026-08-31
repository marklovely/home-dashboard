import { subscribeToUserMode } from '../auth/userMode.js';
import { fetchHubTrialing, shouldShowTrialWatermarkNow } from '../services/hubTrialStatus.js';

const ROOT_ID = 'trial-watermark';
const CAPTION_ID = 'trial-watermark-caption';
const TILE_COUNT = 36;
const WATERMARK_LABEL = 'Trial';
const CAPTION_TEXT = 'Set up before your sitter arrives';

function ensureWatermarkElements() {
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = ROOT_ID;
    root.className = 'trial-watermark';
    root.setAttribute('aria-hidden', 'true');
    const grid = document.createElement('div');
    grid.className = 'trial-watermark-grid';
    for (let i = 0; i < TILE_COUNT; i += 1) {
      const tile = document.createElement('span');
      tile.className = 'trial-watermark-item';
      tile.textContent = WATERMARK_LABEL;
      grid.append(tile);
    }
    root.append(grid);
    document.body.append(root);
  }

  let caption = document.getElementById(CAPTION_ID);
  if (!caption) {
    caption = document.createElement('p');
    caption.id = CAPTION_ID;
    caption.className = 'trial-watermark-caption';
    caption.textContent = CAPTION_TEXT;
    document.body.append(caption);
  }

  return { root, caption };
}

function syncTrialWatermarkVisibility() {
  const show = shouldShowTrialWatermarkNow();
  const { root, caption } = ensureWatermarkElements();
  root.hidden = !show;
  caption.hidden = !show;
  document.body.classList.toggle('hub-has-trial-watermark', show);
}

/**
 * Fully Kiosk-style repeating trial mark on the wall tablet and sitter home.
 */
export async function initTrialWatermark() {
  await fetchHubTrialing();
  syncTrialWatermarkVisibility();
  subscribeToUserMode(syncTrialWatermarkVisibility);
}
