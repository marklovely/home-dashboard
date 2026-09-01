import { describe, expect, it, vi } from 'vitest';
import {
  ACCOUNT_GENERIC_OTP_MESSAGE,
  ACCOUNT_OTP_MAX_ATTEMPTS,
  generateAccountOtpCode,
  handleAccountOtpRequest,
  handleAccountPortal,
  handleAccountVerify,
  hashAccountSecret,
  normalizeAccountEmail,
  publicAccountHubFromRow,
  timingSafeEqual
} from '../functions/api/platform/platformPublicAccount.js';

function createAccountDb(hubs = []) {
  /** @type {Map<string, Record<string, unknown>>} */
  const challenges = new Map();
  /** @type {Map<string, Record<string, unknown>>} */
  const sessions = new Map();
  /** @type {Map<string, { attempts: number }>} */
  const attempts = new Map();

  return {
    hubs,
    challenges,
    sessions,
    prepare(sql) {
      /** @type {unknown[]} */
      let bound = [];
      return {
        bind(...args) {
          bound = args;
          return this;
        },
        async run() {
          if (sql.includes('DELETE FROM account_otp_challenges WHERE expires_at')) {
            const now = Number(bound[0]);
            for (const [email, row] of [...challenges.entries()]) {
              if (Number(row.expires_at) <= now) challenges.delete(email);
            }
          }
          if (sql.includes('DELETE FROM account_sessions WHERE expires_at')) {
            const now = Number(bound[0]);
            for (const [hash, row] of [...sessions.entries()]) {
              if (Number(row.expires_at) <= now) sessions.delete(hash);
            }
          }
          if (sql.includes('INSERT INTO signup_attempts')) {
            const key = `${bound[0]}:${bound[1]}`;
            const current = attempts.get(key) ?? { attempts: 0 };
            current.attempts += 1;
            attempts.set(key, current);
          }
          if (sql.includes('INSERT INTO account_otp_challenges')) {
            challenges.set(String(bound[0]), {
              email: bound[0],
              code_hash: bound[1],
              expires_at: bound[2],
              attempts: 0,
              sent_at: bound[3]
            });
          }
          if (sql.includes('DELETE FROM account_otp_challenges WHERE email')) {
            challenges.delete(String(bound[0]));
          }
          if (sql.includes('UPDATE account_otp_challenges SET attempts')) {
            const row = challenges.get(String(bound[0]));
            if (row) row.attempts = Number(row.attempts ?? 0) + 1;
          }
          if (sql.includes('INSERT INTO account_sessions')) {
            sessions.set(String(bound[0]), {
              token_hash: bound[0],
              email: bound[1],
              expires_at: bound[2]
            });
          }
          return { meta: { changes: 1 } };
        },
        async first() {
          if (sql.includes('SELECT attempts FROM signup_attempts')) {
            const key = `${bound[0]}:${bound[1]}`;
            return attempts.get(key) ?? { attempts: 1 };
          }
          if (sql.includes('FROM account_otp_challenges WHERE email')) {
            return challenges.get(String(bound[0])) ?? null;
          }
          if (sql.includes('FROM account_sessions WHERE token_hash')) {
            return sessions.get(String(bound[0])) ?? null;
          }
          return null;
        },
        async all() {
          if (sql.includes('FROM site_billing WHERE lower(owner_email)')) {
            const email = String(bound[0]);
            return {
              results: hubs.filter((hub) => String(hub.owner_email).toLowerCase() === email)
            };
          }
          return { results: [] };
        }
      };
    }
  };
}

const env = {
  RESEND_API_KEY: 're_test',
  STRIPE_SECRET_KEY: 'sk_test',
  STRIPE_WEBHOOK_SECRET: 'whsec_test',
  STRIPE_PRICE_ID: 'price_month',
  MARKETING_SITE_ORIGIN: 'https://lovely-home.co.uk'
};

describe('public account helpers', () => {
  it('normalises email and pads OTP codes', () => {
    expect(normalizeAccountEmail('  Owner@Example.COM ')).toBe('owner@example.com');
    expect(generateAccountOtpCode(42)).toBe('000042');
    expect(timingSafeEqual('abc', 'abc')).toBe(true);
    expect(timingSafeEqual('abc', 'abd')).toBe(false);
  });

  it('does not expose Stripe customer ids on the public hub payload', () => {
    expect(
      publicAccountHubFromRow({
        site_id: 'kitchen-home',
        status: 'trialing',
        trial_end: 1_700_000_000_000,
        stripe_customer_id: 'cus_secret',
        owner_email: 'owner@example.com'
      })
    ).toEqual({
      siteId: 'kitchen-home',
      hubUrl: 'https://kitchen-home.lovely-hub.com',
      status: 'trialing',
      trialEnd: 1_700_000_000_000,
      canManageBilling: true
    });
  });
});

