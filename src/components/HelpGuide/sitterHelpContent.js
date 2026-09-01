import { getHelpGuideSection, searchHelpGuideSections } from './helpGuide.js';
import { buildSitterHelpSections as buildSitterHelpSectionsFromOptions } from '../../help/sitterSections.js';
import {
  buildSitterHelpSearchPlaceholder,
  getHostDisplayName,
  getPetCareAppTitle,
  getPetSpeciesSummary,
  getStayPlaceLabel,
  isControlsVisibleInHelp,
  isDemoHubHelpContext,
  isPetCareVisibleInHelp
} from '../../lib/sitterHelpContext.js';

/**
 * Build sitter tablet guide sections from the active hub profile and visible apps.
 */
export function buildSitterHelpSections() {
  return buildSitterHelpSectionsFromOptions({
    hosts: getHostDisplayName('your hosts'),
    stayPlace: getStayPlaceLabel(),
    petName: getPetCareAppTitle(),
    petVisible: isPetCareVisibleInHelp(),
    controlsVisible: isControlsVisibleInHelp(),
    petSummary: getPetSpeciesSummary(),
    isDemo: isDemoHubHelpContext(),
    surface: 'hub'
  });
}

export { buildSitterHelpSearchPlaceholder };

/**
 * @param {string} [sectionId]
 */
export function getSitterHelpSection(sectionId) {
  return getHelpGuideSection(buildSitterHelpSections(), sectionId);
}

/**
 * @param {string} query
 */
export function searchSitterHelpSections(query) {
  return searchHelpGuideSections(buildSitterHelpSections(), query);
}
