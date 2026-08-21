import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  deprovisionSiteMissingError,
  hubProxySecretForGeneratedTfvars,
  resolveAttachHubApiBinding,
  resolveHubProxySecret,
  resolveIncludePagesDevAccessDestinations
} from '../scripts/lib/hub-tfvars.mjs';

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

  it('defers pages.dev Access destinations until post-worker provision', () => {
    const inState = new Set(['dev']);
    expect(
      resolveIncludePagesDevAccessDestinations('dev', {}, inState, {
        provisionSiteId: 'dev',
        provisionPhase: 'pre-worker'
      })
    ).toBe(false);
    expect(
      resolveIncludePagesDevAccessDestinations('dev', {}, inState, {
        provisionSiteId: 'dev',
        provisionPhase: 'post-worker'
      })
    ).toBe(true);
    expect(resolveIncludePagesDevAccessDestinations('demo', {}, inState)).toBe(true);
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

  it('omits random_password-managed sites from generated secrets map', () => {
    const inState = new Set(['sandbox', 'production']);
    const randomProxy = new Set(['sandbox']);
    expect(
      hubProxySecretForGeneratedTfvars('sandbox', inState, randomProxy, {}, { sandbox: 'generated' })
    ).toBeUndefined();
    expect(
      hubProxySecretForGeneratedTfvars('production', inState, randomProxy, {}, { production: 'pinned' })
    ).toBe('pinned');
    expect(hubProxySecretForGeneratedTfvars('demo', inState, randomProxy, {}, {})).toBeUndefined();
  });

  it('requires deprovision site to be written into generated tfvars', () => {
    expect(deprovisionSiteMissingError('', new Set())).toBeNull();
    expect(deprovisionSiteMissingError('demo', new Set(['demo']))).toBeNull();
    expect(deprovisionSiteMissingError('demo', new Set())).toMatch(/must appear in generated tfvars/i);
  });

  it('declares generate-hub-tfvars site keys in terraform variables.tf sites schema', () => {
    const variablesTf = readFileSync(join(process.cwd(), 'terraform/variables.tf'), 'utf8');
    const sitesBlock = variablesTf.match(/variable "sites"[\s\S]*?^\}/m)?.[0] ?? '';
    for (const key of [
      'attach_hub_api_binding',
      'include_pages_dev_access_destinations',
      'tester_emails'
    ]) {
      expect(sitesBlock, `terraform/variables.tf sites object must declare ${key}`).toContain(key);
    }
  });
});
