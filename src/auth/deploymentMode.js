/** @typedef {'home' | 'house-sitter'} DeploymentModeId */

export const DeploymentMode = /** @type {const} */ ({
  Home: 'home',
  HouseSitter: 'house-sitter'
});

/**
 * @returns {DeploymentModeId}
 */
export function getDeploymentMode() {
  const raw = String(import.meta.env.VITE_DEPLOYMENT_MODE ?? '')
    .trim()
    .toLowerCase();
  if (raw === 'house-sitter' || raw === 'housesitter' || raw === 'house_sitter') {
    return DeploymentMode.HouseSitter;
  }
  return DeploymentMode.Home;
}

export function isHomeDeployment() {
  return getDeploymentMode() === DeploymentMode.Home;
}

export function isHouseSitterDeployment() {
  return getDeploymentMode() === DeploymentMode.HouseSitter;
}

/**
 * @returns {'owner' | 'house-sitter'}
 */
export function getDeploymentDefaultUserMode() {
  return isHouseSitterDeployment() ? 'house-sitter' : 'owner';
}
