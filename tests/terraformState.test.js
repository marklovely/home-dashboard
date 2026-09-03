import { describe, expect, it } from 'vitest';
import {
  readHubSiteIdsFromStateList,
  stateListIncludesHubSite
} from '../scripts/lib/terraform-state.mjs';

describe('terraform state helpers', () => {
  it('detects hub site module resources by prefix', () => {
    const stateList = [
      'module.hub_site["demo"].cloudflare_d1_database.manuals',
      'module.hub_site["demo"].cloudflare_pages_project.site',
      'module.hub_site["production"].cloudflare_d1_database.manuals'
    ].join('\n');

    expect(stateListIncludesHubSite(stateList, 'demo')).toBe(true);
    expect(stateListIncludesHubSite(stateList, 'production')).toBe(true);
    expect(stateListIncludesHubSite(stateList, 'missing')).toBe(false);
  });

  it('does not match bare module addresses', () => {
    const stateList = 'module.hub_site["demo"]';
    expect(stateListIncludesHubSite(stateList, 'demo')).toBe(false);
  });

  it('collects hub site ids from state list prefixes', () => {
    const stateList = [
      'module.hub_site["smith"].cloudflare_pages_project.site',
      'module.hub_site["smith"].random_password.hub_proxy[0]',
      'module.hub_site["demo"].cloudflare_d1_database.manuals'
    ].join('\n');

    expect(readHubSiteIdsFromStateList(stateList)).toEqual(new Set(['smith', 'demo']));
  });
});
