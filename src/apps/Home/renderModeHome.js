import { isHouseSitterMode } from '../modes/modeConfig.js';
import { renderHomeScreen } from './renderHome.js';
import { renderHouseSitterHome } from './renderHouseSitterHome.js';

/**
 * @param {HTMLElement} viewport
 * @param {import('../types/app.js').App[]} apps
 * @param {import('../types/app.js').ShellContext} context
 */
export async function renderModeHomeScreen(viewport, apps, context) {
  if (isHouseSitterMode()) {
    return renderHouseSitterHome(viewport, apps, context);
  }
  return renderHomeScreen(viewport, apps, context);
}
