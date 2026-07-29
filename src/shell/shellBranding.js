import { getModeConfig } from '../modes/modeConfig.js';

/**
 * @param {Object} elements
 * @param {HTMLElement} elements.shellEyebrow
 * @param {HTMLElement} [elements.shellTagline]
 */
export function applyShellBranding(elements) {
  const { branding } = getModeConfig();
  if (elements.shellEyebrow) {
    elements.shellEyebrow.textContent = branding.eyebrow;
  }
  if (elements.shellTagline) {
    if (branding.homeTagline) {
      elements.shellTagline.textContent = branding.homeTagline;
      elements.shellTagline.hidden = false;
    } else {
      elements.shellTagline.hidden = true;
    }
  }
}
