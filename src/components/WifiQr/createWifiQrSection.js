import QRCode from 'qrcode';
import { getProtectedString } from '../../content/houseguide/privateContent.js';
import { isPrivateConfigLoading, subscribeToPrivateConfig } from '../../services/privateConfigService.js';
import { buildWifiQrPayload } from '../../utils/wifiQrPayload.js';
import { injectQrLogoBadge } from '../../lib/qrLogoBadge.js';
import qrLogoUrl from '../../icons/icon-192.png';

const PLACEHOLDER =
  'Wi-Fi QR code will appear once secure house-sitter access is enabled.';

/**
 * @param {{ caption?: string, heading?: string }} [options]
 * @returns {HTMLElement}
 */
export function createWifiQrSection(options = {}) {
  const section = document.createElement('section');
  section.className = 'guide-section guide-section-wifi-qr';

  if (options.heading) {
    const heading = document.createElement('h3');
    heading.className = 'guide-section-heading';
    heading.textContent = options.heading;
    section.append(heading);
  }

  const figure = document.createElement('figure');
  figure.className = 'guide-wifi-qr';

  const codeHost = document.createElement('div');
  codeHost.className = 'guide-wifi-qr-code-host';

  const status = document.createElement('p');
  status.className = 'guide-wifi-qr-status subtle';
  status.hidden = true;

  const caption = document.createElement('figcaption');
  caption.className = 'guide-wifi-qr-caption';
  caption.textContent = options.caption ?? 'Scan with your phone camera to join Wi‑Fi';

  figure.append(codeHost, caption);
  section.append(figure, status);

  async function paint() {
    codeHost.replaceChildren();
    status.hidden = true;
    status.textContent = '';
    status.classList.remove('guide-protected-placeholder');

    if (isPrivateConfigLoading()) {
      status.hidden = false;
      status.textContent = 'Loading Wi‑Fi QR code…';
      return;
    }

    const ssid = getProtectedString('wifi.ssid');
    const password = getProtectedString('wifi.password');
    if (!ssid || !password) {
      status.hidden = false;
      status.textContent = PLACEHOLDER;
      status.classList.add('guide-protected-placeholder');
      return;
    }

    const payload = buildWifiQrPayload(ssid, password);
    if (!payload) {
      status.hidden = false;
      status.textContent = PLACEHOLDER;
      status.classList.add('guide-protected-placeholder');
      return;
    }

    try {
      const svg = await QRCode.toString(payload, {
        type: 'svg',
        margin: 2,
        width: 280,
        errorCorrectionLevel: 'H',
        color: { dark: '#111111', light: '#ffffff' }
      });
      const wrap = document.createElement('div');
      wrap.className = 'guide-wifi-qr-code';
      wrap.innerHTML = injectQrLogoBadge(svg, { logoHref: qrLogoUrl });
      const svgEl = wrap.querySelector('svg');
      if (svgEl) {
        svgEl.setAttribute('role', 'img');
        svgEl.setAttribute('aria-label', `QR code to join Wi-Fi network ${ssid}`);
      }
      codeHost.append(wrap);
    } catch {
      status.hidden = false;
      status.textContent = 'Could not generate Wi-Fi QR code.';
    }
  }

  void paint();
  subscribeToPrivateConfig(() => {
    void paint();
  });

  return section;
}
