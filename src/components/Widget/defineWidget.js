/**
 * @param {import('../../types/widget.js').Widget} definition
 * @returns {import('../../types/widget.js').Widget}
 */
export function defineWidget(definition) {
  if (!definition.id || typeof definition.mount !== 'function') {
    throw new Error('Widget requires id and mount().');
  }
  if (!Array.isArray(definition.profiles) || definition.profiles.length === 0) {
    throw new Error(`Widget "${definition.id}" must declare at least one profile.`);
  }
  return definition;
}
