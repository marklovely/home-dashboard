/**
 * @typedef {Object} GuideTopicCard
 * @property {string} id
 * @property {string} title
 * @property {string} cardSubtitle
 * @property {string} iconId
 * @property {string} accent
 * @property {string[]} searchTerms
 */

/**
 * @typedef {Object} GuideKeyValue
 * @property {string} label
 * @property {string} value
 */

/**
 * @typedef {Object} GuideSection
 * @property {'text' | 'tip' | 'warning' | 'collapsible' | 'keyValues'} [type]
 * @property {string} [heading]
 * @property {string} [content]
 * @property {GuideKeyValue[]} [items]
 */

/**
 * @typedef {Object} GuideActionAlexa
 * @property {'alexa'} type
 * @property {number} buttonId
 * @property {string} label
 */

/**
 * @typedef {Object} GuideActionPanel
 * @property {'panel'} type
 * @property {string} label
 * @property {string} [heading]
 * @property {GuideKeyValue[]} items
 */

/**
 * @typedef {Object} GuideActionNavigate
 * @property {'navigate'} type
 * @property {string} topicId
 * @property {string} label
 */

/** @typedef {GuideActionAlexa | GuideActionPanel | GuideActionNavigate} GuideAction */

/**
 * @typedef {Object} GuidePage
 * @property {string} id
 * @property {string} title
 * @property {string} subtitle
 * @property {string} summary
 * @property {GuideSection[]} sections
 * @property {GuideAction[]} [actions]
 * @property {string[]} searchTerms
 */

/**
 * @typedef {Object} GuideCatalog
 * @property {string} homeSummaryTitle
 * @property {string} homeSummarySubtitle
 * @property {GuideTopicCard[]} topics
 * @property {Record<string, GuidePage>} pages
 */

export {};
