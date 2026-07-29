/**
 * @returns {string}
 */
export function getApiBaseUrl() {
  const base = import.meta.env.VITE_API_BASE_URL ?? '';
  return base.replace(/\/$/, '');
}

export function isApiConfigured() {
  return Boolean(getApiBaseUrl());
}
