import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  accessIncludeFromEmails,
  emailsAfterAddingGuest,
  emailsAfterRemovingGuest,
  emailsFromAccessInclude,
  getMarketingAccess,
  splitMarketingAccessEmails,
  updateMarketingAccess
} from '../functions/api/platform/platformMarketingAccess.js';
import { renderMarketingAccessPanel } from '../platform-admin/src/marketingAccess.js';
import { resetPanelFoldState } from '../platform-admin/src/panelFold.js';

describe('marketing Access email helpers', () => {
  it('reads emails from Cloudflare include rules', () => {
    expect(
      emailsFromAccessInclude([
        { email: { email: 'Ops@Example.com' } },
        { everyone: {} },
        { email: { email: 'guest@example.com' } }
      ])
    ).toEqual(['guest@example.com', 'ops@example.com']);
  });

  it('keeps operators locked when removing a guest', () => {
    const operators = ['ops@example.com'];
    const current = ['ops@example.com', 'guest@example.com'];
    expect(emailsAfterRemovingGuest(operators, current, 'guest@example.com')).toEqual([
      'ops@example.com'
    ]);
    expect(emailsAfterRemovingGuest(operators, current, 'ops@example.com')).toEqual([
      'guest@example.com',
      'ops@example.com'
    ]);
  });

  it('adds a guest without dropping operators', () => {
    expect(emailsAfterAddingGuest(['ops@example.com'], ['ops@example.com'], 'Guest@Example.com')).toEqual([
      'guest@example.com',
      'ops@example.com'
    ]);
  });

  it('splits operator vs guest', () => {
    expect(
      splitMarketingAccessEmails(['ops@example.com'], ['ops@example.com', 'guest@example.com'])
    ).toEqual({
      operators: ['ops@example.com'],
      guests: ['guest@example.com']
    });
  });

  it('builds Access include payloads', () => {
    expect(accessIncludeFromEmails(['a@example.com'])).toEqual([{ email: { email: 'a@example.com' } }]);
  });
});

