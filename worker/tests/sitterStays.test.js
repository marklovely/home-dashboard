import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  computeEffectiveSitterEmails,
  computeEffectiveSitterSecrets,
  createSitterStay,
  endSitterStayNow,
  listSitterStays,
  resolveMyStayForWelcome
} from '../src/lib/sitterStays.js';
import { computeStayWindowTimestamps } from '../src/lib/sitterStayWindows.js';
import { applySitterStaySchedule, getEffectiveSitterAccessState } from '../src/lib/sitterSchedule.js';
import { setSitterAccessEmails, setSitterSecretsManual } from '../src/lib/houseSettings.js';
import { handleHouseSettingsGet } from '../src/routes/houseSettingsRoute.js';
import { handleSitterStaysCollection } from '../src/routes/sitterStaysRoute.js';
import {
  createAccessTestEnv,
  signTestAccessJwt,
  withAccessJwt
} from './accessTestHelpers.js';
import { withTestLimiters } from './testEnv.js';
import { createInMemoryHouseSettingsDb } from './mocks/houseSettingsStorage.js';

function createEnv(overrides = {}) {
  return withTestLimiters(
    createAccessTestEnv({
      HOUSE_GUIDE_DB: createInMemoryHouseSettingsDb(),
      ...overrides
    })
  );
}

describe('sitter stay windows', () => {
  it('opens access lead days before sit and closes after grace', () => {
    const windows = computeStayWindowTimestamps('2026-03-12', '2026-03-19', {
      accessLeadDays: 7,
      accessGraceDays: 1
    });
    expect(windows.accessOpensAt).toBeLessThan(windows.secretsOpensAt);
    expect(windows.secretsClosesAt).toBe(windows.accessClosesAt);
    expect(windows.accessClosesAt).toBeGreaterThan(windows.secretsOpensAt);
  });
});

describe('sitter stays schedule', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-10T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('merges manual and scheduled emails for active access window', async () => {
    const env = createEnv();
    await setSitterAccessEmails(env, ['permanent@example.com']);
    await createSitterStay(env, {
      emails: ['sitter@example.com'],
      sitStart: '2026-03-12',
      sitEnd: '2026-03-19'
    });

    const state = await getEffectiveSitterAccessState(env);
    expect(state.effectiveEmails).toEqual(['permanent@example.com', 'sitter@example.com']);
    expect(state.effectiveSecrets).toBe(false);
  });

  it('opens secrets during sit dates even when manual toggle is off', async () => {
    const env = createEnv();
    await setSitterSecretsManual(env, false);
    await createSitterStay(env, {
      emails: ['sitter@example.com'],
      sitStart: '2026-03-10',
      sitEnd: '2026-03-19'
    });

    vi.setSystemTime(new Date('2026-03-11T12:00:00.000Z'));
    const state = await getEffectiveSitterAccessState(env);
    expect(state.effectiveSecrets).toBe(true);
  });

  it('removes scheduled email after stay ends', async () => {
    const env = createEnv();
    const created = await createSitterStay(env, {
      emails: ['sitter@example.com'],
      sitStart: '2026-03-01',
      sitEnd: '2026-03-05'
    });
    expect(created.ok).toBe(true);

    vi.setSystemTime(new Date('2026-03-20T12:00:00.000Z'));
    const state = await getEffectiveSitterAccessState(env);
    expect(state.effectiveEmails).toEqual([]);
    expect(state.effectiveSecrets).toBe(false);
  });

  it('end now closes access immediately', async () => {
    const env = createEnv();
    const created = await createSitterStay(env, {
      emails: ['sitter@example.com'],
      sitStart: '2026-03-10',
      sitEnd: '2026-03-19'
    });
    const ended = await endSitterStayNow(env, created.stay.id);
    expect(ended.ok).toBe(true);
    expect(ended.stay?.status).toBe('completed');

    const state = await getEffectiveSitterAccessState(env);
    expect(state.effectiveEmails).toEqual([]);
    expect(state.effectiveSecrets).toBe(false);
  });

  it('returns stays on house settings payload', async () => {
    const env = createEnv();
    await createSitterStay(env, {
      label: 'March sit',
      emails: ['sitter@example.com'],
      sitStart: '2026-03-12',
      sitEnd: '2026-03-19'
    });
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const response = await handleHouseSettingsGet(
      new Request('https://worker.test/api/house-settings', withAccessJwt(jwt)),
      env
    );
    const body = await response.json();
    expect(body.sitterStays).toHaveLength(1);
    expect(body.sitterSecretsManual).toBe(false);
    expect(body.sitterAccessEmailsManual).toEqual([]);
  });

  it('owner can create a stay via API', async () => {
    const env = createEnv();
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const response = await handleSitterStaysCollection(
      new Request(
        'https://worker.test/api/house-settings/sitter-stays',
        withAccessJwt(jwt, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emails: ['guest@example.com'],
            sitStart: '2026-04-01',
            sitEnd: '2026-04-07'
          })
        })
      ),
      env
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.stay.emails).toEqual(['guest@example.com']);
    expect(await listSitterStays(env)).toHaveLength(1);
  });

  it('apply schedule sync attempts Access when configured', async () => {
    const env = createEnv();
    await createSitterStay(env, {
      emails: ['sitter@example.com'],
      sitStart: '2026-03-10',
      sitEnd: '2026-03-12'
    });
    const result = await applySitterStaySchedule(env);
    expect(result.ok).toBe(false);
    expect(result.syncResult?.code).toBe('ACCESS_SYNC_NOT_CONFIGURED');
  });
});

