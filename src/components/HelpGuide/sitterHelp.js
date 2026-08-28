import { createHelpGuideButton, openHelpGuide } from './helpGuide.js';
import { buildSitterHelpSections, buildSitterHelpSearchPlaceholder } from './sitterHelpContent.js';

const SITTER_HELP_TITLE = 'Tablet guide';
const SITTER_HELP_DIALOG_ID = 'sitter-help-title';

/**
 * @param {Object} [options]
 * @param {string} [options.initialSectionId]
 */
export function openSitterHelp(options = {}) {
  openHelpGuide({
    title: SITTER_HELP_TITLE,
    sections: buildSitterHelpSections(),
    initialSectionId: options.initialSectionId,
    searchPlaceholder: buildSitterHelpSearchPlaceholder(),
    dialogId: SITTER_HELP_DIALOG_ID
  });
}

export function createSitterHelpButton(options = {}) {
  return createHelpGuideButton({
    label: options.label ?? 'Tablet guide',
    title: SITTER_HELP_TITLE,
    sections: buildSitterHelpSections(),
    searchPlaceholder: buildSitterHelpSearchPlaceholder(),
    dialogId: SITTER_HELP_DIALOG_ID,
    buttonClassName: options.buttonClassName ?? 'button-secondary help-guide-trigger'
  });
}

export { buildSitterHelpSections, buildSitterHelpSearchPlaceholder } from './sitterHelpContent.js';
