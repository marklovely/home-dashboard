import { isDemoHubEnvironment, isTestHubEnvironment } from '../auth/hubEnvironment.js';

/** Apps hidden on vanilla hubs until site-specific setup exists. */
const VANILLA_HIDDEN_APP_IDS = ['controls', 'scooter'];

/** Apps excluded from the public demo (paid add-ons or not applicable). */
const DEMO_HIDDEN_APP_IDS = ['controls', 'cameras'];

/**
 * @param {import('../types/app.js').App} app
 */
export function isAppEnabledForEnvironment(app) {
  if (isDemoHubEnvironment()) {
    return !DEMO_HIDDEN_APP_IDS.includes(app.id);
  }
  if (!isTestHubEnvironment()) return true;
  return !VANILLA_HIDDEN_APP_IDS.includes(app.id);
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
