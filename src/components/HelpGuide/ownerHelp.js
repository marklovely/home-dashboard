import { createHelpGuideButton, openHelpGuide } from './helpGuide.js';
import { OWNER_HELP_SECTIONS } from './ownerHelpContent.js';

const OWNER_HELP_TITLE = 'Owner guide';
const OWNER_HELP_DIALOG_ID = 'owner-help-title';

/**
 * @param {Object} [options]
 * @param {string} [options.initialSectionId]
 */
export function openOwnerHelp(options = {}) {
  openHelpGuide({
    title: OWNER_HELP_TITLE,
    sections: OWNER_HELP_SECTIONS,
    initialSectionId: options.initialSectionId,
    searchPlaceholder: 'Set it up, Common questions, bins…',
    dialogId: OWNER_HELP_DIALOG_ID
  });
}

/**
 * @param {Object} [options]
 * @param {string} [options.buttonClassName]
 */
export function createOwnerHelpButton(options = {}) {
  return createHelpGuideButton({
    label: 'Owner guide',
    title: OWNER_HELP_TITLE,
    sections: OWNER_HELP_SECTIONS,
    searchPlaceholder: 'Set it up, Common questions, bins…',
    dialogId: OWNER_HELP_DIALOG_ID,
    buttonClassName: options.buttonClassName ?? 'button-secondary help-guide-trigger'
  });
}

export { OWNER_HELP_SECTIONS } from './ownerHelpContent.js';
