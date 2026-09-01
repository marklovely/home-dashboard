import { describe, expect, it } from 'vitest';
import {
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
});
