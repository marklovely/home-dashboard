import { getHelpGuideSection, searchHelpGuideSections } from './helpGuide.js';
import { OWNER_HELP_SECTIONS } from '../../help/ownerSections.js';

export { OWNER_HELP_SECTIONS };

/**
 * @param {string} [sectionId]
 */
export function getOwnerHelpSection(sectionId) {
  return getHelpGuideSection(OWNER_HELP_SECTIONS, sectionId);
}

/**
 * @param {string} query
 */
export function searchOwnerHelpSections(query) {
  return searchHelpGuideSections(OWNER_HELP_SECTIONS, query);
}
