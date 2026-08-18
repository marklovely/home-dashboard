import { describe, expect, it } from 'vitest';
import {
  pruneHubProxySecretsJson,
  removeHubTfvarsSiteBlock
} from '../scripts/lib/prune-hub-site-config.mjs';

describe('prune hub site config helpers', () => {
  it('removes a site block from hub tfvars text', () => {
    const text = `sites = {
  demo = {
    hostname = "demo.example.com"
    hub_environment = "demo"
    vanilla = true
    terraform = true
  }
  production = {
    hostname = "app.example.com"
    hub_environment = "production"
    vanilla = false
    terraform = true
  }
}`;

    const { text: next, changed } = removeHubTfvarsSiteBlock(text, 'demo');
    expect(changed).toBe(true);
    expect(next).not.toMatch(/\bdemo = \{/);
    expect(next).toMatch(/production = \{/);
  });

  it('prunes site entries from HUB_PROXY_SECRETS_JSON', () => {
    expect(pruneHubProxySecretsJson('{"demo":"abc","production":"xyz"}', 'demo')).toEqual({
      changed: true,
      value: '{"production":"xyz"}'
    });
    expect(pruneHubProxySecretsJson('{"production":"xyz"}', 'demo')).toEqual({
      changed: false,
      value: '{"production":"xyz"}'
    });
    expect(pruneHubProxySecretsJson('', 'demo')).toEqual({
      changed: false,
      value: null
    });
  });
});
