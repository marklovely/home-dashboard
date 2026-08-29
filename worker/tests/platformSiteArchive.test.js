import { describe, expect, it } from 'vitest';
import { handleRequest } from '../src/index.js';
import { createAccessTestEnv } from './accessTestHelpers.js';
import { createInMemoryHubSetupDb } from './mocks/hubSetupStorage.js';
import { withTestLimiters } from './testEnv.js';

const archiveSecret = 'platform-archive-test-secret';

function archiveEnv(overrides = {}) {
  return withTestLimiters({
    ...createAccessTestEnv(),
    PLATFORM_SITE_ARCHIVE_SECRET: archiveSecret,
    HOUSE_GUIDE_DB: createInMemoryHubSetupDb({ guideSeeded: true }),
    ...overrides
  });
}

describe('platform site archive', () => {
  it('returns full backup JSON when archive secret matches', async () => {
    const response = await handleRequest(
      new Request('https://worker.test/api/platform/site-archive', {
        headers: { 'X-Platform-Site-Archive-Secret': archiveSecret }
      }),
      archiveEnv()
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.backupScope).toBe('full');
    expect(body.archiveSource).toBe('platform-pre-deprovision');
    expect(body.archivedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('returns 403 when archive secret is missing or wrong', async () => {
    const missing = await handleRequest(
      new Request('https://worker.test/api/platform/site-archive'),
      archiveEnv()
    );
    expect(missing.status).toBe(403);

    const wrong = await handleRequest(
      new Request('https://worker.test/api/platform/site-archive', {
        headers: { 'X-Platform-Site-Archive-Secret': 'wrong-secret' }
      }),
      archiveEnv()
    );
    expect(wrong.status).toBe(403);
  });

  it('rejects non-GET methods', async () => {
    const response = await handleRequest(
      new Request('https://worker.test/api/platform/site-archive', {
        method: 'POST',
        headers: { 'X-Platform-Site-Archive-Secret': archiveSecret }
      }),
      archiveEnv()
    );
    expect(response.status).toBe(405);
  });
});
