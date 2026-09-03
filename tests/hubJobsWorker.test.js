import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  handleHubJob,
  HUB_PROVISION_QUEUE_NAME,
  HUB_REGISTRY_QUEUE_NAME,
  parseHubJobMessage,
  workflowForAction
} from '../workers/hub-jobs/index.js';

describe('hub job messages', () => {
  it('parses provision and registry payloads', () => {
    expect(parseHubJobMessage({ siteId: 'rose-cottage', action: 'provision' })).toEqual({
      siteId: 'rose-cottage',
      action: 'provision',
      ref: ''
    });
    expect(
      parseHubJobMessage('{"siteId":"rose-cottage","action":"record","ref":"platform/hub-record-rose-cottage"}')
    ).toMatchObject({ action: 'record', ref: 'platform/hub-record-rose-cottage' });
  });

  it('rejects unknown actions and bad site ids', () => {
    expect(() => parseHubJobMessage({ siteId: 'Rose', action: 'provision' })).toThrow(/Invalid site id/);
    expect(() => parseHubJobMessage({ siteId: 'rose-cottage', action: 'merge' })).toThrow(/Unknown hub job action/);
  });

  it('maps actions to GitHub workflows', () => {
    expect(workflowForAction('provision').file).toBe('platform-site-provision.yml');
    expect(workflowForAction('teardown').file).toBe('platform-site-billing-deprovision.yml');
    expect(workflowForAction('record').file).toBe('platform-site-registry.yml');
    expect(workflowForAction('drop').inputs('willow', 'platform/hub-drop-willow')).toMatchObject({
      site_id: 'willow',
      action: 'drop',
      source_ref: 'platform/hub-drop-willow'
    });
  });
});

describe('hub job dispatch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('dispatches provision without waiting for the GitHub run', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, text: async () => '', json: async () => ({}) }));
    vi.stubGlobal('fetch', fetchImpl);

    await handleHubJob(HUB_PROVISION_QUEUE_NAME, { siteId: 'rose-cottage', action: 'provision' }, {
      PLATFORM_GITHUB_TOKEN: 'token',
      PLATFORM_GITHUB_REPO: 'marklovely/home-dashboard'
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toContain('platform-site-provision.yml/dispatches');
    expect(JSON.parse(String(init.body))).toMatchObject({
      ref: 'main',
      inputs: { site_id: 'rose-cottage' }
    });
  });

  it('refuses a registry job without a snapshot ref', async () => {
    await expect(
      handleHubJob(
        HUB_REGISTRY_QUEUE_NAME,
        { siteId: 'rose-cottage', action: 'record' },
        { PLATFORM_GITHUB_TOKEN: 'token', PLATFORM_GITHUB_REPO: 'marklovely/home-dashboard' }
      )
    ).rejects.toThrow(/source_ref/);
  });
});
