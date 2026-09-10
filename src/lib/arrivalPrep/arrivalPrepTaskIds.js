/**
 * @param {string} baseTaskId
 * @param {string} [petId]
 */
export function buildArrivalPrepTaskId(baseTaskId, petId) {
  if (!petId) return baseTaskId;
  return `${baseTaskId}@${petId}`;
}

/**
 * @param {string} taskId
 */
export function parseArrivalPrepTaskId(taskId) {
  const at = taskId.lastIndexOf('@');
  if (at <= 0) {
    return { baseId: taskId, petId: null };
  }
  return {
    baseId: taskId.slice(0, at),
    petId: taskId.slice(at + 1)
  };
}

/**
 * @param {string} [petId]
 */
export function buildCustomArrivalPrepTaskId(petId) {
  const suffix = globalThis.crypto?.randomUUID?.() ?? `custom-${Date.now()}`;
  return petId ? `custom.${suffix}@${petId}` : `custom.${suffix}`;
}
