/**
 * @param {import('../../types/app.js').App} definition
 * @returns {import('../../types/app.js').App}
 */
export function defineApp(definition) {
  if (!definition.id || typeof definition.mount !== 'function') {
    throw new Error('App requires id and mount().');
  }
  if (!definition.iconId) {
    throw new Error(`App "${definition.id}" requires iconId.`);
  }
  if (!definition.description) {
    throw new Error(`App "${definition.id}" requires description.`);
  }
  if (!Array.isArray(definition.capabilities) || definition.capabilities.length === 0) {
    throw new Error(`App "${definition.id}" must declare capabilities.`);
  }
  if (!Array.isArray(definition.profiles) || definition.profiles.length === 0) {
    throw new Error(`App "${definition.id}" must declare at least one profile.`);
  }
  return definition;
}