describe('marketing Access API', () => {
  it('explains when the Cloudflare token is missing', async () => {
    const result = await getMarketingAccess({ PLATFORM_OPERATOR_EMAILS: 'ops@example.com' });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('NOT_CONFIGURED');
  });

  it('rejects invalid emails before calling Cloudflare', async () => {
    const result = await updateMarketingAccess(
      { PLATFORM_OPERATOR_EMAILS: 'ops@example.com' },
      {},
      'add',
      'not-an-email'
    );
    expect(result.ok).toBe(false);
    expect(result.code).toBe('INVALID_EMAIL');
  });

  it('lists guests from the marketing Access policy', async () => {
    const fetchImpl = async (url) => {
      const href = String(url);
      if (href.includes('/access/apps?')) {
        return jsonOk({
          result: [{ id: 'app-1', name: 'Lovely Home — Marketing site' }]
        });
      }
      if (href.includes('/policies')) {
        return jsonOk({
          result: [
            {
              id: 'pol-1',
              name: 'Platform operators',
              decision: 'allow',
              include: [
                { email: { email: 'ops@example.com' } },
                { email: { email: 'guest@example.com' } }
              ]
            }
          ]
        });
      }
      throw new Error(href);
    };

    const result = await getMarketingAccess(
      {
        PLATFORM_OPERATOR_EMAILS: 'ops@example.com',
        PLATFORM_CF_API_TOKEN: 'token',
        CLOUDFLARE_ACCOUNT_ID: 'acc'
      },
      {},
      fetchImpl
    );
    expect(result.ok).toBe(true);
    expect(result.protected).toBe(true);
    expect(result.guests).toEqual(['guest@example.com']);
    expect(result.operators).toEqual(['ops@example.com']);
  });

  it('blocks removing an operator', async () => {
    const fetchImpl = async (url) => {
      const href = String(url);
      if (href.includes('/access/apps?')) {
        return jsonOk({
          result: [{ id: 'app-1', name: 'Lovely Home — Marketing site' }]
        });
      }
      if (href.includes('/policies')) {
        return jsonOk({
          result: [
            {
              id: 'pol-1',
              name: 'Platform operators',
              decision: 'allow',
              include: [{ email: { email: 'ops@example.com' } }]
            }
          ]
        });
      }
      throw new Error(href);
    };

    const result = await updateMarketingAccess(
      {
        PLATFORM_OPERATOR_EMAILS: 'ops@example.com',
        PLATFORM_CF_API_TOKEN: 'token',
        CLOUDFLARE_ACCOUNT_ID: 'acc'
      },
      {},
      'remove',
      'ops@example.com',
      fetchImpl
    );
    expect(result.ok).toBe(false);
    expect(result.code).toBe('OPERATOR_LOCKED');
  });

  it('adds a guest by updating the Access policy', async () => {
    /** @type {string[]} */
    const puts = [];
    const fetchImpl = async (url, init = {}) => {
      const href = String(url);
      if (href.includes('/access/apps?')) {
        return jsonOk({
          result: [{ id: 'app-1', name: 'Lovely Home — Marketing site' }]
        });
      }
      if (href.includes('/policies') && (!init.method || init.method === 'GET')) {
        return jsonOk({
          result: [
            {
              id: 'pol-1',
              name: 'Platform operators',
              decision: 'allow',
              include: [{ email: { email: 'ops@example.com' } }]
            }
          ]
        });
      }
      if (init.method === 'PUT') {
        puts.push(String(init.body));
        return jsonOk({ result: {} });
      }
      throw new Error(`${init.method} ${href}`);
    };

    const result = await updateMarketingAccess(
      {
        PLATFORM_OPERATOR_EMAILS: 'ops@example.com',
        PLATFORM_CF_API_TOKEN: 'token',
        CLOUDFLARE_ACCOUNT_ID: 'acc'
      },
      {},
      'add',
      'guest@example.com',
      fetchImpl
    );
    expect(result.ok).toBe(true);
    expect(puts).toHaveLength(1);
    expect(puts[0]).toMatch(/guest@example.com/);
    expect(puts[0]).toMatch(/ops@example.com/);
  });

  it('refuses updates when the marketing gate is off', async () => {
    const fetchImpl = async (url) => {
      const href = String(url);
      if (href.includes('/access/apps?')) {
        return jsonOk({ result: [] });
      }
      throw new Error(href);
    };

    const result = await updateMarketingAccess(
      {
        PLATFORM_OPERATOR_EMAILS: 'ops@example.com',
        PLATFORM_CF_API_TOKEN: 'token',
        CLOUDFLARE_ACCOUNT_ID: 'acc'
      },
      {},
      'add',
      'guest@example.com',
      fetchImpl
    );
    expect(result.ok).toBe(false);
    expect(result.code).toBe('NOT_PROTECTED');
  });
});

describe('marketing Access panel', () => {
  beforeEach(() => {
    resetPanelFoldState();
  });

  it('renders guests with a remove control', () => {
    const html = renderMarketingAccessPanel({
      ok: true,
      protected: true,
      origin: 'https://lovely-home.co.uk',
      operators: ['ops@example.com'],
      guests: ['guest@example.com']
    });
    expect(html).toContain('guest@example.com');
    expect(html).toContain('data-marketing-remove="guest@example.com"');
    expect(html).not.toMatch(/data-marketing-remove="ops@example.com"/);
    expect(html).toContain('<details class="panel-fold"');
    expect(html).toContain('Marketing site access');
    expect(html).not.toMatch(/<details[^>]*\sopen/);
  });

  it('explains when the site is not gated', () => {
    const html = renderMarketingAccessPanel({
      ok: true,
      protected: false,
      origin: 'https://lovely-home.co.uk',
      message: 'No marketing Access app found.'
    });
    expect(html).toContain('marketing_site_access_protected');
    expect(html).not.toContain('marketing-access-form');
  });

  it('sits above the site cards on the dashboard', () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../platform-admin/src/main.js'),
      'utf8'
    );
    const slot = source.indexOf('id="marketing-access-slot"');
    const grid = source.indexOf('<section class="grid">');
    expect(slot).toBeGreaterThan(-1);
    expect(grid).toBeGreaterThan(-1);
    expect(slot).toBeLessThan(grid);
  });
});

/**
 * @param {unknown} result
 */
function jsonOk(result) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true, ...result })
  };
}
