import { createHelpGuideButton, openHelpGuide } from './helpGuide.js';
import { SITTER_HELP_SECTIONS } from './sitterHelpContent.js';

const SITTER_HELP_TITLE = 'Tablet guide';
const SITTER_HELP_DIALOG_ID = 'sitter-help-title';

/**
 * @param {Object} [options]
 * @param {string} [options.initialSectionId]
 */
export function openSitterHelp(options = {}) {
  openHelpGuide({
    title: SITTER_HELP_TITLE,
    sections: SITTER_HELP_SECTIONS,
    initialSectionId: options.initialSectionId,
    searchPlaceholder: 'House Guide, Scooter, Emergency…',
    dialogId: SITTER_HELP_DIALOG_ID
  });
}

export function createSitterHelpButton(options = {}) {
  return createHelpGuideButton({
    label: options.label ?? 'Tablet guide',
    title: SITTER_HELP_TITLE,
    sections: SITTER_HELP_SECTIONS,
    searchPlaceholder: 'House Guide, Scooter, Emergency…',
    dialogId: SITTER_HELP_DIALOG_ID,
    buttonClassName: options.buttonClassName ?? 'button-secondary help-guide-trigger'
  });
}

export { SITTER_HELP_SECTIONS } from './sitterHelpContent.js';
