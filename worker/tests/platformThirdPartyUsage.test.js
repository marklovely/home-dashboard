import { describe, expect, it } from 'vitest';
import { handlePlatformThirdPartyUsage } from '../src/routes/platformThirdPartyUsage.js';

describe('platformThirdPartyUsage route', () => {
  it('rejects requests without archive secret', async () => {
    const response = await handlePlatformThirdPartyUsage(
      new Request('https://worker.test/api/platform/third-party-usage'),
      { PLATFORM_SITE_ARCHIVE_SECRET: 'secret-value', HOUSE_GUIDE_DB: createDb() },
      'corr-1'
    );
    expect(response.status).toBe(403);
  });

  it('returns stored usage for authorized requests', async () => {
    const db = createDb({
      third_party_api_usage: JSON.stringify({
        osPlaces: { lifetime: 3, month: '2026-09', monthCalls: 3 }
      })
    });
    const response = await handlePlatformThirdPartyUsage(
      new Request('https://worker.test/api/platform/third-party-usage', {
        headers: { 'X-Platform-Site-Archive-Secret': 'secret-value' }
      }),
      { PLATFORM_SITE_ARCHIVE_SECRET: 'secret-value', HOUSE_GUIDE_DB: db },
      'corr-2'
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.usage.osPlaces.lifetime).toBe(3);
  });
});

/**
 * @param {Record<string, string>} [rows]
 */
function createDb(rows = {}) {
  return {
    prepare(query) {
      const isSelect = query.includes('SELECT value FROM house_settings');
      return {
        bind(key) {
          return {
            async first() {
              if (!isSelect) return null;
              return rows[key] ? { value: rows[key] } : null;
            },
            async run() {
              return { success: true };
            }
          };
        }
      };
    }
  };
}