describe('account OTP and portal', () => {
  it('does not reveal whether an email has a hub', async () => {
    const db = createAccountDb([]);
    const sendEmail = vi.fn(async () => ({ ok: true, id: 'email_1' }));
    const result = await handleAccountOtpRequest(
      env,
      /** @type {D1Database} */ (db),
      { email: 'nobody@example.com', clientIp: '203.0.113.10' },
      { sendEmail, generateCode: () => '123456' }
    );
    expect(result.status).toBe(200);
    expect(result.body.message).toBe(ACCOUNT_GENERIC_OTP_MESSAGE);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('emails a code then opens a Stripe portal after verify', async () => {
    const db = createAccountDb([
      {
        site_id: 'kitchen-home',
        status: 'trialing',
        trial_end: 1_700_000_000_000,
        stripe_customer_id: 'cus_kitchen',
        owner_email: 'owner@example.com'
      }
    ]);
    const sendEmail = vi.fn(async () => ({ ok: true, id: 'email_2' }));
    const otp = await handleAccountOtpRequest(
      env,
      /** @type {D1Database} */ (db),
      { email: 'owner@example.com', clientIp: '203.0.113.10' },
      { sendEmail, generateCode: () => '654321' }
    );
    expect(otp.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][1].text).toContain('654321');

    const verified = await handleAccountVerify(env, /** @type {D1Database} */ (db), {
      email: 'owner@example.com',
      code: '654321'
    });
    expect(verified.status).toBe(200);
    expect(verified.body.hubs).toEqual([
      {
        siteId: 'kitchen-home',
        hubUrl: 'https://kitchen-home.lovely-hub.com',
        status: 'trialing',
        trialEnd: 1_700_000_000_000,
        canManageBilling: true
      }
    ]);

    const stripeRequest = vi.fn(async () => ({ url: 'https://billing.stripe.com/session/test' }));
    const portal = await handleAccountPortal(
      env,
      /** @type {D1Database} */ (db),
      { sessionToken: String(verified.body.sessionToken), siteId: 'kitchen-home' },
      { stripeRequest }
    );
    expect(portal.status).toBe(200);
    expect(portal.body.url).toBe('https://billing.stripe.com/session/test');
    expect(stripeRequest).toHaveBeenCalledWith('sk_test', 'POST', '/billing_portal/sessions', {
      customer: 'cus_kitchen',
      return_url: 'https://lovely-home.co.uk/account.html'
    });
  });

  it('rejects a wrong code without opening a session', async () => {
    const db = createAccountDb([
      {
        site_id: 'kitchen-home',
        status: 'trialing',
        stripe_customer_id: 'cus_kitchen',
        owner_email: 'owner@example.com'
      }
    ]);
    await handleAccountOtpRequest(
      env,
      /** @type {D1Database} */ (db),
      { email: 'owner@example.com', clientIp: '203.0.113.11' },
      { sendEmail: async () => ({ ok: true, id: 'x' }), generateCode: () => '111111' }
    );
    const wrong = await handleAccountVerify(env, /** @type {D1Database} */ (db), {
      email: 'owner@example.com',
      code: '000000'
    });
    expect(wrong.status).toBe(401);
    expect(db.sessions.size).toBe(0);
  });

  it('locks out after too many wrong codes', async () => {
    const db = createAccountDb([
      {
        site_id: 'kitchen-home',
        status: 'trialing',
        stripe_customer_id: 'cus_kitchen',
        owner_email: 'owner@example.com'
      }
    ]);
    await handleAccountOtpRequest(
      env,
      /** @type {D1Database} */ (db),
      { email: 'owner@example.com', clientIp: '203.0.113.12' },
      { sendEmail: async () => ({ ok: true, id: 'x' }), generateCode: () => '222222' }
    );
    for (let i = 0; i < ACCOUNT_OTP_MAX_ATTEMPTS; i += 1) {
      await handleAccountVerify(env, /** @type {D1Database} */ (db), {
        email: 'owner@example.com',
        code: '000000'
      });
    }
    const locked = await handleAccountVerify(env, /** @type {D1Database} */ (db), {
      email: 'owner@example.com',
      code: '222222'
    });
    expect(locked.status).toBe(401);
  });
});

describe('account secret hashing', () => {
  it('hashes the same value the same way', async () => {
    const a = await hashAccountSecret('owner@example.com:123456');
    const b = await hashAccountSecret('owner@example.com:123456');
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });
});
