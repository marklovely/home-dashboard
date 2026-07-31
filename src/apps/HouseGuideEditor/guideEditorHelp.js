import { createHelpGuideButton, createHelpGuideLink, openHelpGuide } from '../../components/HelpGuide/helpGuide.js';
import { GUIDE_EDITOR_HELP_SECTIONS } from './guideEditorHelpContent.js';

const WRITING_GUIDE_TITLE = 'Writing guide';
const WRITING_GUIDE_DIALOG_ID = 'guide-editor-help-title';

/**
 * @param {Object} [options]
 * @param {string} [options.initialSectionId]
 */
export function openGuideEditorHelp(options = {}) {
  openHelpGuide({
    title: WRITING_GUIDE_TITLE,
    sections: GUIDE_EDITOR_HELP_SECTIONS,
    initialSectionId: options.initialSectionId,
    searchPlaceholder: 'Publish, photos, quick actions…',
    dialogId: WRITING_GUIDE_DIALOG_ID
  });
}

/**
 * @param {() => void} [onOpen]
 */
export function createGuideEditorHelpButton(onOpen) {
  const button = createHelpGuideButton({
    label: 'Writing guide',
    title: WRITING_GUIDE_TITLE,
    sections: GUIDE_EDITOR_HELP_SECTIONS,
    searchPlaceholder: 'Publish, photos, quick actions…',
    dialogId: WRITING_GUIDE_DIALOG_ID,
    buttonClassName: 'button-secondary help-guide-trigger'
  });
  if (onOpen) {
    button.addEventListener('click', onOpen);
  }
  return button;
}

/**
 * @param {string} title
 * @param {string} sectionId
 */
export function createGuideEditorSectionHeading(title, sectionId) {
  const row = document.createElement('div');
  row.className = 'guide-editor-section-heading-row';

  const heading = document.createElement('h4');
  heading.className = 'house-guide-editor-blocks-title';
  heading.textContent = title;

  row.append(heading, createGuideEditorContextHelpLink(sectionId));
  return row;
}

/**
 * @param {string} sectionId
 * @param {string} [label]
 */
export function createGuideEditorContextHelpLink(sectionId, label = 'Help') {
  return createHelpGuideLink({
    title: WRITING_GUIDE_TITLE,
    sections: GUIDE_EDITOR_HELP_SECTIONS,
    sectionId,
    label
  });
}
