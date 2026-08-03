import { isTestHubEnvironment } from '../auth/hubEnvironment.js';

/** Apps hidden in test until site-specific setup exists. */
const TEST_HIDDEN_APP_IDS = ['controls'];

/**
 * @param {import('../types/app.js').App} app
 */
export function isAppEnabledForEnvironment(app) {
  if (!isTestHubEnvironment()) return true;
  return !TEST_HIDDEN_APP_IDS.includes(app.id);
}

/**
 * @param {import('../types/app.js').App[]} apps
 */
export function filterAppsForEnvironment(apps) {
  return apps.filter(isAppEnabledForEnvironment);
}

export function isControlsConfigured(config) {
  return (config.buttons?.length ?? 0) > 0;
}
