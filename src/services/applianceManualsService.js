import {
  createApplianceManual,
  deleteApplianceManual,
  fetchApplianceManuals,
  patchApplianceManual,
  replaceApplianceManualFile
} from '../api/applianceManualsApi.js';
import { subscribeToUserMode, isOwnerUserMode, isHouseSitterExperience } from '../auth/userMode.js';
import { getDeviceSessionStatus } from '../auth/deviceSessionStore.js';

/** @typedef {'idle' | 'loading' | 'ready' | 'unavailable'} ApplianceManualsStatus */

/** @typedef {import('../api/applianceManualsApi.js').ApplianceManual} ApplianceManual */

/** @typedef {{ status: ApplianceManualsStatus, manuals: ApplianceManual[], message: string, ownerDraftOpen: boolean }} ApplianceManualsState */

/** @type {ApplianceManualsState} */
let state = {
  status: 'idle',
  manuals: [],
  message: '',
  ownerDraftOpen: false
};

/** @type {Set<(state: ApplianceManualsState) => void>} */
const listeners = new Set();

/** @type {AbortController | null} */
let inFlightAbort = null;

/** @type {Promise<void> | null} */
let inFlight = null;

function notify() {
  for (const listener of listeners) {
    listener(state);
  }
}

export function clearApplianceManualsState() {
  inFlightAbort?.abort();
  inFlightAbort = null;
  inFlight = null;
  state = {
    status: 'idle',
    manuals: [],
    message: '',
    ownerDraftOpen: false
  };
  notify();
}

export function setApplianceManualsOwnerDraftOpen(open) {
  if (!isOwnerUserMode()) return;
  state = { ...state, ownerDraftOpen: Boolean(open) };
  notify();
}

export function canManageApplianceManuals() {
  return isOwnerUserMode() && getDeviceSessionStatus() === 'ready';
}

export function canBrowseApplianceManuals() {
  return getDeviceSessionStatus() === 'ready';
}

export function getApplianceManualsState() {
  return state;
}

/**
 * @param {(state: ApplianceManualsState) => void} listener
 */
export function subscribeToApplianceManuals(listener) {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

/**
 * @param {typeof fetch} [fetchImpl]
 * @param {{ force?: boolean, owner?: boolean }} [options]
 */
export async function refreshApplianceManuals(fetchImpl = fetch, options = {}) {
  const sitterCatalogue = options.owner === false;
  const owner = sitterCatalogue ? false : (options.owner ?? canManageApplianceManuals());

  if (sitterCatalogue) {
    if (getDeviceSessionStatus() !== 'ready') {
      return state;
    }
  } else if (!owner || !canManageApplianceManuals()) {
    return state;
  }

  if (inFlight && !options.force) {
    await inFlight;
    return state;
  }

  inFlightAbort?.abort();
  inFlightAbort = new AbortController();
  const signal = inFlightAbort.signal;

  state = { ...state, status: 'loading', message: '' };
  notify();

  inFlight = (async () => {
    const result = await fetchApplianceManuals({
      fetchImpl: (url, init) => fetchImpl(url, { ...init, signal })
    });

    if (signal.aborted) return;

    if (!result.ok) {
      state = {
        ...state,
        status: result.status >= 500 || result.status === 503 ? 'unavailable' : 'ready',
        manuals: owner ? state.manuals : [],
        message:
          result.status >= 500 || result.status === 503
            ? 'Appliance manuals are temporarily unavailable.'
            : result.message
      };
      notify();
      return;
    }

    const manuals = result.data?.manuals ?? [];
    state = {
      ...state,
      status: 'ready',
      manuals: owner ? manuals : manuals.filter((manual) => manual.published),
      message: ''
    };
    notify();
  })();

  try {
    await inFlight;
  } finally {
    inFlight = null;
  }

  return state;
}

/**
 * @param {FormData} formData
 * @param {typeof fetch} [fetchImpl]
 */
export async function uploadApplianceManual(formData, fetchImpl = fetch) {
  const result = await createApplianceManual(formData, { fetchImpl });
  if (result.ok && result.data) {
    state = {
      ...state,
      manuals: [...state.manuals, result.data].sort(sortManuals),
      ownerDraftOpen: false
    };
    notify();
  }
  return result;
}

/**
 * @param {string} id
 * @param {Record<string, unknown>} patch
 * @param {typeof fetch} [fetchImpl]
 */
export async function updateApplianceManualMetadata(id, patch, fetchImpl = fetch) {
  const result = await patchApplianceManual(id, patch, { fetchImpl });
  if (result.ok && result.data) {
    state = {
      ...state,
      manuals: state.manuals.map((manual) => (manual.id === id ? result.data : manual)).sort(sortManuals)
    };
    notify();
  }
  return result;
}

/**
 * @param {string} id
 * @param {FormData} formData
 * @param {typeof fetch} [fetchImpl]
 */
export async function replaceApplianceManualPdf(id, formData, fetchImpl = fetch) {
  const result = await replaceApplianceManualFile(id, formData, { fetchImpl });
  if (result.ok && result.data) {
    state = {
      ...state,
      manuals: state.manuals.map((manual) => (manual.id === id ? result.data : manual)).sort(sortManuals)
    };
    notify();
  }
  return result;
}

/**
 * @param {string} id
 * @param {typeof fetch} [fetchImpl]
 */
export async function removeApplianceManual(id, fetchImpl = fetch) {
  const result = await deleteApplianceManual(id, { fetchImpl });
  if (result.ok) {
    state = {
      ...state,
      manuals: state.manuals.filter((manual) => manual.id !== id)
    };
    notify();
  }
  return result;
}

/**
 * @param {ApplianceManual} left
 * @param {ApplianceManual} right
 */
function sortManuals(left, right) {
  return left.sortOrder - right.sortOrder || left.title.localeCompare(right.title);
}

subscribeToUserMode(() => {
  if (isHouseSitterExperience()) {
    clearApplianceManualsState();
  }
});

/** @internal */
export function resetApplianceManualsStateForTests() {
  clearApplianceManualsState();
}
