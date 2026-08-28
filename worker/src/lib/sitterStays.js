import { parseEmailList, validateEmailList } from './emailLists.js';
import {
  computeStayWindowTimestamps,
  DEFAULT_ACCESS_GRACE_DAYS,
  DEFAULT_ACCESS_LEAD_DAYS,
  validateStayDateRange
} from './sitterStayWindows.js';

/** @typedef {'scheduled' | 'active' | 'completed' | 'cancelled'} SitterStayStatus */

/**
 * @typedef {Object} SitterStayRecord
 * @property {string} id
 * @property {string | null} label
 * @property {string[]} emails
 * @property {string} sitStart
 * @property {string} sitEnd
 * @property {number} accessOpensAt
 * @property {number} accessClosesAt
 * @property {number} secretsOpensAt
 * @property {number} secretsClosesAt
 * @property {SitterStayStatus} status
 * @property {number} createdAt
 * @property {number} updatedAt
 * @property {number} accessLeadDays
 * @property {number} accessGraceDays
 */

/**
 * @param {D1Database | undefined} db
 */
function requireDb(db) {
  if (!db) {
    throw new Error('HOUSE_GUIDE_DB is not configured');
  }
  return db;
}

/**
 * @param {Record<string, unknown>} row
 * @param {number} [nowSec]
 * @returns {SitterStayRecord}
 */
export function mapSitterStayRow(row, nowSec = Math.floor(Date.now() / 1000)) {
  /** @type {string[]} */
  let emails = [];
  try {
    const parsed = JSON.parse(String(row.emails_json ?? '[]'));
    emails = Array.isArray(parsed) ? parsed.map((email) => String(email).trim().toLowerCase()).filter(Boolean) : [];
  } catch {
    emails = [];
  }

  const storedStatus = String(row.status ?? 'scheduled');
  const status =
    storedStatus === 'cancelled'
      ? 'cancelled'
      : deriveStayStatus(
          {
            accessOpensAt: Number(row.access_opens_at),
            accessClosesAt: Number(row.access_closes_at)
          },
          nowSec
        );

  const sitStart = String(row.sit_start);
  const sitEnd = String(row.sit_end);
  const accessOpensAt = Number(row.access_opens_at);
  const accessClosesAt = Number(row.access_closes_at);

  return {
    id: String(row.id),
    label: row.label == null || row.label === '' ? null : String(row.label),
    emails,
    sitStart,
    sitEnd,
    accessOpensAt,
    accessClosesAt,
    secretsOpensAt: Number(row.secrets_opens_at),
    secretsClosesAt: Number(row.secrets_closes_at),
    status,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    accessLeadDays: inferLeadDays(sitStart, accessOpensAt),
    accessGraceDays: inferGraceDays(sitEnd, accessClosesAt)
  };
}

/**
 * @param {{ accessOpensAt: number, accessClosesAt: number }} stay
 * @param {number} nowSec
 * @returns {Exclude<SitterStayStatus, 'cancelled'>}
 */
export function deriveStayStatus(stay, nowSec) {
  if (nowSec >= stay.accessClosesAt) return 'completed';
  if (nowSec >= stay.accessOpensAt) return 'active';
  return 'scheduled';
}

/**
 * @param {string} sitStart
 * @param {number} accessOpensAt
 */
function inferLeadDays(sitStart, accessOpensAt) {
  const windows = computeStayWindowTimestamps(sitStart, sitStart, { accessLeadDays: 0, accessGraceDays: 0 });
  const sitStartSec = windows.secretsOpensAt;
  const diffSec = sitStartSec - accessOpensAt;
  const days = Math.max(0, Math.round(diffSec / 86400));
  return days || DEFAULT_ACCESS_LEAD_DAYS;
}

/**
 * @param {string} sitEnd
 * @param {number} accessClosesAt
 */
function inferGraceDays(sitEnd, accessClosesAt) {
  const windows = computeStayWindowTimestamps(sitEnd, sitEnd, { accessLeadDays: 0, accessGraceDays: 0 });
  const dayAfterSitEnd = windows.accessClosesAt;
  const diffSec = accessClosesAt - dayAfterSitEnd;
  const days = Math.max(0, Math.round(diffSec / 86400));
  return days || DEFAULT_ACCESS_GRACE_DAYS;
}

/**
 * @param {SitterStayRecord} stay
 * @param {number} nowSec
 */
export function isStayAccessWindowOpen(stay, nowSec) {
  if (stay.status === 'cancelled') return false;
  return nowSec >= stay.accessOpensAt && nowSec < stay.accessClosesAt;
}

/**
 * @param {SitterStayRecord} stay
 * @param {number} nowSec
 */
