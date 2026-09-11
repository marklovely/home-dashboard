import { describe, expect, it } from 'vitest';
import {
  buildBrandedAccountOtpEmail,
  brandedEmailLogoAttachment,
  EMAIL_BRAND,
  EMAIL_LOGO_CONTENT_ID,
  wrapBrandedCustomerEmail
} from '../functions/api/platform/platformCustomerEmailLayout.js';
import { buildCustomerEmail, buildReferrerRewardEmail } from '../functions/api/platform/platformCustomerEmail.js';

describe('branded customer email layout', () => {
  it('embeds the logo via CID (marketing site is Access-gated)', () => {
    const html = wrapBrandedCustomerEmail({
      origin: 'https://lovely-home.co.uk',
      title: 'Test title',
      preheader: 'Preview text',
      paragraphs: ['Hello there.']
    });
    expect(html).toContain(`cid:${EMAIL_LOGO_CONTENT_ID}`);
    expect(html).toContain('width="120"');
    expect(html).toMatch(/table[^>]+align="center"[^>]+width="120"/);
    expect(html).toContain('align="middle"');
    expect(html).not.toContain('favicon.png');
    expect(html).toContain(EMAIL_BRAND.accent);
    expect(html).toContain(EMAIL_BRAND.bg);
    expect(html).toContain('Lovely Home');
    expect(html).toContain('Test title');
    expect(html).toContain('Hello there.');
    const attachment = brandedEmailLogoAttachment();
    expect(attachment.content_id).toBe(EMAIL_LOGO_CONTENT_ID);
    expect(attachment.content.length).toBeGreaterThan(100);
  });

  it('renders bulletproof primary and secondary buttons', () => {
    const html = wrapBrandedCustomerEmail({
      origin: 'https://lovely-home.co.uk',
      title: 'Actions',
      paragraphs: ['Choose one.'],
      actions: [
        { label: 'Primary', href: 'https://example.com/primary', primary: true },
        { label: 'Secondary', href: 'https://example.com/secondary', primary: false }
      ]
    });
    expect(html).toContain('https://example.com/primary');
    expect(html).toContain('https://example.com/secondary');
    expect(html).toContain(`bgcolor="${EMAIL_BRAND.accent}"`);
    expect(html).toContain(`bgcolor="${EMAIL_BRAND.card}"`);
    expect(html).toContain('font-weight:700');
  });

  it('builds lifecycle emails with html and plain-text fallbacks', () => {
    const mail = buildCustomerEmail({ kind: 'upgrade', siteId: 'rose-cottage' });
    expect(mail.html).toBeTruthy();
    expect(mail.text).toMatch(/Lovely Home\+/);
    expect(mail.html).toContain('rose-cottage.lovely-hub.com');
    expect(mail.html).toContain('Open your hub');
  });

  it('builds branded OTP mail with a prominent code', () => {
    const mail = buildBrandedAccountOtpEmail({
      origin: 'https://lovely-home.co.uk',
      code: '123456',
      accountUrl: 'https://lovely-home.co.uk/account'
    });
    expect(mail.html).toContain('123456');
    expect(mail.html).toContain('Sign-in code');
    expect(mail.text).toContain('123456');
  });

  it('builds branded referral reward mail', () => {
    const mail = buildReferrerRewardEmail({
      referrerSiteId: 'kitchen-home',
      creditPence: 500
    });
    expect(mail.html).toContain('Referral credit added');
    expect(mail.html).toContain('£5.00');
  });
});
