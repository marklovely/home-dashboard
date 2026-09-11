import { describe, expect, it, vi } from 'vitest';
import {
  fetchHubFreeDowngradeUsage,
  resolveHubWorkerApiOrigin
} from '../functions/api/platform/platformHubDowngradeEligibility.js';

describe('platformHubDowngradeEligibility', () => {
  it('resolves worker origin from manifest contract', () => {
    expect(
      resolveHubWorkerApiOrigin(
        {
          sites: {
            'test-free': {
              contract: {
                worker_api_origin: 'https://lovely-home-hub-api-test-free.example.workers.dev'
              }
            }
          }
        },
        'test-free'
      )
    ).toBe('https://lovely-home-hub-api-test-free.example.workers.dev');
  });

  it('uses platform health auth and archive secret when fetching hub usage', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        usage: { guides: 1, stays: 0, categoriesByGuide: [{ guideId: 'default', count: 1 }] }
      })
    );

    const result = await fetchHubFreeDowngradeUsage(
      {
        PLATFORM_SITE_ARCHIVE_SECRET: 'archive-secret',
        PLATFORM_HEALTH_CF_ACCESS_CLIENT_ID: 'access-id',
        PLATFORM_HEALTH_CF_ACCESS_CLIENT_SECRET: 'access-secret'
      },
      {
        sites: {
          'test-free': {
            contract: {
              worker_api_origin: 'https://lovely-home-hub-api-test-free.example.workers.dev'
            }
          }
        }
      },
      'test-free',
      fetchImpl
    );

    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://lovely-home-hub-api-test-free.example.workers.dev/api/platform/downgrade-eligibility',
      expect.objectContaining({
        method: 'GET',
        redirect: 'manual',
        headers: expect.any(Headers)
      })
    );
    const headers = fetchImpl.mock.calls[0][1].headers;
    expect(headers.get('X-Platform-Site-Archive-Secret')).toBe('archive-secret');
    expect(headers.get('CF-Access-Client-Id')).toBe('access-id');
    expect(headers.get('CF-Access-Client-Secret')).toBe('access-secret');
  });

  it('reports Access redirects as unavailable', async () => {
    const fetchImpl = vi.fn(async () => Response.redirect('https://access.example/login', 302));
    const result = await fetchHubFreeDowngradeUsage(
      {
        PLATFORM_SITE_ARCHIVE_SECRET: 'archive-secret',
        PLATFORM_HEALTH_CF_ACCESS_CLIENT_ID: 'access-id',
        PLATFORM_HEALTH_CF_ACCESS_CLIENT_SECRET: 'access-secret'
      },
      {},
      'test-free',
      fetchImpl
    );
    expect(result.ok).toBe(false);
    expect(result.error).toBe('ACCESS_BLOCKED');
  });
});