export function isStaySecretsWindowOpen(stay, nowSec) {
  if (stay.status === 'cancelled') return false;
  return nowSec >= stay.secretsOpensAt && nowSec < stay.secretsClosesAt;
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {number} [nowSec]
 */
export async function listSitterStays(env, nowSec = Math.floor(Date.now() / 1000)) {
  const db = env.HOUSE_GUIDE_DB;
  if (!db) return [];

  const result = await db
    .prepare(
      `SELECT id, label, emails_json, sit_start, sit_end, access_opens_at, access_closes_at,
              secrets_opens_at, secrets_closes_at, status, created_at, updated_at
       FROM sitter_stays
       ORDER BY access_opens_at ASC, created_at ASC`
    )
    .all();

  return (result.results ?? []).map((row) => mapSitterStayRow(row, nowSec));
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {string} id
 * @param {number} [nowSec]
 */
export async function getSitterStayById(env, id, nowSec = Math.floor(Date.now() / 1000)) {
  const db = env.HOUSE_GUIDE_DB;
  if (!db) return null;

  const row = await db
    .prepare(
      `SELECT id, label, emails_json, sit_start, sit_end, access_opens_at, access_closes_at,
              secrets_opens_at, secrets_closes_at, status, created_at, updated_at
       FROM sitter_stays WHERE id = ?`
    )
    .bind(id)
    .first();

  return row ? mapSitterStayRow(row, nowSec) : null;
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {number} nowSec
 */
export async function refreshSitterStayStatuses(env, nowSec = Math.floor(Date.now() / 1000)) {
  const db = requireDb(env.HOUSE_GUIDE_DB);
  const stays = await listSitterStays(env, nowSec);
  for (const stay of stays) {
    if (stay.status === 'cancelled') continue;
    const derived = deriveStayStatus(stay, nowSec);
    if (derived === 'completed') {
      await db
        .prepare(`UPDATE sitter_stays SET status = 'completed', updated_at = ? WHERE id = ? AND status != 'cancelled'`)
        .bind(nowSec, stay.id)
        .run();
    }
  }
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {Record<string, unknown>} input
 */
export async function createSitterStay(env, input) {
  const label = input.label == null || String(input.label).trim() === '' ? null : String(input.label).trim();
  const emails = parseEmailList(/** @type {string | string[]} */ (input.emails));
  const emailError = validateEmailList(emails, { required: true });
  if (emailError) return { ok: false, code: 'VALIDATION_ERROR', message: emailError };

  const sitStart = String(input.sitStart ?? '').trim();
  const sitEnd = String(input.sitEnd ?? '').trim();
  const dateError = validateStayDateRange(sitStart, sitEnd);
  if (dateError) return { ok: false, code: 'VALIDATION_ERROR', message: dateError };

  const accessLeadDays = normalizeDayCount(input.accessLeadDays, DEFAULT_ACCESS_LEAD_DAYS);
  const accessGraceDays = normalizeDayCount(input.accessGraceDays, DEFAULT_ACCESS_GRACE_DAYS);
  const windows = computeStayWindowTimestamps(sitStart, sitEnd, { accessLeadDays, accessGraceDays });

  const nowSec = Math.floor(Date.now() / 1000);
  const id = crypto.randomUUID();

  const db = requireDb(env.HOUSE_GUIDE_DB);
  await db
    .prepare(
      `INSERT INTO sitter_stays (
         id, label, emails_json, sit_start, sit_end,
         access_opens_at, access_closes_at, secrets_opens_at, secrets_closes_at,
         status, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)`
    )
    .bind(
      id,
      label,
      JSON.stringify(emails),
      sitStart,
      sitEnd,
      windows.accessOpensAt,
      windows.accessClosesAt,
      windows.secretsOpensAt,
      windows.secretsClosesAt,
      nowSec,
      nowSec
    )
    .run();

  return { ok: true, stay: await getSitterStayById(env, id, nowSec) };
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {string} id
 * @param {Record<string, unknown>} input
 */
export async function updateSitterStay(env, id, input) {
  const existing = await getSitterStayById(env, id);
  if (!existing) return { ok: false, code: 'NOT_FOUND', message: 'Stay not found.' };
  if (existing.status === 'cancelled') {
    return { ok: false, code: 'STAY_CANCELLED', message: 'Cancelled stays cannot be edited.' };
  }
  if (existing.status === 'completed') {
    return { ok: false, code: 'STAY_COMPLETED', message: 'Completed stays cannot be edited.' };
  }

  const label =
    input.label === undefined
      ? existing.label
      : input.label == null || String(input.label).trim() === ''
        ? null
        : String(input.label).trim();
  const emails = input.emails === undefined ? existing.emails : parseEmailList(/** @type {string | string[]} */ (input.emails));
  const emailError = validateEmailList(emails, { required: true });
  if (emailError) return { ok: false, code: 'VALIDATION_ERROR', message: emailError };

  const sitStart = input.sitStart === undefined ? existing.sitStart : String(input.sitStart).trim();
  const sitEnd = input.sitEnd === undefined ? existing.sitEnd : String(input.sitEnd).trim();
  const dateError = validateStayDateRange(sitStart, sitEnd);
  if (dateError) return { ok: false, code: 'VALIDATION_ERROR', message: dateError };

  const accessLeadDays =
    input.accessLeadDays === undefined ? existing.accessLeadDays : normalizeDayCount(input.accessLeadDays, existing.accessLeadDays);
  const accessGraceDays =
    input.accessGraceDays === undefined ? existing.accessGraceDays : normalizeDayCount(input.accessGraceDays, existing.accessGraceDays);
  const windows = computeStayWindowTimestamps(sitStart, sitEnd, { accessLeadDays, accessGraceDays });

  const nowSec = Math.floor(Date.now() / 1000);
  const db = requireDb(env.HOUSE_GUIDE_DB);
  await db
    .prepare(
      `UPDATE sitter_stays
       SET label = ?, emails_json = ?, sit_start = ?, sit_end = ?,
           access_opens_at = ?, access_closes_at = ?, secrets_opens_at = ?, secrets_closes_at = ?,
           status = 'scheduled', updated_at = ?
       WHERE id = ?`
    )
    .bind(
      label,
      JSON.stringify(emails),
      sitStart,
      sitEnd,
      windows.accessOpensAt,
      windows.accessClosesAt,
      windows.secretsOpensAt,
      windows.secretsClosesAt,
      nowSec,
      id
    )
    .run();

  return { ok: true, stay: await getSitterStayById(env, id, nowSec) };
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {string} id
 */
export async function cancelSitterStay(env, id) {
  const existing = await getSitterStayById(env, id);
  if (!existing) return { ok: false, code: 'NOT_FOUND', message: 'Stay not found.' };
  if (existing.status === 'cancelled') return { ok: true, stay: existing };
  if (existing.status === 'completed') {
    return { ok: false, code: 'STAY_COMPLETED', message: 'Completed stays cannot be cancelled.' };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const db = requireDb(env.HOUSE_GUIDE_DB);
  await db
    .prepare(`UPDATE sitter_stays SET status = 'cancelled', updated_at = ? WHERE id = ?`)
    .bind(nowSec, id)
    .run();

  return { ok: true, stay: await getSitterStayById(env, id, nowSec) };
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {string} id
 * @param {{ sitEnd?: string, accessGraceDays?: number }} input
 */
export async function extendSitterStay(env, id, input) {
  const existing = await getSitterStayById(env, id);
  if (!existing) return { ok: false, code: 'NOT_FOUND', message: 'Stay not found.' };
  if (existing.status === 'cancelled') {
    return { ok: false, code: 'STAY_CANCELLED', message: 'Cancelled stays cannot be extended.' };
  }
  if (existing.status === 'completed') {
    return { ok: false, code: 'STAY_COMPLETED', message: 'Completed stays cannot be extended.' };
  }

  const sitEnd = input.sitEnd === undefined ? existing.sitEnd : String(input.sitEnd).trim();
  const dateError = validateStayDateRange(existing.sitStart, sitEnd);
  if (dateError) return { ok: false, code: 'VALIDATION_ERROR', message: dateError };

  return updateSitterStay(env, id, {
    sitEnd,
    accessGraceDays: input.accessGraceDays ?? existing.accessGraceDays
  });
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {string} id
 */
export async function endSitterStayNow(env, id) {
  const existing = await getSitterStayById(env, id);
  if (!existing) return { ok: false, code: 'NOT_FOUND', message: 'Stay not found.' };
  if (existing.status === 'cancelled') return { ok: true, stay: existing };
  if (existing.status === 'completed') return { ok: true, stay: existing };

  const nowSec = Math.floor(Date.now() / 1000);
  const db = requireDb(env.HOUSE_GUIDE_DB);
  await db
    .prepare(
      `UPDATE sitter_stays
       SET access_closes_at = ?, secrets_closes_at = ?, status = 'completed', updated_at = ?
       WHERE id = ?`
    )
    .bind(nowSec, nowSec, nowSec, id)
    .run();

  return { ok: true, stay: await getSitterStayById(env, id, nowSec) };
}

/**
 * @param {string[]} manualEmails
 * @param {SitterStayRecord[]} stays
 * @param {number} nowSec
 */
export function computeEffectiveSitterEmails(manualEmails, stays, nowSec) {
  const merged = new Set(manualEmails.map((email) => email.trim().toLowerCase()).filter(Boolean));
  for (const stay of stays) {
    if (!isStayAccessWindowOpen(stay, nowSec)) continue;
    for (const email of stay.emails) {
      merged.add(email);
    }
  }
  return [...merged].sort();
}

/**
 * @param {boolean} manualDisclosed
 * @param {SitterStayRecord[]} stays
 * @param {number} nowSec
 */
export function computeEffectiveSitterSecrets(manualDisclosed, stays, nowSec) {
  if (manualDisclosed) return true;
  return stays.some((stay) => isStaySecretsWindowOpen(stay, nowSec));
}

/**
 * @param {unknown} value
 * @param {number} fallback
 */
function normalizeDayCount(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(90, Math.floor(parsed)));
}

/**
 * @typedef {{ sitStart: string, sitEnd: string }} SitterWelcomeStay
 */

/**
 * Stay dates for the sitter welcome card (no emails or owner-only fields).
 *
 * @param {{ email?: string, role?: string }} auth
 * @param {SitterStayRecord[]} stays
 * @param {number} nowSec
 * @returns {SitterWelcomeStay | null}
 */
export function resolveMyStayForWelcome(auth, stays, nowSec) {
  const inAccessWindow = stays.filter(
    (stay) =>
      stay.status !== 'cancelled' && nowSec >= stay.accessOpensAt && nowSec < stay.accessClosesAt
  );

  if (inAccessWindow.length === 0) return null;

  const email = String(auth.email ?? '')
    .trim()
    .toLowerCase();
  if (email) {
    const matched = inAccessWindow.find((stay) => stay.emails.includes(email));
    if (matched) {
      return { sitStart: matched.sitStart, sitEnd: matched.sitEnd };
    }
  }

  if (inAccessWindow.length === 1) {
    return { sitStart: inAccessWindow[0].sitStart, sitEnd: inAccessWindow[0].sitEnd };
  }

  return null;
}

/**
 * @param {SitterStayRecord} stay
 */
export function serializeSitterStayForApi(stay) {
  return {
    id: stay.id,
    label: stay.label,
    emails: stay.emails,
    sitStart: stay.sitStart,
    sitEnd: stay.sitEnd,
    accessLeadDays: stay.accessLeadDays,
    accessGraceDays: stay.accessGraceDays,
    accessOpensAt: stay.accessOpensAt,
    accessClosesAt: stay.accessClosesAt,
    secretsOpensAt: stay.secretsOpensAt,
    secretsClosesAt: stay.secretsClosesAt,
    status: stay.status,
    createdAt: stay.createdAt,
    updatedAt: stay.updatedAt
  };
}

/**
 * @param {Record<string, string | undefined>} env
 */
export async function clearSitterStays(env) {
  const db = env.HOUSE_GUIDE_DB;
  if (!db) return;
  await db.prepare(`DELETE FROM sitter_stays`).run();
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {Array<Record<string, unknown>>} stays
 */
export async function replaceSitterStaysFromBackup(env, stays) {
  await clearSitterStays(env);
  if (!Array.isArray(stays) || stays.length === 0) return;

  const db = requireDb(env.HOUSE_GUIDE_DB);
  const nowSec = Math.floor(Date.now() / 1000);
  for (const raw of stays) {
    const sitStart = String(raw.sitStart ?? '').trim();
    const sitEnd = String(raw.sitEnd ?? '').trim();
    if (!sitStart || !sitEnd) continue;
    const emails = parseEmailList(/** @type {string | string[]} */ (raw.emails));
    if (emails.length === 0) continue;
    const accessLeadDays = normalizeDayCount(raw.accessLeadDays, DEFAULT_ACCESS_LEAD_DAYS);
    const accessGraceDays = normalizeDayCount(raw.accessGraceDays, DEFAULT_ACCESS_GRACE_DAYS);
    const windows = computeStayWindowTimestamps(sitStart, sitEnd, { accessLeadDays, accessGraceDays });
    const id = String(raw.id ?? crypto.randomUUID());
    const status = raw.status === 'cancelled' ? 'cancelled' : 'scheduled';

    await db
      .prepare(
        `INSERT INTO sitter_stays (
           id, label, emails_json, sit_start, sit_end,
           access_opens_at, access_closes_at, secrets_opens_at, secrets_closes_at,
           status, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        raw.label == null || String(raw.label).trim() === '' ? null : String(raw.label).trim(),
        JSON.stringify(emails),
        sitStart,
        sitEnd,
        raw.accessOpensAt ?? windows.accessOpensAt,
        raw.accessClosesAt ?? windows.accessClosesAt,
        raw.secretsOpensAt ?? windows.secretsOpensAt,
        raw.secretsClosesAt ?? windows.secretsClosesAt,
        status,
        Number(raw.createdAt ?? nowSec),
        Number(raw.updatedAt ?? nowSec)
      )
      .run();
  }
}
