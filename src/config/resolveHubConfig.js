import { isTestHubEnvironment } from '../auth/hubEnvironment.js';
import { CONFIG as productionConfig } from '../config.js';
import { VANILLA_HUB_CONFIG } from './vanillaHubConfig.js';

/**
 * Production uses `src/config.js` (site-specific Virtual Buttons).
 * Test uses an empty vanilla config until Virtual Buttons are configured for that stack.
 */
export function getHubConfig() {
  return isTestHubEnvironment() ? VANILLA_HUB_CONFIG : productionConfig;
}

/** Resolved at module load from build env or hostname. */
export const CONFIG = getHubConfig();
