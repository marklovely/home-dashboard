/**
 * @typedef {'owner' | 'housesitter'} ProfileId
 */

/**
 * @typedef {Object} ShellContext
 * @property {import('../config.js').CONFIG extends infer C ? C : never} config
 * @property {HTMLElement} toast
 * @property {HTMLElement} lastCommand
 * @property {(appId: string) => void} navigate
 */

/**
 * @typedef {Object} App
 * @property {string} id
 * @property {string} title
 * @property {string} icon
 * @property {string} [accent]
 * @property {ProfileId[]} profiles
 * @property {(viewport: HTMLElement, context: ShellContext) => void} mount
 */

export {};
