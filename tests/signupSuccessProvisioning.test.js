import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const html = readFileSync(resolve(root, 'website/signup-success.html'), 'utf8');
const qrBundle = readFileSync(resolve(root, 'website/vendor/lovely-qr.js'), 'utf8');
const pageScript = readFileSync(resolve(root, 'website/signup-success.js'), 'utf8');

function mountPage(search) {
  const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)?.[1] ?? '';
  document.head.innerHTML = '<meta name="lovely-platform-api" content="https://platform.test">';
  document.body.innerHTML = body.replace(/<script[\s\S]*?<\/script>/g, '');
  window.history.replaceState({}, '', '/signup-success.html' + search);
}

function loadQrBundle() {
  new Function(`${qrBundle}\nglobalThis.LovelyHomeQr = LovelyHomeQr;`)();
}

function runPageScript() {
  new Function(pageScript)();
}

function jsonResponse(payload) {
  return { ok: true, status: 200, json: async () => payload };
}

const provisioning = {
  siteId: 'blundell',
  hostname: 'blundell.lovely-hub.com',
  hubUrl: 'https://blundell.lovely-hub.com/',
  state: 'provisioning',
  ready: false,
  typicalMinutes: 10
};

const ready = { ...provisioning, state: 'ready', ready: true, probeStatus: 302 };

describe('signup success provisioning status', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    loadQrBundle();
    mountPage('?site=blundell');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows the deploying state without an open button or QR while the hub builds', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(provisioning)));

    runPageScript();
    await vi.advanceTimersByTimeAsync(0);

    expect(document.getElementById('hub-progress').dataset.state).toBe('provisioning');
    expect(document.getElementById('hub-progress-title').textContent).toMatch(/Deploying your hub now/i);
    expect(document.getElementById('hub-progress-note').textContent).toMatch(/about 10 minutes/i);
    expect(document.getElementById('open-hub-btn').hidden).toBe(true);
    expect(document.getElementById('hub-qr').hidden).toBe(true);
    expect(document.getElementById('hub-link').textContent).toBe('blundell.lovely-hub.com');
    expect(document.getElementById('hub-link').getAttribute('href')).toBeNull();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://platform.test/api/public/hub-status/blundell',
      expect.objectContaining({ cache: 'no-store' })
    );
  });

  it('reveals the open button and a logo QR code once the hub answers', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(provisioning))
      .mockResolvedValue(jsonResponse(ready));
    vi.stubGlobal('fetch', fetchMock);

    runPageScript();
    await vi.advanceTimersByTimeAsync(0);
    expect(document.getElementById('open-hub-btn').hidden).toBe(true);

    await vi.advanceTimersByTimeAsync(6000);

    const openBtn = document.getElementById('open-hub-btn');
    expect(document.getElementById('hub-progress').dataset.state).toBe('ready');
    expect(document.getElementById('success-heading').textContent).toMatch(/ready/i);
    expect(document.getElementById('success-lead').textContent).toMatch(/finished building/i);
    expect(openBtn.hidden).toBe(false);
    expect(openBtn.getAttribute('href')).toBe('https://blundell.lovely-hub.com/');
    expect(document.getElementById('hub-link').getAttribute('href')).toBe('https://blundell.lovely-hub.com/');
    expect(document.getElementById('hub-qr').hidden).toBe(false);

    const svg = document.querySelector('#hub-qr-code svg');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('aria-label')).toMatch(/blundell\.lovely-hub\.com/);
    expect(document.querySelector('#hub-qr-code svg image')?.getAttribute('href')).toBe('favicon.png');
  });

  it('stops polling and offers the hub link when the status check keeps failing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })));

    runPageScript();
    await vi.advanceTimersByTimeAsync(20000);

    expect(document.getElementById('hub-progress').dataset.state).toBe('unknown');
    expect(document.getElementById('open-hub-btn').hidden).toBe(false);
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it('stops on a failed registry instead of waiting for a hub that will never exist', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          ...provisioning,
          siteId: 'kitchen_home',
          hostname: 'kitchen_home.lovely-hub.com',
          state: 'failed',
          message: 'We could not create kitchen_home.lovely-hub.com because underscores are not allowed.'
        })
      )
    );
    mountPage('?site=kitchen_home');

    runPageScript();
    await vi.advanceTimersByTimeAsync(0);

    expect(document.getElementById('hub-progress').dataset.state).toBe('failed');
    expect(document.getElementById('success-heading').textContent).toMatch(/could not create/i);
    expect(document.getElementById('open-hub-btn').hidden).toBe(true);
    expect(document.getElementById('retry-signup-btn').hidden).toBe(false);
    expect(document.getElementById('hub-progress-note').textContent).toMatch(/underscores/i);
    expect(document.getElementById('hub-qr').hidden).toBe(true);
  });

  it('stops on a provision failure with support copy and no QR', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          ...provisioning,
          state: 'failed',
          failureKind: 'setup_failed',
          message: 'We could not finish building blundell.lovely-hub.com. Email support@lovely-home.co.uk with this address and we will complete it.'
        })
      )
    );

    runPageScript();
    await vi.advanceTimersByTimeAsync(0);

    expect(document.getElementById('hub-progress').dataset.state).toBe('failed');
    expect(document.getElementById('success-heading').textContent).toMatch(/could not finish/i);
    expect(document.getElementById('success-lead').textContent).toMatch(/support@lovely-home\.co\.uk/i);
    expect(document.getElementById('open-hub-btn').hidden).toBe(true);
    expect(document.getElementById('retry-signup-btn').hidden).toBe(false);
    expect(document.getElementById('hub-qr').hidden).toBe(true);
    expect(document.getElementById('hub-link').getAttribute('href')).toBeNull();
  });

  it('asks for support after 30 minutes instead of showing a QR for a hub that never answered', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(provisioning)));

    runPageScript();
    await vi.advanceTimersByTimeAsync(30 * 60 * 1000 + 1000);

    expect(document.getElementById('hub-progress').dataset.state).toBe('slow');
    expect(document.getElementById('success-heading').textContent).toMatch(/longer than usual/i);
    expect(document.getElementById('open-hub-btn').hidden).toBe(true);
    expect(document.getElementById('retry-signup-btn').hidden).toBe(false);
    expect(document.getElementById('hub-qr').hidden).toBe(true);
    expect(document.getElementById('hub-link').getAttribute('href')).toBeNull();
    expect(document.getElementById('hub-progress-note').textContent).toMatch(/support@lovely-home\.co\.uk|complete the setup/i);
  });

  it('does nothing without a site query parameter', async () => {
    vi.stubGlobal('fetch', vi.fn());
    mountPage('');

    runPageScript();
    await vi.advanceTimersByTimeAsync(0);

    expect(document.getElementById('hub-progress').hidden).toBe(true);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
