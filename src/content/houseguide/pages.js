/**
 * @typedef {Object} HouseGuidePageDefinition
 * @property {string} slug
 * @property {string} title
 * @property {string} shortTitle
 * @property {string} icon
 * @property {string} accent
 */

/** @type {HouseGuidePageDefinition[]} */
export const HOUSE_GUIDE_PAGES = [
  { slug: 'kitchen', title: 'Kitchen', shortTitle: 'Kitchen', icon: '🏠', accent: '#f4b64f' },
  { slug: 'tv', title: 'TV & Entertainment', shortTitle: 'TV', icon: '📺', accent: '#d16dff' },
  { slug: 'heating', title: 'Heating', shortTitle: 'Heating', icon: '🔥', accent: '#ff6b6b' },
  { slug: 'washing', title: 'Washing Machine', shortTitle: 'Washing', icon: '🧺', accent: '#4da8ff' },
  { slug: 'wifi', title: 'Wi-Fi', shortTitle: 'Wi-Fi', icon: '📶', accent: '#28d17c' },
  { slug: 'scooter', title: 'Scooter', shortTitle: 'Scooter', icon: '🐶', accent: '#ff9f43' },
  { slug: 'emergency', title: 'Emergency Contacts', shortTitle: 'Emergency', icon: '🚨', accent: '#ff5f6d' },
  { slug: 'local', title: 'Local Recommendations', shortTitle: 'Local', icon: '🍕', accent: '#7eab90' }
];