describe('computeEffective helpers', () => {
  const stay = {
    id: '1',
    label: null,
    emails: ['sitter@example.com'],
    sitStart: '2026-03-10',
    sitEnd: '2026-03-12',
    accessOpensAt: 100,
    accessClosesAt: 500,
    secretsOpensAt: 200,
    secretsClosesAt: 400,
    status: 'active',
    createdAt: 1,
    updatedAt: 1,
    accessLeadDays: 7,
    accessGraceDays: 1
  };

  it('unions manual and active stay emails', () => {
    expect(computeEffectiveSitterEmails(['owner-sitter@example.com'], [stay], 150)).toEqual([
      'owner-sitter@example.com',
      'sitter@example.com'
    ]);
  });

  it('uses manual OR scheduled secrets', () => {
    expect(computeEffectiveSitterSecrets(false, [stay], 250)).toBe(true);
    expect(computeEffectiveSitterSecrets(false, [stay], 450)).toBe(false);
    expect(computeEffectiveSitterSecrets(true, [stay], 450)).toBe(true);
  });
});

describe('resolveMyStayForWelcome', () => {
  const stay = {
    id: '1',
    label: null,
    emails: ['sitter@example.com'],
    sitStart: '2026-03-12',
    sitEnd: '2026-03-19',
    accessOpensAt: 100,
    accessClosesAt: 500,
    secretsOpensAt: 200,
    secretsClosesAt: 400,
    status: 'active',
    createdAt: 1,
    updatedAt: 1,
    accessLeadDays: 7,
    accessGraceDays: 1
  };

  it('matches the logged-in sitter email', () => {
    expect(
      resolveMyStayForWelcome({ email: 'sitter@example.com', role: 'house-sitter' }, [stay], 150)
    ).toEqual({ sitStart: '2026-03-12', sitEnd: '2026-03-19' });
  });

  it('returns the only in-window stay for tablet sitter mode', () => {
    expect(resolveMyStayForWelcome({ email: 'owner@example.com', role: 'owner' }, [stay], 150)).toEqual({
      sitStart: '2026-03-12',
      sitEnd: '2026-03-19'
    });
  });

  it('returns null when no stay is in the access window', () => {
    expect(resolveMyStayForWelcome({ email: 'sitter@example.com', role: 'house-sitter' }, [stay], 50)).toBeNull();
  });
});
