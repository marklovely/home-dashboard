import { createHelpGuideButton, createHelpGuideLink, openHelpGuide } from '../HelpGuide/helpGuide.js';
import { HUB_SETUP_HELP_SECTIONS, hubSetupHelpSectionForStep } from './hubSetupHelpContent.js';

/**
 * @param {{ initialSectionId?: string }} [options]
 */
export function openHubSetupHelp(options = {}) {
  openHelpGuide({
    title: 'Hub setup guide',
    sections: HUB_SETUP_HELP_SECTIONS,
    initialSectionId: options.initialSectionId ?? 'overview',
    searchPlaceholder: 'Search setup help…',
    dialogId: 'hub-setup-help-title'
  });
}

/**
 * @param {Object} [options]
 * @param {string} [options.label]
 * @param {string} [options.initialSectionId]
 * @param {string} [options.buttonClassName]
 */
export function createHubSetupHelpButton(options = {}) {
  return createHelpGuideButton({
    label: options.label ?? 'Hub setup guide',
    title: 'Hub setup guide',
    sections: HUB_SETUP_HELP_SECTIONS,
    initialSectionId: options.initialSectionId ?? 'overview',
    searchPlaceholder: 'Search setup help…',
    buttonClassName: options.buttonClassName ?? 'button-secondary help-guide-trigger',
    dialogId: 'hub-setup-help-title'
  });
}

/**
 * @param {'hub' | 'contacts' | 'pets' | 'access' | 'guide'} stepId
 * @param {string} [label]
 */
export function createHubSetupStepHelpLink(stepId, label = 'Help for this step') {
  return createHelpGuideLink({
    title: 'Hub setup guide',
    sections: HUB_SETUP_HELP_SECTIONS,
    sectionId: hubSetupHelpSectionForStep(stepId),
    label
  });
}
