import { describe, expect, it, vi } from 'vitest';
import {
  buildHubProvisionStatus,
  getPublicHubProvisionStatus,
  hubHtmlLooksLikeLiveHub,
  hubIsRegistered,
  hubProbeIsLive,
  hubProvisionHostname,
  isHubReclaimProvision,
  probeHubHostname
} from '../functions/api/platform/platformPublicHubProvision.js';

const manifest = { sites: { smith: { siteId: 'smith', hostname: 'smith.lovely-hub.com' } } };
const hubHtml = '<main class="hub-shell hub-shell--session-loading">Home Hub</main>';
const emptyPagesHtml = '<title>Cloudflare Pages</title><p>Success! Your project is live.</p>';

function hubResponse() {
  return new Response(hubHtml, { status: 200, headers: { 'content-type': 'text/html' } });
}

describe('hub provision status', () => {
  it('builds the hub hostname from the site id', () => {
    expect(hubProvisionHostname(' Smith ')).toBe('smith.lovely-hub.com');
  });

  it('treats hub SPA HTML as live and Access or empty Pages as still provisioning', () => {
    expect(hubHtmlLooksLikeLiveHub(hubHtml)).toBe(true);
    expect(hubHtmlLooksLikeLiveHub(emptyPagesHtml)).toBe(false);
    expect(hubProbeIsLive({ status: 200, looksLikeHub: true })).toBe(true);
    expect(hubProbeIsLive({ status: 200 })).toBe(false);
    expect(hubProbeIsLive({ status: 200, looksLikeHub: false })).toBe(false);
    expect(hubProbeIsLive({ status: 302 })).toBe(false);
    expect(hubProbeIsLive({ status: 403 })).toBe(false);
  });

  it('treats DNS gaps, unattached domains and origin errors as still provisioning', () => {
    expect(hubProbeIsLive({ status: null, error: 'getaddrinfo ENOTFOUND' })).toBe(false);
    expect(hubProbeIsLive({ status: 404 })).toBe(false);
    expect(hubProbeIsLive({ status: 530 })).toBe(false);
    expect(hubProbeIsLive(null)).toBe(false);
  });

  it('reports a ready hub with its URL', () => {
    const status = buildHubProvisionStatus({
      siteId: 'smith',
      registered: true,
      probe: { status: 200, looksLikeHub: true }
    });

    expect(status).toMatchObject({
      siteId: 'smith',
      hostname: 'smith.lovely-hub.com',
      hubUrl: 'https://smith.lovely-hub.com/',
      state: 'ready',
      ready: true,
      registered: true,
      probeStatus: 200,
      looksLikeHub: true
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

  it('marks a rebuild after deprovision as returning', () => {
    expect(
      isHubReclaimProvision({}, 'smith', {
        status: 'trialing',
        archive_r2_key: 'smith/site-backup-test.json'
      })
    ).toBe(true);
    expect(
      isHubReclaimProvision(manifest, 'smith', {
        status: 'trialing',
        archive_r2_key: 'smith/site-backup-test.json'
      })
    ).toBe(false);

    const status = buildHubProvisionStatus({
      siteId: 'smith',
      returning: true,
      probe: { status: null, error: 'ENOTFOUND' }
    });
    expect(status.returning).toBe(true);
    expect(status.message).toMatch(/reinstating/i);
  });

  it('keeps an Access login redirect in the provisioning state', () => {
    const status = buildHubProvisionStatus({
      siteId: 'smith',
      registered: true,
      probe: { status: 302, looksLikeHub: false }
    });

    expect(status).toMatchObject({ state: 'provisioning', ready: false, probeStatus: 302 });
  });

  it('probes the hub hostname without following Access redirects', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 302 }));

    await expect(probeHubHostname('smith.lovely-hub.com', fetchImpl)).resolves.toEqual({
      status: 302,
      error: null,
      looksLikeHub: false
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://smith.lovely-hub.com/',
      expect.objectContaining({ redirect: 'manual' })
    );
  });

  it('sends the platform health service token so Access will return the hub HTML', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(hubResponse());

    await expect(
      probeHubHostname('smith.lovely-hub.com', fetchImpl, {
        PLATFORM_HEALTH_CF_ACCESS_CLIENT_ID: 'cid',
        PLATFORM_HEALTH_CF_ACCESS_CLIENT_SECRET: 'sec'
      })
    ).resolves.toEqual({ status: 200, error: null, looksLikeHub: true });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://smith.lovely-hub.com/',
      expect.objectContaining({
        headers: expect.objectContaining({
          'CF-Access-Client-Id': 'cid',
          'CF-Access-Client-Secret': 'sec'
        })
      })
    );
  });

  it('captures probe failures instead of throwing', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('dns failure'));

    await expect(probeHubHostname('smith.lovely-hub.com', fetchImpl)).resolves.toEqual({
      status: null,
      error: 'dns failure',
      looksLikeHub: false
    });
  });

  it('rejects malformed site ids', async () => {
    const result = await getPublicHubProvisionStatus(manifest, 'Not A Slug', vi.fn());

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.body.error).toBe('INVALID_SITE_ID');
  });

  it('marks manifest-known sites as registered once the hub SPA answers', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(hubResponse());

    const result = await getPublicHubProvisionStatus(manifest, 'SMITH', fetchImpl);

    expect(result.body).toMatchObject({
      siteId: 'smith',
      registered: true,
      ready: true,
      looksLikeHub: true
    });
  });

  it('marks a trialing site registered before the Pages manifest catches up', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(hubResponse());
    const result = await getPublicHubProvisionStatus({}, 'e2e-newhub', fetchImpl, {}, { status: 'trialing' });
    expect(result.body).toMatchObject({ registered: true, ready: true });
  });

  it('clears registered as soon as billing is canceled even if the manifest is stale', () => {
    expect(hubIsRegistered({ sites: { smith: { siteId: 'smith' } } }, 'smith', { status: 'canceled' })).toBe(
      false
    );
    expect(hubIsRegistered({ sites: {} }, 'smith', { status: 'trialing' })).toBe(true);
    expect(hubIsRegistered({ sites: { demo: { siteId: 'demo' } } }, 'demo', null)).toBe(true);
  });

  it('keeps unknown sites in the provisioning state', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));

    const result = await getPublicHubProvisionStatus(manifest, 'rose-cottage', fetchImpl);

    expect(result.body).toMatchObject({ registered: false, state: 'provisioning', ready: false });
  });

  it('reports a failed registry when the hostname was never valid', () => {
    const status = buildHubProvisionStatus({
      siteId: 'kitchen_home',
      registered: false,
      registryLastError: 'Hostname must be a valid DNS name.',
      probe: { status: 530 }
    });

    expect(status).toMatchObject({ state: 'failed', ready: false, registered: false });
    expect(status.failureKind).toBe('invalid_hostname');
    expect(status.message).toMatch(/underscores are not allowed/i);
    expect(status.message).toMatch(/kitchen-home/);
  });

  it('reports a failed provision without leaking the internal error', () => {
    const status = buildHubProvisionStatus({
      siteId: 'kitchen-home',
      registered: true,
      provisionLastError: 'Terraform apply failed: secret GITHUB_TOKEN leaked',
      probe: { status: 530 }
    });

    expect(status).toMatchObject({
      state: 'failed',
      ready: false,
      registered: true,
      failureKind: 'setup_failed'
    });
    expect(status.message).toMatch(/could not finish building kitchen-home\.lovely-hub\.com/i);
    expect(status.message).toMatch(/support@lovely-home\.co\.uk/i);
    expect(status.message).not.toMatch(/Terraform|GITHUB_TOKEN/i);
  });

  it('keeps a live hub ready even if an old provision error is still stored', () => {
    const status = buildHubProvisionStatus({
      siteId: 'smith',
      registered: true,
      provisionLastError: 'old failure',
      probe: { status: 200, looksLikeHub: true }
    });

    expect(status).toMatchObject({ state: 'ready', ready: true, failureKind: null });
  });

  it('reads registry_last_error from billing for unregistered sites', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 530 }));
    const result = await getPublicHubProvisionStatus(
      manifest,
      'kitchen_home',
      fetchImpl,
      {},
      { registry_last_error: 'Hostname must be a valid DNS name.' }
    );
    expect(result.body.state).toBe('failed');
    expect(result.body.failureKind).toBe('invalid_hostname');
    expect(result.body.message).toMatch(/kitchen-home/);
  });

  it('reads provision_last_error from billing after a workflow failure', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 530 }));
    const result = await getPublicHubProvisionStatus(
      manifest,
      'rose-cottage',
      fetchImpl,
      {},
      { provision_last_error: 'Hub provision workflow failed (run 99).' }
    );
    expect(result.body.state).toBe('failed');
    expect(result.body.failureKind).toBe('setup_failed');
    expect(result.body.message).not.toMatch(/run 99/);
  });

  it('does not treat an empty Pages success page as ready', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(emptyPagesHtml, { status: 200, headers: { 'content-type': 'text/html' } }));

    const result = await getPublicHubProvisionStatus(manifest, 'smith', fetchImpl);

    expect(result.body).toMatchObject({ ready: false, state: 'provisioning', looksLikeHub: false, probeStatus: 200 });
  });
});
