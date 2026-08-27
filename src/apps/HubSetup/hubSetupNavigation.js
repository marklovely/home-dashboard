/** @typedef {'hub' | 'contacts' | 'pets' | 'access' | 'bins' | 'calendar' | 'guide'} HubSetupStepId */

/** @typedef {{ id: HubSetupStepId, label: string, description: string, iconId: string, optional?: boolean }} HubSetupStepMeta */

/** @type {HubSetupStepMeta[]} */
export const HUB_SETUP_STEPS = [
  {
    id: 'hub',
    label: 'Country & hub name',
    description: 'Choose the property country, name your hub, and pick how guests will use it.',
    iconId: 'home'
  },
  {
    id: 'contacts',
    label: 'Contacts',
    description: 'Who guests should call in an emergency.',
    iconId: 'phone'
  },
  {
    id: 'pets',
    label: 'Pet care',
    description: 'Details for sitters looking after pets.',
    iconId: 'dog',
    optional: true
  },
  {
    id: 'access',
    label: 'Guest access',
    description: 'Wi‑Fi, lockbox, PIN, and property address.',
    iconId: 'key-round'
  },
  {
    id: 'bins',
    label: 'Bin collections',
    description: 'Collection dates and reminder location.',
    iconId: 'trash-2'
  },
  {
    id: 'calendar',
    label: 'My Day calendar',
    description: 'Optional personal calendar for My Day.',
    iconId: 'calendar'
  },
  {
    id: 'guide',
    label: 'House Guide',
    description: 'Import a starter guide or skip for now.',
    iconId: 'book-open'
  }
];

/**
 * @param {string} useCase
 * @returns {HubSetupStepId[]}
 */
export function getWizardSteps(useCase) {
  /** @type {HubSetupStepId[]} */
  const steps = ['hub', 'contacts'];
  if (useCase === 'housesitter' || useCase === 'both') {
    steps.push('pets');
  }
  steps.push('access', 'bins', 'calendar', 'guide');
  return steps;
}

/**
 * @param {HubSetupStepId} stepId
 * @returns {HubSetupStepMeta | undefined}
 */
export function getHubSetupStepMeta(stepId) {
  return HUB_SETUP_STEPS.find((entry) => entry.id === stepId);
}
