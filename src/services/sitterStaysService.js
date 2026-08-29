import { sitterStayApiErrorMessage } from '../lib/sitterStayApiErrors.js';
import { sitterStayAccessSyncWarning } from '../lib/sitterStayAccessSyncMessage.js';
import { fetchHouseSettings } from '../api/houseSettingsApi.js';
import {
  postSitterStay,
  postSitterStayCancel,
  postSitterStayEndNow,
  postSitterStayExtend,
  putSitterStay
} from '../api/sitterStaysApi.js';
import { applySitterAccessEmails } from './sitterAccessEmailsService.js';
import { applySitterSecretsFromPayload } from './sitterSecretsService.js';

/** @typedef {import('../api/sitterStaysApi.js').SitterStayPayload} SitterStayPayload */

/** @type {SitterStayPayload[] | null} */
let sitterStays = null;

/** @type {Set<() => void>} */
const listeners = new Set();

/** @param {() => void} listener */
export function subscribeToSitterStays(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function getSitterStays() {
  return sitterStays;
}

/**
 * @param {SitterStayPayload[] | null | undefined} stays
 */
export function applySitterStays(stays) {
  const next = Array.isArray(stays) ? stays : [];
  if (JSON.stringify(sitterStays) === JSON.stringify(next)) return;
  sitterStays = next;
  notify();
}

/**
 * @param {typeof fetch} [fetchImpl]
 */
export async function syncSitterStaysFromServer(fetchImpl = fetch) {
  const result = await fetchHouseSettings(fetchImpl);
  if (!result.ok) return false;
  applySitterStays(result.data.sitterStays);
  applySitterSecretsFromPayload(result.data);
  applySitterAccessEmails(result.data.sitterAccessEmailsManual ?? result.data.sitterAccessEmails, result.data.accessSitterSyncConfigured);
  return true;
}

/**
 * @param {Record<string, unknown>} body
 * @param {typeof fetch} [fetchImpl]
 */
export async function createSitterStay(body, fetchImpl = fetch) {
  const result = await postSitterStay(body, fetchImpl);
  if (!result.ok) {
    return {
      ok: false,
      message: sitterStayApiErrorMessage(result.data, 'Could not schedule sitter stay.')
    };
  }
  await syncSitterStaysFromServer(fetchImpl);
  const accessWarning = sitterStayAccessSyncWarning(result.data ?? {});
  return { ok: true, stay: result.data?.stay ?? null, accessWarning };
}

/**
 * @param {string} id
 * @param {Record<string, unknown>} body
 * @param {typeof fetch} [fetchImpl]
 */
export async function updateSitterStay(id, body, fetchImpl = fetch) {
  const result = await putSitterStay(id, body, fetchImpl);
  if (!result.ok) {
    return {
      ok: false,
      message: sitterStayApiErrorMessage(result.data, 'Could not update sitter stay.')
    };
  }
  await syncSitterStaysFromServer(fetchImpl);
  const accessWarning = sitterStayAccessSyncWarning(result.data ?? {});
  return { ok: true, stay: result.data?.stay ?? null, accessWarning };
}

/**
 * @param {string} id
 * @param {typeof fetch} [fetchImpl]
 */
export async function cancelSitterStay(id, fetchImpl = fetch) {
  const result = await postSitterStayCancel(id, fetchImpl);
  if (!result.ok) {
    return {
      ok: false,
      message: sitterStayApiErrorMessage(result.data, 'Could not cancel sitter stay.')
    };
  }
  await syncSitterStaysFromServer(fetchImpl);
  return { ok: true };
}

/**
 * @param {string} id
 * @param {{ sitEnd?: string, accessGraceDays?: number }} body
 * @param {typeof fetch} [fetchImpl]
 */
export async function extendSitterStay(id, body, fetchImpl = fetch) {
  const result = await postSitterStayExtend(id, body, fetchImpl);
  if (!result.ok) {
    return {
      ok: false,
      message: sitterStayApiErrorMessage(result.data, 'Could not extend sitter stay.')
    };
  }
  await syncSitterStaysFromServer(fetchImpl);
  return { ok: true, stay: result.data?.stay ?? null };
}

/**
 * @param {string} id
 * @param {typeof fetch} [fetchImpl]
 */
export async function endSitterStayNow(id, fetchImpl = fetch) {
  const result = await postSitterStayEndNow(id, fetchImpl);
  if (!result.ok) {
    return {
      ok: false,
      message: sitterStayApiErrorMessage(result.data, 'Could not end sitter stay.')
    };
  }
  await syncSitterStaysFromServer(fetchImpl);
  return { ok: true };
}

/** @param {SitterStayPayload} stay */
export function formatStayStatusLabel(stay) {
  switch (stay.status) {
    case 'scheduled':
      return 'Scheduled';
    case 'active':
      return 'Active';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return stay.status;
  }
}

/** @param {string} isoDate YYYY-MM-DD */
export function formatStayDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

/** @internal */
export function resetSitterStaysForTests() {
  sitterStays = null;
  listeners.clear();
}
