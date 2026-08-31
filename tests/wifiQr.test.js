import { describe, expect, it, vi, beforeEach } from 'vitest';
import { buildWifiQrPayload, escapeWifiQrField } from '../src/utils/wifiQrPayload.js';
import { createWifiQrSection } from '../src/components/WifiQr/createWifiQrSection.js';
import {
  injectQrLogoBadge,
  parseQrSvgSize,
  QR_LOGO_BADGE_MAX_RATIO
} from '../src/lib/qrLogoBadge.js';
import {
  preloadPrivateConfig,
  resetPrivateConfigForTests
} from '../src/services/privateConfigService.js';

vi.mock('qrcode', () => ({
  default: {
    toString: vi.fn(
      async () =>
        '<svg data-testid="wifi-qr-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29 29"><path d="M0 0h1v1H0z"/></svg>'
    )
  }
}));

import QRCode from 'qrcode';

describe('wifiQrPayload', () => {
  it('escapes special characters in ssid and password', () => {
    expect(escapeWifiQrField('Guest;Net')).toBe('Guest\\;Net');
    expect(buildWifiQrPayload('Guest Net', 'pa:ss "word"')).toBe(
      'WIFI:T:WPA;S:Guest Net;P:pa\\:ss \\"word\\";;'
    );
  });

  it('builds nopass payload when password is missing', () => {
    expect(buildWifiQrPayload('OpenNet', '')).toBe('WIFI:T:nopass;S:OpenNet;;');
  });
});

describe('injectQrLogoBadge', () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M0 0h1v1H0z"/></svg>';

  it('reads the square viewBox size', () => {
    expect(parseQrSvgSize(svg)).toBe(100);
    expect(parseQrSvgSize('<svg viewBox="0 0 100 80"></svg>')).toBeNull();
    expect(parseQrSvgSize('<svg></svg>')).toBeNull();
  });

  it('centres a white card and the logo image', () => {
    const withBadge = injectQrLogoBadge(svg, { logoHref: '/icons/icon-192.png' });

    expect(withBadge).toContain('<rect x="39" y="39" width="22" height="22"');
    expect(withBadge).toContain('fill="#ffffff"');
    expect(withBadge).toContain('href="/icons/icon-192.png"');
    expect(withBadge.endsWith('</svg>')).toBe(true);
  });

  it('caps the badge so error correction can still recover the code', () => {
    const withBadge = injectQrLogoBadge(svg, { logoHref: '/logo.png', ratio: 0.9 });
    const width = Number(/<rect[^>]*width="([0-9.]+)"/.exec(withBadge)?.[1]);

    expect(width).toBeLessThanOrEqual(100 * QR_LOGO_BADGE_MAX_RATIO);
  });

  it('leaves the SVG untouched when it cannot place a badge', () => {
    expect(injectQrLogoBadge(svg, { logoHref: '' })).toBe(svg);
    expect(injectQrLogoBadge('<svg></svg>', { logoHref: '/logo.png' })).toBe('<svg></svg>');
  });

  it('escapes the logo href', () => {
    expect(injectQrLogoBadge(svg, { logoHref: '/logo.png?a=1&b=2' })).toContain('a=1&amp;b=2');
  });
});

describe('createWifiQrSection', () => {
  beforeEach(() => {
    resetPrivateConfigForTests();
    vi.unstubAllEnvs();
  });

  it('renders a QR code when Wi-Fi credentials are available', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
    await preloadPrivateConfig(
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          wifi: { ssid: 'GuestNet', password: 'secret-pass' }
        })
      })
    );

    const section = createWifiQrSection();
    document.body.append(section);
    await Promise.resolve();
    await Promise.resolve();

    expect(section.querySelector('[data-testid="wifi-qr-svg"]')).toBeTruthy();
    expect(section.textContent).toMatch(/Scan with your phone camera/i);
    section.remove();
  });

  it('renders the Lovely Home mark in the middle of the code', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
    await preloadPrivateConfig(
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          wifi: { ssid: 'GuestNet', password: 'secret-pass' }
        })
      })
    );

    const section = createWifiQrSection();
    document.body.append(section);
    await Promise.resolve();
    await Promise.resolve();

    const badge = section.querySelector('.guide-wifi-qr-code image');
    expect(badge).toBeTruthy();
    expect(badge?.getAttribute('href')).toMatch(/icon-192/);
    expect(vi.mocked(QRCode.toString).mock.calls.at(-1)?.[1]).toMatchObject({
      errorCorrectionLevel: 'H'
    });
    section.remove();
  });

  it('shows a placeholder when credentials are withheld', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
    await preloadPrivateConfig(vi.fn().mockResolvedValue({ ok: false, status: 403 }));

    const section = createWifiQrSection();
    await Promise.resolve();

    expect(section.querySelector('[data-testid="wifi-qr-svg"]')).toBeNull();
    expect(section.textContent).toMatch(/secure house-sitter access/i);
  });
});
