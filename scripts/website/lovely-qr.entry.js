/**
 * Entry point for website/vendor/lovely-qr.js — the marketing site is a plain
 * static upload with no build step, so the QR encoder is bundled here and
 * committed. Regenerate with: npm run build:website-qr
 */

import QRCode from 'qrcode';
import { injectQrLogoBadge } from '../../src/lib/qrLogoBadge.js';

/**
 * @param {string} text
 * @param {{ logoHref?: string, label?: string, width?: number, margin?: number }} [options]
 * @returns {Promise<string>} QR code SVG markup with a centred logo badge
 */
export async function toSvgWithBadge(text, options = {}) {
  const svg = await QRCode.toString(String(text), {
    type: 'svg',
    margin: options.margin ?? 2,
    width: options.width ?? 220,
    errorCorrectionLevel: 'H',
    color: { dark: '#171528', light: '#ffffff' }
  });

  return injectQrLogoBadge(svg, {
    logoHref: options.logoHref ?? '',
    label: options.label
  });
}
