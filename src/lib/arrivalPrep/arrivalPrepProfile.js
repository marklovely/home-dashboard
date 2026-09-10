/**
 * @typedef {{
 *   gardenEnabled?: boolean,
 *   checkedTaskIds?: string[]
 * }} ArrivalPrepProfile
 */

/** @returns {ArrivalPrepProfile} */
export function defaultArrivalPrepProfile() {
  return {
    gardenEnabled: false,
    checkedTaskIds: []
  };
}

/**
 * @param {unknown} value
 * @returns {ArrivalPrepProfile}
 */
export function normalizeArrivalPrepProfile(value) {
  const defaults = defaultArrivalPrepProfile();
  if (!value || typeof value !== 'object') return defaults;
  const record = /** @type {Record<string, unknown>} */ (value);
  const checkedTaskIds = Array.isArray(record.checkedTaskIds)
    ? record.checkedTaskIds.map((entry) => String(entry ?? '').trim()).filter(Boolean)
    : defaults.checkedTaskIds;
  return {
    gardenEnabled: record.gardenEnabled === true,
    checkedTaskIds
  };
}

/**
 * @param {ArrivalPrepProfile} profile
 * @param {string} taskId
 * @param {boolean} checked
 */
export function withArrivalPrepTaskChecked(profile, taskId, checked) {
  const normalized = normalizeArrivalPrepProfile(profile);
  const set = new Set(normalized.checkedTaskIds);
  if (checked) set.add(taskId);
  else set.delete(taskId);
  return { ...normalized, checkedTaskIds: [...set] };
}

/**
 * @param {ArrivalPrepProfile} profile
 * @param {boolean} gardenEnabled
 */
export function withArrivalPrepGardenEnabled(profile, gardenEnabled) {
  return { ...normalizeArrivalPrepProfile(profile), gardenEnabled: gardenEnabled === true };
}

/**
 * @param {ArrivalPrepProfile} profile
 */
export function withArrivalPrepReset(profile) {
  return { ...normalizeArrivalPrepProfile(profile), checkedTaskIds: [] };
}

/**
 * @param {ArrivalPrepProfile} profile
 * @param {string[]} validTaskIds
 */
export function pruneArrivalPrepChecks(profile, validTaskIds) {
  const valid = new Set(validTaskIds);
  const normalized = normalizeArrivalPrepProfile(profile);
  return {
    ...normalized,
    checkedTaskIds: normalized.checkedTaskIds.filter((id) => valid.has(id))
  };
}
