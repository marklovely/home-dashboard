/** @typedef {import('../../types/guideContent.js').GuideBlock} GuideBlock */

/**
 * @param {GuideBlock['type'] | string} type
 * @returns {GuideBlock}
 */
export function createEmptyGuideBlock(type) {
  switch (type) {
    case 'text':
      return { type: 'text', content: '' };
    case 'steps':
      return { type: 'steps', heading: '', steps: [''] };
    case 'tip':
    case 'warning':
    case 'note':
      return { type, content: '' };
    case 'keyValues':
      return { type: 'keyValues', heading: '', items: [{ label: '', value: '' }] };
    case 'heroImage':
      return { type: 'heroImage', mediaId: '', caption: '' };
    case 'location':
      return { type: 'location', heading: 'Location', content: '' };
    case 'collapsible':
      return { type: 'collapsible', heading: '', content: '' };
    case 'place':
      return { type: 'place', name: '', address: '', description: '', dogFriendly: false, website: '' };
    case 'contact':
      return { type: 'contact', heading: '', items: [{ label: '', value: '', href: '' }] };
    default:
      return { type: 'text', content: '' };
  }
}
