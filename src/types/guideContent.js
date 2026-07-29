/**
 * @typedef {Object} GuideMediaAsset
 * @property {string} file
 * @property {string} alt
 */

/**
 * @typedef {Object} GuideCategory
 * @property {string} id
 * @property {string} title
 * @property {string} cardSubtitle
 * @property {string} iconId
 * @property {string} accent
 * @property {string[]} [searchTerms]
 * @property {GuideTopic[]} topics
 */

/**
 * @typedef {Object} GuideTopicSearchHit
 * @property {string} id
 * @property {string} title
 * @property {string} cardSubtitle
 * @property {string} categoryId
 * @property {string} categoryTitle
 * @property {string} iconId
 * @property {string} accent
 * @property {string[]} searchTerms
 */

/** @typedef {GuideTopicSearchHit} GuideTopicCard */

/**
 * @typedef {Object} GuideBlockText
 * @property {'text'} type
 * @property {string} [heading]
 * @property {string} content
 */

/**
 * @typedef {Object} GuideBlockSteps
 * @property {'steps'} type
 * @property {string} [heading]
 * @property {string[]} steps
 */

/**
 * @typedef {Object} GuideBlockCallout
 * @property {'tip' | 'warning' | 'note'} type
 * @property {string} [heading]
 * @property {string} content
 */

/**
 * @typedef {Object} GuideBlockHeroImage
 * @property {'heroImage'} type
 * @property {string} mediaId
 * @property {string} [caption]
 */

/**
 * @typedef {Object} GuideBlockGallery
 * @property {'gallery'} type
 * @property {string} [heading]
 * @property {string[]} mediaIds
 */

/**
 * @typedef {Object} GuideBlockLocation
 * @property {'location'} type
 * @property {string} heading
 * @property {string} content
 */

/**
 * @typedef {Object} GuideBlockContact
 * @property {'contact'} type
 * @property {string} [heading]
 * @property {{ label: string, value: string, href?: string }[]} items
 */

/**
 * @typedef {Object} GuideBlockKeyValues
 * @property {'keyValues'} type
 * @property {string} [heading]
 * @property {{ label: string, value: string }[]} items
 */

/**
 * @typedef {Object} GuideBlockCollapsible
 * @property {'collapsible'} type
 * @property {string} heading
 * @property {string} content
 */

/** @typedef {GuideBlockText | GuideBlockSteps | GuideBlockCallout | GuideBlockHeroImage | GuideBlockGallery | GuideBlockLocation | GuideBlockContact | GuideBlockKeyValues | GuideBlockCollapsible} GuideBlock */

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
 * @property {{ label: string, value: string }[]} items
 */

/**
 * @typedef {Object} GuideActionNavigate
 * @property {'navigate'} type
 * @property {string} topicId
 * @property {string} label
 */

/** @typedef {GuideActionAlexa | GuideActionPanel | GuideActionNavigate} GuideAction */

/**
 * @typedef {Object} GuideTopic
 * @property {string} id
 * @property {string} title
 * @property {string} subtitle
 * @property {string} summary
 * @property {GuideBlock[]} blocks
 * @property {GuideAction[]} [actions]
 * @property {string[]} searchTerms
 */

/**
 * @typedef {Object} GuideCatalog
 * @property {number} version
 * @property {string} homeSummaryTitle
 * @property {string} homeSummarySubtitle
 * @property {Record<string, GuideMediaAsset>} [media]
 * @property {GuideCategory[]} categories
 */

export {};
