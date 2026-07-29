/** @typedef {'owner' | 'house-sitter'} AppModeId */

export const AppMode = /** @type {const} */ ({
  Owner: 'owner',
  HouseSitter: 'house-sitter'
});

/**
 * @returns {AppModeId}
 */
export function getAppMode() {
  const raw = String(import.meta.env.VITE_APP_MODE ?? '')
    .trim()
    .toLowerCase();
  if (raw === 'house-sitter' || raw === 'housesitter' || raw === 'house_sitter') {
    return AppMode.HouseSitter;
  }
  return AppMode.Owner;
}

export function isHouseSitterMode() {
  return getAppMode() === AppMode.HouseSitter;
}
