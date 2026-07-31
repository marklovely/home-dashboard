import { describe, expect, it, vi, beforeEach } from 'vitest';
import { buildWifiQrPayload, escapeWifiQrField } from '../src/utils/wifiQrPayload.js';
import { createWifiQrSection } from '../src/components/WifiQr/createWifiQrSection.js';
import {
  preloadPrivateConfig,
  resetPrivateConfigForTests
} from '../src/services/privateConfigService.js';

vi.mock('qrcode', () => ({
  default: {
    toString: vi.fn(async () => '<svg data-testid="wifi-qr-svg"></svg>')
  }
}));

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

  it('shows a placeholder when credentials are withheld', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
    await preloadPrivateConfig(vi.fn().mockResolvedValue({ ok: false, status: 403 }));

    const section = createWifiQrSection();
    await Promise.resolve();

    expect(section.querySelector('[data-testid="wifi-qr-svg"]')).toBeNull();
    expect(section.textContent).toMatch(/secure house-sitter access/i);
  });
});
