import { describe, expect, it } from 'vitest';
import { handleRequest } from '../src/index.js';
import { createAccessTestEnv } from './accessTestHelpers.js';
import { createInMemoryHubSetupDb } from './mocks/hubSetupStorage.js';
import { withTestLimiters } from './testEnv.js';
import { SITE_BACKUP_FORMAT_VERSION } from '../src/lib/siteBackupPayload.js';

const archiveSecret = 'platform-archive-test-secret';

function restoreEnv(overrides = {}) {
  return withTestLimiters({
    ...createAccessTestEnv(),
    PLATFORM_SITE_ARCHIVE_SECRET: archiveSecret,
    HOUSE_GUIDE_DB: createInMemoryHubSetupDb({ guideSeeded: false }),
    ...overrides
  });
}

describe('platform site restore', () => {
  it('restores backup JSON when archive secret matches', async () => {
    const response = await handleRequest(
      new Request('https://worker.test/api/platform/site-restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Platform-Site-Archive-Secret': archiveSecret
        },
        body: JSON.stringify({
          formatVersion: SITE_BACKUP_FORMAT_VERSION,
          backupScope: 'full',
          siteProfile: { hubName: 'Restored Hub', onboardingComplete: true },
          guide: { catalog: { version: 2, categories: [], media: {} } }
        })
      }),
      restoreEnv()
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.restoreSource).toBe('platform-post-provision');
  });

  it('returns 403 when archive secret is missing or wrong', async () => {
    const missing = await handleRequest(
      new Request('https://worker.test/api/platform/site-restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formatVersion: SITE_BACKUP_FORMAT_VERSION })
      }),
      restoreEnv()
    );
    expect(missing.status).toBe(403);

    const wrong = await handleRequest(
      new Request('https://worker.test/api/platform/site-restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Platform-Site-Archive-Secret': 'wrong-secret'
        },
        body: JSON.stringify({ formatVersion: SITE_BACKUP_FORMAT_VERSION })
      }),
      restoreEnv()
    );
    expect(wrong.status).toBe(403);
  });

  it('rejects non-POST methods', async () => {
    const response = await handleRequest(
      new Request('https://worker.test/api/platform/site-restore', {
        headers: { 'X-Platform-Site-Archive-Secret': archiveSecret }
      }),
      restoreEnv()
    );
    expect(response.status).toBe(405);
  });
});
