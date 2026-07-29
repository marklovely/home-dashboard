import { describe, expect, it, vi } from 'vitest';
import { handleRequest } from '../src/index.js';
import { buildPrivateConfig } from '../src/routes/privateConfig.js';
import { isAllowedButtonCode, normalizeButtonCode } from '../src/lib/buttonAllowlist.js';
import { resolveCorsOrigin } from '../src/lib/cors.js';

const env = {
  VIRTUAL_BUTTONS_ACCESS_CODE: 'test-access-code',
  ALLOWED_ORIGINS: 'https://app.example,http://localhost:5173',
  PRIVATE_WIFI_SSID: 'Net',
  PRIVATE_WIFI_PASSWORD: 'Pass',
  PRIVATE_MARK_PHONE: '111',
  PRIVATE_MARK_EMAIL: 'mark@example.com',
  PRIVATE_DONNA_PHONE: '222',
  PRIVATE_DONNA_EMAIL: 'donna@example.com',
  PRIVATE_HOME_ADDRESS: '1 Road'
};

describe('health', () => {
  it('returns ok status', async () => {
    const response = await handleRequest(new Request('https://worker.test/api/health'), env);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toEqual({ status: 'ok', service: 'lovely-home-hub-api' });
    expect(JSON.stringify(body)).not.toContain('test-access-code');
  });
});

describe('buttons', () => {
  it('accepts known button codes', async () => {
    expect(isAllowedButtonCode('VB01')).toBe(true);
    expect(normalizeButtonCode('vb9')).toBe('VB09');
  });

  it('rejects unknown buttons', async () => {
    const response = await handleRequest(
      new Request('https://worker.test/api/button/VB99', { method: 'POST' }),
      env
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe('UNKNOWN_BUTTON');
    expect(JSON.stringify(body)).not.toContain('test-access-code');
  });

  it('calls upstream with server-side access code', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const response = await handleRequest(
      new Request('https://worker.test/api/button/VB01', { method: 'POST' }),
      env,
      fetchImpl
    );
    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledOnce();
    const url = String(fetchImpl.mock.calls[0][0]);
    expect(url).toContain('accessCode=test-access-code');
    expect(url).toContain('virtualButton=1');
  });
});

describe('private-config', () => {
  it('returns expected shape without lockbox', async () => {
    const payload = buildPrivateConfig(env);
    expect(payload.wifi.ssid).toBe('Net');
    expect(payload.contacts.mark.phone).toBe('111');
    expect(payload.home.address).toBe('1 Road');
    expect(payload).not.toHaveProperty('lockbox');
  });

  it('omits missing optional fields safely', () => {
    const payload = buildPrivateConfig({});
    expect(payload.wifi).toEqual({});
    expect(payload.contacts.mark.name).toBe('Mark Lovely');
  });
});

describe('cors', () => {
  it('allows configured origins', () => {
    expect(resolveCorsOrigin('http://localhost:5173', env.ALLOWED_ORIGINS)).toBe('http://localhost:5173');
  });

  it('rejects unknown origins', () => {
    expect(resolveCorsOrigin('https://evil.example', env.ALLOWED_ORIGINS)).toBeNull();
  });

  it('blocks disallowed browser origin on private-config', async () => {
    const response = await handleRequest(
      new Request('https://worker.test/api/private-config', {
        headers: { Origin: 'https://evil.example' }
      }),
      env
    );
    expect(response.status).toBe(403);
  });
});

describe('owner auth', () => {
  it('returns 501 until server-side auth is implemented', async () => {
    const response = await handleRequest(
      new Request('https://worker.test/api/auth/owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: '1234' })
      }),
      env
    );
    expect(response.status).toBe(501);
    const body = await response.json();
    expect(body.error.code).toBe('NOT_IMPLEMENTED');
    expect(JSON.stringify(body)).not.toContain('1234');
  });
});
