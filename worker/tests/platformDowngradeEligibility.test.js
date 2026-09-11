import { describe, expect, it } from 'vitest';
import { handlePlatformDowngradeEligibility } from '../src/routes/platformDowngradeEligibility.js';

describe('platform downgrade eligibility route', () => {
  it('rejects requests without the platform archive secret', async () => {
    const response = await handlePlatformDowngradeEligibility(
      new Request('https://worker.test/api/platform/downgrade-eligibility'),
      { PLATFORM_SITE_ARCHIVE_SECRET: 'secret-value' },
      'corr-1'
    );
    expect(response.status).toBe(403);
  });

  it('returns hub usage for authorized platform requests', async () => {
    const db = {
      prepare(sql) {
        return {
          bind() {
            return this;
          },
          async first() {
            if (sql.includes('FROM house_guides ORDER BY')) {
              return null;
            }
            if (sql.includes('FROM house_guides')) {
              return { n: 1 };
            }
            if (sql.includes('FROM sitter_stays')) {
              return { n: 0 };
            }
            if (sql.includes('FROM guide_categories')) {
              return { count: 1 };
            }
            if (sql.includes('MAX(sort_order)')) {
              return { max_order: 0 };
            }
            return null;
          },
          async all() {
            if (sql.includes('FROM house_guides ORDER BY')) {
              return { results: [{ id: 'default', title: 'House guide' }] };
            }
            return { results: [] };
          },
          async run() {
            return { success: true };
          },
          batch() {
            return Promise.resolve([]);
          }
        };
      }
    };

    const response = await handlePlatformDowngradeEligibility(
      new Request('https://worker.test/api/platform/downgrade-eligibility', {
        headers: { 'X-Platform-Site-Archive-Secret': 'secret-value' }
      }),
      { PLATFORM_SITE_ARCHIVE_SECRET: 'secret-value', HOUSE_GUIDE_DB: db },
      'corr-2'
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.usage).toMatchObject({
      guides: 1,
      stays: 0,
      categoriesByGuide: [{ guideId: 'default', guideTitle: 'House guide', count: 1 }]
    });
  });
});
