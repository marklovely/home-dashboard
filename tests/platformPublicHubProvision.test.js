import { describe, expect, it, vi } from 'vitest';
import {
  buildHubProvisionStatus,
  getPublicHubProvisionStatus,
  hubProbeIsLive,
  hubProvisionHostname,
  probeHubHostname
} from '../functions/api/platform/platformPublicHubProvision.js';

const manifest = { sites: { smith: { siteId: 'smith', hostname: 'smith.lovely-hub.com' } } };

describe('hub provision status', () => {
  it('builds the hub hostname from the site id', () => {
    expect(hubProvisionHostname(' Smith ')).toBe('smith.lovely-hub.com');
  });

  it('treats an Access redirect or challenge as live', () => {
    expect(hubProbeIsLive({ status: 302 })).toBe(true);
    expect(hubProbeIsLive({ status: 200 })).toBe(true);
    expect(hubProbeIsLive({ status: 403 })).toBe(true);
  });

  it('treats DNS gaps, unattached domains and origin errors as still provisioning', () => {
    expect(hubProbeIsLive({ status: null, error: 'getaddrinfo ENOTFOUND' })).toBe(false);
    expect(hubProbeIsLive({ status: 404 })).toBe(false);
    expect(hubProbeIsLive({ status: 530 })).toBe(false);
    expect(hubProbeIsLive(null)).toBe(false);
  });

  it('reports a ready hub with its URL', () => {
    const status = buildHubProvisionStatus({ siteId: 'smith', registered: true, probe: { status: 302 } });

    expect(status).toMatchObject({
      siteId: 'smith',
      hostname: 'smith.lovely-hub.com',
      hubUrl: 'https://smith.lovely-hub.com/',
      state: 'ready',
      ready: true,
      registered: true,
      probeStatus: 302
    });
  });

  it('reports provisioning with the typical wait', () => {
    const status = buildHubProvisionStatus({ siteId: 'smith', probe: { status: null, error: 'boom' } });

    expect(status.state).toBe('provisioning');
    expect(status.ready).toBe(false);
    expect(status.registered).toBe(false);
    expect(status.typicalMinutes).toBe(10);
    expect(status.message).toMatch(/about 10 minutes/i);
  });

  it('probes the hub hostname without following Access redirects', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 302 }));

    await expect(probeHubHostname('smith.lovely-hub.com', fetchImpl)).resolves.toEqual({
      status: 302,
      error: null
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://smith.lovely-hub.com/',
      expect.objectContaining({ redirect: 'manual' })
    );
  });

  it('captures probe failures instead of throwing', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('dns failure'));

    await expect(probeHubHostname('smith.lovely-hub.com', fetchImpl)).resolves.toEqual({
      status: null,
      error: 'dns failure'
    });
  });

  it('rejects malformed site ids', async () => {
    const result = await getPublicHubProvisionStatus(manifest, 'Not A Slug', vi.fn());

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.body.error).toBe('INVALID_SITE_ID');
  });

  it('marks manifest-known sites as registered', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 302 }));

    const result = await getPublicHubProvisionStatus(manifest, 'SMITH', fetchImpl);

    expect(result.body).toMatchObject({ siteId: 'smith', registered: true, ready: true });
  });

  it('keeps unknown sites in the provisioning state', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));

    const result = await getPublicHubProvisionStatus(manifest, 'rose-cottage', fetchImpl);

    expect(result.body).toMatchObject({ registered: false, state: 'provisioning', ready: false });
  });
});
