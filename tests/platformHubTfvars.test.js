import { describe, expect, it } from 'vitest';
import { resolveAttachHubApiBinding, resolveHubProxySecret } from '../scripts/lib/hub-tfvars.mjs';

describe('hub tfvars helpers', () => {
  it('honours post-worker phase over attach_hub_api_binding false in yaml', () => {
    const meta = { attach_hub_api_binding: false };
    const inState = new Set(['demo']);
    expect(
      resolveAttachHubApiBinding('demo', meta, inState, {
        provisionSiteId: 'demo',
        provisionPhase: 'post-worker'
      })
    ).toBe(true);
    expect(
      resolveAttachHubApiBinding('demo', meta, inState, {
        provisionSiteId: 'demo',
        provisionPhase: 'pre-worker'
      })
    ).toBe(false);
  });

  it('preserves existing in-state attach when not provisioning that site', () => {
    const meta = { attach_hub_api_binding: false };
    const inState = new Set(['demo']);
    expect(resolveAttachHubApiBinding('demo', meta, inState)).toBe(false);
    expect(resolveAttachHubApiBinding('demo', { attach_hub_api_binding: true }, inState)).toBe(true);
    expect(resolveAttachHubApiBinding('other', {}, inState)).toBe(false);
  });

  it('reads hub proxy secrets from env then state', () => {
    const inState = new Set(['production', 'demo']);
    expect(
      resolveHubProxySecret('production', inState, { production: 'from-env' }, { production: 'from-state' })
    ).toBe('from-env');
    expect(resolveHubProxySecret('production', inState, {}, { production: 'from-state' })).toBe('from-state');
    expect(resolveHubProxySecret('demo', inState, {}, {})).toBe(null);
  });
});
