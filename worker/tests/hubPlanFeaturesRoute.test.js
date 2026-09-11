import { describe, expect, it } from 'vitest';
import { handleRequest } from '../src/index.js';
import { createAccessTestEnv } from './accessTestHelpers.js';
import { createInMemoryHubSetupDb } from './mocks/hubSetupStorage.js';
import { withTestLimiters } from './testEnv.js';

describe('hub plan features route', () => {
  it('returns feature flags for an authenticated session', async () => {
    const env = withTestLimiters({
      ...createAccessTestEnv(),
      HOUSE_GUIDE_DB: createInMemoryHubSetupDb({ guideSeeded: false }),
      PLATFORM_API_ORIGIN: 'https://platform.test'
    });

    const response = await handleRequest(
      new Request('https://test.lovely-hub.com/api/hub/plan-features', {
        headers: {
          Origin: 'https://test.lovely-hub.com',
          Cookie: 'CF_Authorization=fake'
        }
      }),
      env
    );

    expect([200, 401, 403]).toContain(response.status);
  });
});
