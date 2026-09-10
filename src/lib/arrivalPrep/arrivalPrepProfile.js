/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   sectionId: string
 * }} ArrivalPrepCustomTask
 */

/**
 * @typedef {{
 *   gardenEnabled?: boolean,
 *   checkedTaskIds?: string[],
 *   customTasks?: ArrivalPrepCustomTask[],
 *   collapsedSectionIds?: string[],
 *   activeStayId?: string | null,
 *   archivedByStayId?: Record<string, { checkedTaskIds: string[], archivedAt: string }>
 * }} ArrivalPrepProfile
 */

/** @returns {ArrivalPrepProfile} */
export function defaultArrivalPrepProfile() {
  return {
    gardenEnabled: false,
    checkedTaskIds: [],
    customTasks: [],
    collapsedSectionIds: [],
    activeStayId: null,
    archivedByStayId: {}
  };
}

/**
 * @param {unknown} value
 * @returns {ArrivalPrepCustomTask[]}
 */
function normalizeCustomTasks(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const record = /** @type {Record<string, unknown>} */ (entry);
      const id = String(record.id ?? '').trim();
      const label = String(record.label ?? '').trim();
      const sectionId = String(record.sectionId ?? '').trim();
      if (!id || !label || !sectionId) return null;
      return { id, label, sectionId };
    })
    .filter(Boolean);
}

/**
 * @param {unknown} value
 * @returns {Record<string, { checkedTaskIds: string[], archivedAt: string }>}
 */
function normalizeArchivedByStayId(value) {
  if (!value || typeof value !== 'object') return {};
  /** @type {Record<string, { checkedTaskIds: string[], archivedAt: string }>} */
  const out = {};
  for (const [stayId, raw] of Object.entries(value)) {
    if (!raw || typeof raw !== 'object') continue;
    const record = /** @type {Record<string, unknown>} */ (raw);
    const checkedTaskIds = Array.isArray(record.checkedTaskIds)
      ? record.checkedTaskIds.map((entry) => String(entry ?? '').trim()).filter(Boolean)
      : [];
    const archivedAt = String(record.archivedAt ?? '').trim();
    if (!archivedAt) continue;
    out[stayId] = { checkedTaskIds, archivedAt };
  }
  return out;
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
  const collapsedSectionIds = Array.isArray(record.collapsedSectionIds)
    ? record.collapsedSectionIds.map((entry) => String(entry ?? '').trim()).filter(Boolean)
    : defaults.collapsedSectionIds;
  const activeStayId = record.activeStayId == null ? null : String(record.activeStayId).trim() || null;
  return {
    gardenEnabled: record.gardenEnabled === true,
    checkedTaskIds,
    customTasks: normalizeCustomTasks(record.customTasks),
    collapsedSectionIds,
    activeStayId,
    archivedByStayId: normalizeArchivedByStayId(record.archivedByStayId)
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
 * @param {string} sectionId
 * @param {string[]} sectionTaskIds
 */
export function withArrivalPrepSectionReset(profile, sectionId, sectionTaskIds) {
  const normalized = normalizeArrivalPrepProfile(profile);
  const remove = new Set(sectionTaskIds);
  const checkedTaskIds = normalized.checkedTaskIds.filter((id) => !remove.has(id));
  const customTasks = normalized.customTasks.filter((task) => task.sectionId !== sectionId);
  return { ...normalized, checkedTaskIds, customTasks };
}

/**
 * @param {ArrivalPrepProfile} profile
 * @param {string} sectionId
 */
export function withArrivalPrepSectionCollapsed(profile, sectionId, collapsed) {
  const normalized = normalizeArrivalPrepProfile(profile);
  const set = new Set(normalized.collapsedSectionIds);
  if (collapsed) set.add(sectionId);
  else set.delete(sectionId);
  return { ...normalized, collapsedSectionIds: [...set] };
}

/**
 * @param {ArrivalPrepProfile} profile
 * @param {ArrivalPrepCustomTask} task
 */
export function withArrivalPrepCustomTaskAdded(profile, task) {
  const normalized = normalizeArrivalPrepProfile(profile);
  return {
    ...normalized,
    customTasks: [...normalized.customTasks, task]
  };
}

/**
 * @param {ArrivalPrepProfile} profile
 * @param {string} taskId
 */
export function withArrivalPrepCustomTaskRemoved(profile, taskId) {
  const normalized = normalizeArrivalPrepProfile(profile);
  return {
    ...normalized,
    customTasks: normalized.customTasks.filter((task) => task.id !== taskId),
    checkedTaskIds: normalized.checkedTaskIds.filter((id) => id !== taskId)
  };
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
    checkedTaskIds: normalized.checkedTaskIds.filter((id) => valid.has(id)),
    customTasks: normalized.customTasks.filter((task) => valid.has(task.id))
  };
}

/**
 * Archive current checklist progress and start fresh for a stay (or ad-hoc).
 * @param {ArrivalPrepProfile} profile
 * @param {string | null} archiveStayId
 * @param {string | null} nextStayId
 */
export function withArrivalPrepArchivedForStay(profile, archiveStayId, nextStayId) {
  const normalized = normalizeArrivalPrepProfile(profile);
  const archiveKey = archiveStayId || `ad-hoc-${new Date().toISOString().slice(0, 10)}`;
  return {
    ...normalized,
    archivedByStayId: {
      ...normalized.archivedByStayId,
      [archiveKey]: {
        checkedTaskIds: [...normalized.checkedTaskIds],
        archivedAt: new Date().toISOString()
      }
    },
    checkedTaskIds: [],
    activeStayId: nextStayId,
    collapsedSectionIds: []
  };
}
