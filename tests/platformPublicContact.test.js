import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SUPPORT_INBOX,
  buildSupportContactEmail,
  handlePublicContact,
  parsePublicContactInput,
  publicContactStatus,
  supportInboxEmail,
  validatePublicContactInput
} from '../functions/api/platform/platformPublicContact.js';
import { RESEND_EMAILS_URL } from '../functions/api/platform/platformCustomerEmail.js';

describe('public support contact', () => {
  it('reads the support inbox from env or the from-address', () => {
    expect(supportInboxEmail({})).toBe(DEFAULT_SUPPORT_INBOX);
    expect(supportInboxEmail({ SUPPORT_INBOX_EMAIL: 'hello@lovely-home.co.uk' })).toBe(
      'hello@lovely-home.co.uk'
    );
    expect(supportInboxEmail({ CUSTOMER_EMAIL_FROM: 'Lovely Home <ops@lovely-home.co.uk>' })).toBe(
      'ops@lovely-home.co.uk'
    );
  });

  it('advertises whether Resend is configured', () => {
    expect(publicContactStatus({})).toEqual({ enabled: false, turnstileSiteKey: null });
    expect(publicContactStatus({ RESEND_API_KEY: 're_test', TURNSTILE_SITE_KEY: 'site' })).toEqual({
      enabled: true,
      turnstileSiteKey: 'site'
    });
  });

  it('rejects empty messages and treats the honeypot as a silent success', () => {
    expect(validatePublicContactInput(parsePublicContactInput({ name: 'Ada' }))).toMatchObject({
      error: 'INVALID_EMAIL'
    });
    expect(
      validatePublicContactInput(
        parsePublicContactInput({
          name: 'Ada',
          email: 'ada@example.com',
          subject: 'Help',
          message: 'Too short'
        })
      )
    ).toMatchObject({ error: 'INVALID_MESSAGE' });
    expect(
      validatePublicContactInput(
        parsePublicContactInput({
          name: 'Ada',
          email: 'ada@example.com',
          subject: 'Help',
          message: 'Please help with my hub.',
          website: 'https://spam.test'
        })
      )
    ).toMatchObject({ error: 'IGNORED' });
  });

  it('sends mail to the inbox with the visitor as reply-to', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: 'email_contact' })
    }));
    const result = await handlePublicContact(
      { RESEND_API_KEY: 're_test' },
      {
        body: {
          name: 'Ada Lovelace',
          email: 'ada@example.com',
          hub: 'smith.lovely-hub.com',
          subject: 'Bins reminder',
          message: 'The collection dates look a week out.'
        },
        fetchImpl: /** @type {typeof fetch} */ (fetchImpl)
      }
    );

    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);
    const payload = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(fetchImpl.mock.calls[0][0]).toBe(RESEND_EMAILS_URL);
    expect(payload.to).toEqual([DEFAULT_SUPPORT_INBOX]);
    expect(payload.reply_to).toEqual(['ada@example.com']);
    expect(payload.subject).toBe('Support: Bins reminder');
    expect(payload.text).toContain('smith.lovely-hub.com');
  });

  it('builds a readable support email body', () => {
    const built = buildSupportContactEmail(
      parsePublicContactInput({
        name: 'Ada',
        email: 'ada@example.com',
        subject: 'Hello',
        message: 'Need a hand with setup.'
      })
    );
    expect(built.subject).toBe('Support: Hello');
    expect(built.text).toContain('(not given)');
  });
});
