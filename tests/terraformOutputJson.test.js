import { describe, expect, it } from 'vitest';
import {
  parseHubProxySecretsFromTerraformState,
  parseTerraformJsonOutput,
  terraformStringMap,
  unwrapTerraformJsonValue
} from '../scripts/lib/terraform-output-json.mjs';
import { hubProxySecretForGeneratedTfvars } from '../scripts/lib/hub-tfvars.mjs';

describe('terraform JSON output', () => {
  it('unwraps setup-terraform sensitive wrappers', () => {
    const wrapped = {
      sensitive: true,
      type: ['object'],
      value: { production: 'pinned-secret', demo: 'demo-secret' }
    };
    expect(unwrapTerraformJsonValue(wrapped)).toEqual({
      production: 'pinned-secret',
      demo: 'demo-secret'
    });
    expect(terraformStringMap(wrapped)).toEqual({
      production: 'pinned-secret',
      demo: 'demo-secret'
    });
  });

  it('ignores warning text before the JSON object', () => {
    const raw = 'Warning: output is sensitive\n{"production":"pinned-secret"}';
    expect(parseTerraformJsonOutput(raw)).toEqual({ production: 'pinned-secret' });
  });

  it('lets generate-hub-tfvars pin production from a wrapped state output', () => {
    const state = terraformStringMap({
      sensitive: true,
      value: { production: 'pinned-secret' }
    });
    expect(
      hubProxySecretForGeneratedTfvars(
        'production',
        new Set(['production', 'kitchen-home']),
        new Set(),
        {},
        state
      )
    ).toBe('pinned-secret');
  });

  it('reads hub proxy secrets from terraform state pull JSON', () => {
    const state = {
      resources: [
        {
          module: 'module.hub_site["sandbox"]',
          type: 'random_password',
          name: 'hub_proxy',
          instances: [{ attributes: { result: 'sandbox-generated' } }]
        },
        {
          module: 'module.hub_site["production"]',
          type: 'cloudflare_pages_project',
          name: 'dashboard',
          instances: [
            {
              attributes: {
                deployment_configs: {
                  production: {
                    env_vars: { HUB_PROXY_SECRET: { type: 'secret_text', value: 'production-pinned' } }
                  }
                }
              }
            }
          ]
        }
      ]
    };
    expect(parseHubProxySecretsFromTerraformState(JSON.stringify(state))).toEqual({
      sandbox: 'sandbox-generated',
      production: 'production-pinned'
    });
  });
});
