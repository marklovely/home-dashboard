import { describe, expect, it } from 'vitest';
import {
  detectAddedTerraformSites,
  detectRemovedTerraformSites
} from '../scripts/lib/detect-site-yaml-changes.mjs';

describe('detect site yaml changes', () => {
  const before = {
    demo: { hostname: 'demo.lovely-home.co.uk', hub_environment: 'demo', vanilla: true },
    test: { hostname: 'test.lovely-home.co.uk', hub_environment: 'test', vanilla: true },
    localonly: { hostname: 'local.lovely-home.co.uk', terraform: false }
  };

  it('detects added terraform sites and skips terraform:false entries', () => {
    const after = {
      ...before,
      sandbox: { hostname: 'sandbox.lovely-home.co.uk', hub_environment: 'sandbox', vanilla: true },
      anotherlocal: { hostname: 'x.lovely-home.co.uk', terraform: false }
    };
    expect(detectAddedTerraformSites(before, after)).toEqual(['sandbox']);
  });

  it('detects removed terraform sites and skips protected ids', () => {
    const after = {
      test: before.test,
      localonly: before.localonly
    };
    expect(detectRemovedTerraformSites(before, after)).toEqual(['demo']);
  });

  it('never deprovisions production', () => {
    const withProduction = {
      ...before,
      production: {
        hostname: 'dashboard.lovely-home.co.uk',
        hub_environment: 'production',
        vanilla: false
      }
    };
    const after = { test: before.test };
    expect(detectRemovedTerraformSites(withProduction, after)).toEqual(['demo']);
  });

  it('rejects invalid site ids in added/removed lists', () => {
    const after = {
      ...before,
      'Bad Id': { hostname: 'bad.lovely-home.co.uk' }
    };
    expect(detectAddedTerraformSites(before, after)).toEqual([]);
  });
});
