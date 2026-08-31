/**
 * Centre-badge overlay for QR SVGs (Lovely Home mark in the middle of the code).
 *
 * Scanners tolerate a covered centre only when the code carries enough spare
 * error correction, so callers must render with errorCorrectionLevel 'H' and
 * keep the badge at or below QR_LOGO_BADGE_MAX_RATIO of the code width.
 */

export const QR_LOGO_BADGE_RATIO = 0.22;
export const QR_LOGO_BADGE_MAX_RATIO = 0.28;

/**
 * @param {string} svg
 * @returns {number | null} viewBox width of a square QR SVG
 */
export function parseQrSvgSize(svg) {
  const match = /viewBox="0 0 ([0-9.]+) ([0-9.]+)"/.exec(String(svg ?? ''));
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isFinite(width) || width <= 0 || width !== height) return null;
  return width;
}

/**
 * @param {string} svg QR code SVG produced with errorCorrectionLevel 'H'
 * @param {{ logoHref: string, ratio?: number, label?: string }} options
 * @returns {string} SVG with a centred logo badge, or the input when it cannot be placed
 */
export function injectQrLogoBadge(svg, options) {
  const source = String(svg ?? '');
  const logoHref = options?.logoHref?.trim();
  const size = parseQrSvgSize(source);
  if (!logoHref || size == null || !source.includes('</svg>')) {
    return source;
  }

  const ratio = Math.min(
    QR_LOGO_BADGE_MAX_RATIO,
    Number.isFinite(options.ratio) ? Number(options.ratio) : QR_LOGO_BADGE_RATIO
  );
  const card = round(size * ratio);
  const cardOffset = round((size - card) / 2);
  const pad = round(card * 0.12);
  const logoSize = round(card - pad * 2);
  const logoOffset = round(cardOffset + pad);
  const label = options.label ? escapeXml(options.label) : '';

  const badge =
    `<g${label ? ` role="img" aria-label="${label}"` : ' aria-hidden="true"'}>` +
    `<rect x="${cardOffset}" y="${cardOffset}" width="${card}" height="${card}" rx="${round(card * 0.2)}" fill="#ffffff"/>` +
    `<image x="${logoOffset}" y="${logoOffset}" width="${logoSize}" height="${logoSize}" href="${escapeXml(logoHref)}" preserveAspectRatio="xMidYMid meet"/>` +
    '</g>';

  return source.replace('</svg>', `${badge}</svg>`);
}

/** @param {number} value */
function round(value) {
  return Math.round(value * 1000) / 1000;
}

/** @param {string} value */
function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
