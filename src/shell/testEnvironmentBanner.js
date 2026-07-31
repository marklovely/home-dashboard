import { ensureHubEnvironment, isTestHubEnvironment } from '../auth/hubEnvironment.js';

const BANNER_ID = 'hub-environment-banner';

/**
 * Shows a sticky banner when this build targets the isolated test stack.
 */
export async function initTestEnvironmentBanner() {
  await ensureHubEnvironment();
  if (!isTestHubEnvironment()) return;

  if (document.getElementById(BANNER_ID)) return;

  const banner = document.createElement('div');
  banner.id = BANNER_ID;
  banner.className = 'hub-environment-banner';
  banner.setAttribute('role', 'status');
  banner.textContent = 'TEST ENVIRONMENT — changes here do not affect production';

  document.body.prepend(banner);
  document.body.classList.add('hub-has-environment-banner');
}
