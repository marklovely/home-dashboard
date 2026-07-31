import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  appendWifiQrSectionIfNeeded,
  shouldSkipStaleGuideBlock,
  topicShouldIncludeWifiQr
} from '../src/widgets/HouseGuide/guideTopicWifiQr.js';
import {
  preloadPrivateConfig,
  resetPrivateConfigForTests
} from '../src/services/privateConfigService.js';

vi.mock('qrcode', () => ({
  default: {
    toString: vi.fn(async () => '<svg data-testid="wifi-qr-svg"></svg>')
  }
}));

describe('guideTopicWifiQr', () => {
  beforeEach(() => {
    resetPrivateConfigForTests();
    vi.unstubAllEnvs();
  });

  it('detects wifi topics that should include a QR section', () => {
    expect(topicShouldIncludeWifiQr({ id: 'connecting', blocks: [] })).toBe(true);
    expect(topicShouldIncludeWifiQr({ id: 'qr-code-placeholder', blocks: [] })).toBe(true);
    expect(topicShouldIncludeWifiQr({ id: 'coverage', blocks: [] })).toBe(false);
  });

  it('skips stale coming soon QR placeholder blocks from older CMS content', () => {
    expect(
      shouldSkipStaleGuideBlock({
        type: 'note',
        heading: 'Coming soon',
        content: 'A Wi-Fi QR code will appear here once secure house-sitter access is enabled.'
      })
    ).toBe(true);
  });

  it('appends a live QR section for connecting even without a wifiQr block', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
    await preloadPrivateConfig(
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          wifi: { ssid: 'GuestNet', password: 'secret-pass' }
        })
      })
    );

    const body = document.createElement('div');
    appendWifiQrSectionIfNeeded(body, {
      id: 'connecting',
      title: 'Connecting',
      subtitle: '',
      summary: '',
      blocks: [
        {
          type: 'note',
          heading: 'Coming soon',
          content: 'A Wi-Fi QR code will appear here once secure house-sitter access is enabled.'
        }
      ]
    });

    await Promise.resolve();
    expect(body.querySelector('[data-testid="wifi-qr-svg"]')).toBeTruthy();
  });
});
