/**
 * @typedef {'owner' | 'housesitter'} ProfileId
 */

/**
 * @typedef {'controls' | 'panel'} WidgetLayout
 */

/**
 * @typedef {Object} WidgetContext
 * @property {import('../config.js').CONFIG extends infer C ? C : never} config
 * @property {HTMLElement} toast
 * @property {HTMLElement} lastCommand
 */

/**
 * @typedef {Object} Widget
 * @property {string} id
 * @property {ProfileId[]} profiles
 * @property {WidgetLayout} [layout] Defaults to `controls` (inline routine buttons).
 * @property {(context: WidgetContext) => DocumentFragment | HTMLElement} mount
 */

export {};
