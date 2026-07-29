/**
 * @typedef {'owner' | 'housesitter'} ProfileId
 */

/**
 * @typedef {Object} ShellContext
 * @property {import('../config.js').CONFIG extends infer C ? C : never} config
 * @property {HTMLElement} toast
 * @property {HTMLElement} lastCommand
 * @property {(appId: string) => void} navigate
 * @property {() => void} [refreshShell]
 */

/**
 * @typedef {Object} AppSummary
 * @property {string} title
 * @property {string} [subtitle]
 */

/**
 * @typedef {Object} App
 * @property {string} id
 * @property {string} title
 * @property {string} iconId
 * @property {string} description
 * @property {string[]} capabilities
 * @property {string} [accent]
 * @property {ProfileId[]} profiles
 * @property {(context: ShellContext) => AppSummary | Promise<AppSummary>} [summary]
 * @property {(viewport: HTMLElement, context: ShellContext) => void} mount
 */

export {};
