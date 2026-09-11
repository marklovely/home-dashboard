/**
 * Branded HTML layout for Lovely Home transactional email (Resend).
 * Table-based, inline styles — matches lovely-home.co.uk palette.
 */

/** @type {const} */
export const EMAIL_BRAND = {
  bg: '#f4f1ea',
  bgSoft: '#e8e3d8',
  card: '#fbfaf6',
  text: '#1c241e',
  muted: '#5a6258',
  accent: '#2f5a43',
  accentBright: '#3f7a5c',
  border: 'rgba(28, 36, 30, 0.12)',
  fontSans:
    '"SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontDisplay: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif'
};

/**
 * @param {string} origin
 */
export function customerEmailLogoUrl(origin) {
  return `${String(origin).replace(/\/$/, '')}/favicon.png`;
}

/**
 * @param {unknown} value
 */
export function escapeHtmlEmail(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {string} href
 * @param {string} label
 */
export function emailTextLink(href, label) {
  const safeHref = escapeHtmlEmail(href);
  const safeLabel = escapeHtmlEmail(label);
  return `<a href="${safeHref}" style="color:${EMAIL_BRAND.accent};text-decoration:underline;">${safeLabel}</a>`;
}

/**
 * @param {string} text
 */
function emailParagraphHtml(text) {
  return `<p style="margin:0 0 16px;font-family:${EMAIL_BRAND.fontSans};font-size:16px;line-height:1.55;color:${EMAIL_BRAND.text};">${escapeHtmlEmail(text)}</p>`;
}

/**
 * @param {Array<{ label: string; href: string; primary?: boolean }>} actions
 */
function emailActionsHtml(actions) {
  if (!actions.length) return '';
  const rows = actions
    .map((action, index) => {
      const primary = action.primary !== false && index === 0;
      const bg = primary ? EMAIL_BRAND.accent : EMAIL_BRAND.card;
      const color = primary ? '#f4f1ea' : EMAIL_BRAND.text;
      const border = primary ? EMAIL_BRAND.accent : EMAIL_BRAND.border;
      return (
        `<tr><td align="center" style="padding:0 0 12px;">` +
        `<a href="${escapeHtmlEmail(action.href)}" style="display:inline-block;padding:14px 22px;font-family:${EMAIL_BRAND.fontSans};font-size:16px;font-weight:600;line-height:1.2;color:${color};background:${bg};border:1px solid ${border};border-radius:12px;text-decoration:none;">` +
        `${escapeHtmlEmail(action.label)}</a></td></tr>`
      );
    })
    .join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 4px;">${rows}</table>`;
}

/**
 * @param {{
 *   origin: string;
 *   preheader?: string;
 *   title: string;
 *   paragraphs?: string[];
 *   bodyHtml?: string;
 *   actions?: Array<{ label: string; href: string; primary?: boolean }>;
 *   footnote?: string;
 * }} input
 */
export function wrapBrandedCustomerEmail(input) {
  const origin = String(input.origin).replace(/\/$/, '');
  const logoUrl = customerEmailLogoUrl(origin);
  const preheader = escapeHtmlEmail(input.preheader || input.title);
  const paragraphs = (input.paragraphs ?? []).map(emailParagraphHtml).join('');
  const actions = emailActionsHtml(input.actions ?? []);
  const footnote = input.footnote
    ? `<p style="margin:16px 0 0;font-family:${EMAIL_BRAND.fontSans};font-size:14px;line-height:1.5;color:${EMAIL_BRAND.muted};">${escapeHtmlEmail(input.footnote)}</p>`
    : '';

  return (
    '<!DOCTYPE html>' +
    `<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>${escapeHtmlEmail(input.title)}</title></head>` +
    `<body style="margin:0;padding:0;background:${EMAIL_BRAND.bg};">` +
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${EMAIL_BRAND.bg};">` +
    `<tr><td align="center" style="padding:32px 16px;">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background:${EMAIL_BRAND.card};border:1px solid ${EMAIL_BRAND.border};border-radius:12px;overflow:hidden;">` +
    `<tr><td style="padding:28px 32px 12px;text-align:center;background:linear-gradient(180deg, ${EMAIL_BRAND.bgSoft} 0%, ${EMAIL_BRAND.card} 100%);">` +
    `<img src="${escapeHtmlEmail(logoUrl)}" width="48" height="48" alt="Lovely Home" style="display:block;margin:0 auto;border:0;">` +
    `<div style="margin-top:12px;font-family:${EMAIL_BRAND.fontDisplay};font-size:24px;line-height:1.2;color:${EMAIL_BRAND.accent};">Lovely Home</div>` +
    `<div style="margin-top:4px;font-family:${EMAIL_BRAND.fontSans};font-size:13px;color:${EMAIL_BRAND.muted};">Your private household hub</div>` +
    `</td></tr>` +
    `<tr><td style="padding:20px 32px 8px;">` +
    `<h1 style="margin:0 0 16px;font-family:${EMAIL_BRAND.fontDisplay};font-size:26px;line-height:1.25;color:${EMAIL_BRAND.text};">${escapeHtmlEmail(input.title)}</h1>` +
    paragraphs +
    (input.bodyHtml ?? '') +
    actions +
    footnote +
    `</td></tr>` +
    `<tr><td style="padding:20px 32px 28px;border-top:1px solid ${EMAIL_BRAND.border};font-family:${EMAIL_BRAND.fontSans};font-size:13px;line-height:1.5;color:${EMAIL_BRAND.muted};">` +
    `Questions? ${emailTextLink('mailto:support@lovely-home.co.uk', 'support@lovely-home.co.uk')} · ` +
    `${emailTextLink(origin, 'lovely-home.co.uk')}` +
    `</td></tr>` +
    `</table></td></tr></table></body></html>`
  );
}

/**
 * @param {{
 *   origin: string;
 *   code: string;
 *   accountUrl: string;
 * }} input
 */
export function buildBrandedAccountOtpEmail(input) {
  const code = String(input.code ?? '').trim();
  const accountUrl = String(input.accountUrl ?? '').trim();
  const origin = String(input.origin).replace(/\/$/, '');

  const text = [
    `Your Lovely Home sign-in code is ${code}.`,
    '',
    'It expires in 10 minutes. If you did not request this, you can ignore the email.',
    '',
    `Manage your hub: ${accountUrl}`
  ].join('\n');

  const codeHtml =
    `<div style="margin:0 0 20px;padding:18px 16px;text-align:center;background:${EMAIL_BRAND.bg};border:1px solid ${EMAIL_BRAND.border};border-radius:12px;">` +
    `<div style="font-family:${EMAIL_BRAND.fontSans};font-size:13px;letter-spacing:0.04em;text-transform:uppercase;color:${EMAIL_BRAND.muted};margin-bottom:8px;">Sign-in code</div>` +
    `<div style="font-family:${EMAIL_BRAND.fontSans};font-size:34px;font-weight:700;letter-spacing:0.22em;color:${EMAIL_BRAND.accent};">${escapeHtmlEmail(code)}</div>` +
    `</div>`;

  const html = wrapBrandedCustomerEmail({
    origin,
    preheader: `Your Lovely Home sign-in code is ${code}.`,
    title: 'Your account sign-in code',
    paragraphs: [
      'Enter this code on the account page to manage billing or your hub.',
      'It expires in 10 minutes. If you did not request this, you can ignore the email.'
    ],
    bodyHtml: codeHtml,
    actions: [{ label: 'Open account page', href: accountUrl, primary: true }]
  });

  return {
    subject: 'Your Lovely Home account code',
    text,
    html
  };
}
