import { ensureHubEnvironment, isVanillaHubEnvironment, getHubEnvironmentSync } from '../auth/hubEnvironment.js';

const BANNER_ID = 'hub-environment-banner';

/** @type {Record<string, string>} */
const BANNER_LABELS = {
  demo: 'PUBLIC DEMO — sample data resets overnight · owner explore PIN 1234',
  test: 'TEST ENVIRONMENT — changes here do not affect production',
  staging: 'STAGING — changes here do not affect production',
  sandbox: 'SANDBOX — isolated trial environment'
};

/**
 * Shows a sticky banner when this build targets a vanilla (non-production) hub stack.
 */
export async function initTestEnvironmentBanner() {
  await ensureHubEnvironment();
  if (!isVanillaHubEnvironment()) return;

  const envId = getHubEnvironmentSync();
  const label = BANNER_LABELS[envId] ?? `${envId.toUpperCase()} ENVIRONMENT`;

  if (document.getElementById(BANNER_ID)) return;

  const banner = document.createElement('div');
  banner.id = BANNER_ID;
  banner.className = 'hub-environment-banner';
  banner.setAttribute('role', 'status');
  banner.textContent = label;

  document.body.prepend(banner);
  document.body.classList.add('hub-has-environment-banner');
}
