import { createTestOwnerAuthLimiter } from './testOwnerAuthLimiter.js';
import { createInMemoryControlLimiter } from './testControlActionLimiter.js';

/**
 * @param {Record<string, string | undefined>} env
 */
export function withTestLimiters(env) {
  return {
    ...env,
    OWNER_AUTH_LIMITER: createTestOwnerAuthLimiter(),
    CONTROL_ACTION_LIMITER: createInMemoryControlLimiter()
  };
}
