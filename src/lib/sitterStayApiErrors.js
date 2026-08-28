/**
 * @param {unknown} data
 * @param {string} fallback
 */
export function sitterStayApiErrorMessage(data, fallback) {
  if (!data || typeof data !== 'object') return fallback;

  const record = /** @type {Record<string, unknown>} */ (data);
  if (typeof record.message === 'string' && record.message.trim()) {
    return record.message.trim();
  }

  const error = record.error;
  if (error && typeof error === 'object') {
    const message = /** @type {{ message?: string }} */ (error).message;
    if (typeof message === 'string' && message.trim()) {
      return message.trim();
    }
  }

  return fallback;
}
