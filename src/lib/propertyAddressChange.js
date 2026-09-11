import {
  hasConfiguredBinSchedule,
  normalizeBinSchedule,
  readBinScheduleFromProfile
} from './binScheduleProfile.js';
import {
  hasPropertyAddress,
  normalizePropertyAddress,
  propertyAddressLookupKey
} from './propertyAddress.js';

/**
 * @param {import('./propertyAddress.js').PropertyAddress | Record<string, unknown> | null | undefined} previous
 * @param {import('./propertyAddress.js').PropertyAddress | Record<string, unknown> | null | undefined} next
 */
export function hasPropertyAddressChanged(previous, next) {
  return propertyAddressLookupKey(previous) !== propertyAddressLookupKey(next);
}

/**
 * @param {import('./binScheduleProfile.js').BinScheduleProfile} schedule
 */
export function hasLocationSensitiveBinData(schedule) {
  const normalized = normalizeBinSchedule(schedule);
  return (
    hasConfiguredBinSchedule(normalized) ||
    Boolean(normalized.councilUrl?.trim()) ||
    Boolean(normalized.validFrom?.trim()) ||
    Boolean(normalized.validUntil?.trim()) ||
    Boolean(normalized.normalCollectionDay?.trim())
  );
}

/**
 * Clear postcode/council-linked bin data; keep reminder preferences and collection spot notes.
 *
 * @param {import('./binScheduleProfile.js').BinScheduleProfile | unknown} schedule
 */
export function binScheduleAfterPropertyAddressChange(schedule) {
  const current = normalizeBinSchedule(schedule);
  return normalizeBinSchedule({
    ...current,
    household: [],
    gardenWaste: [],
    councilUrl: '',
    validFrom: '',
    validUntil: '',
    normalCollectionDay: ''
  });
}

/**
 * @param {import('./propertyAddress.js').PropertyAddress | Record<string, unknown> | null | undefined} previous
 * @param {import('./propertyAddress.js').PropertyAddress | Record<string, unknown> | null | undefined} next
 */
export function propertyAddressForSaveAfterChange(previous, next) {
  const prev = normalizePropertyAddress(previous);
  const normalized = normalizePropertyAddress(next);
  if (!hasPropertyAddressChanged(prev, normalized)) {
    return normalized;
  }
  const uprn =
    normalized.uprn && normalized.uprn !== prev.uprn ? normalized.uprn : '';
  return { ...normalized, uprn };
}

/**
 * @param {import('./binScheduleProfile.js').BinScheduleProfile | unknown} binSchedule
 */
export function buildPropertyAddressChangeConfirmMessage(binSchedule) {
  const parts = ['Weather location will update to match the new postcode.'];
  if (hasLocationSensitiveBinData(binSchedule)) {
    parts.unshift(
      'Saved bin collection dates and council calendar links for the previous address will be cleared.'
    );
  }
  parts.push('You can set up bin reminders again afterwards.');
  return parts.join(' ');
}

/**
 * @param {object} params
 * @param {import('./propertyAddress.js').PropertyAddress | Record<string, unknown> | null | undefined} params.previousAddress
 * @param {import('./propertyAddress.js').PropertyAddress | Record<string, unknown> | null | undefined} params.nextAddress
 * @param {unknown} [params.profile]
 */
/**
 * @param {import('./propertyAddress.js').PropertyAddress | Record<string, unknown> | null | undefined} previousAddress
 * @param {import('./propertyAddress.js').PropertyAddress | Record<string, unknown> | null | undefined} nextAddress
 * @param {unknown} [profile]
 */
export function shouldConfirmPropertyAddressChange(previousAddress, nextAddress, profile) {
  if (!hasPropertyAddressChanged(previousAddress, nextAddress)) {
    return false;
  }
  if (!hasPropertyAddress(previousAddress)) {
    return false;
  }
  return hasLocationSensitiveBinData(readBinScheduleFromProfile(profile));
}

export function planPropertyAddressChange({ previousAddress, nextAddress, profile }) {
  const binSchedule = readBinScheduleFromProfile(profile);
  const addressChanged = hasPropertyAddressChanged(previousAddress, nextAddress);
  if (!addressChanged) {
    return {
      addressChanged: false,
      propertyAddress: normalizePropertyAddress(nextAddress),
      clearsBinSchedule: false
    };
  }

  const propertyAddress = propertyAddressForSaveAfterChange(previousAddress, nextAddress);
  const clearsBinSchedule = hasLocationSensitiveBinData(binSchedule);

  return {
    addressChanged: true,
    propertyAddress,
    clearsBinSchedule,
    binSchedule: clearsBinSchedule ? binScheduleAfterPropertyAddressChange(binSchedule) : binSchedule
  };
}
