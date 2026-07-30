import { isHouseSitterExperience } from '../auth/userMode.js';

/** @typedef {{ id: string, route: string, label: string, iconId: string }} ShellNavItem */

/**
 * @typedef {Object} ModeBranding
 * @property {string} eyebrow
 * @property {string} homeChromeTitle
 * @property {string} documentTitleBase
 * @property {string | null} homeTagline
 */

/**
 * @typedef {Object} ModeConfig
 * @property {ModeBranding} branding
 * @property {string[] | null} homeAppIds
 * @property {ShellNavItem[] | null} bottomNav
 * @property {boolean} showOwnerStatusStrip
 * @property {boolean} showControlsFooter
 * @property {boolean} showHomeWelcomeGreeting
 * @property {boolean} showHelpCard
 * @property {boolean} showSitterHeaderWeather
 * @property {string[]} sitterEssentialAppIds
 * @property {string[]} sitterSecondaryAppIds
 * @property {{ labels: Record<number, { title: string, subtitle: string }> } | null} controls
 * @property {Record<string, string>} appTitleOverrides
 */

/** @type {ModeConfig} */
const ownerConfig = {
  branding: {
    eyebrow: 'LOVELY HOME HUB',
    homeChromeTitle: 'Home Hub',
    documentTitleBase: 'Home Hub',
    homeTagline: null
  },
  homeAppIds: null,
  bottomNav: null,
  showOwnerStatusStrip: true,
  showControlsFooter: true,
  showHomeWelcomeGreeting: true,
  showHelpCard: false,
  showSitterHeaderWeather: false,
  sitterEssentialAppIds: [],
  sitterSecondaryAppIds: [],
  controls: null,
  appTitleOverrides: {}
};

/** @type {ModeConfig} */
const houseSitterConfig = {
  branding: {
    eyebrow: 'LOVELY HOME',
    homeChromeTitle: 'Lovely Home',
    documentTitleBase: 'Lovely Home',
    homeTagline: null
  },
  homeAppIds: ['weather', 'scooter', 'house-guide', 'controls', 'bins', 'emergency'],
  sitterEssentialAppIds: ['scooter', 'house-guide', 'controls', 'emergency'],
  sitterSecondaryAppIds: ['weather', 'bins'],
  bottomNav: [
    { id: 'nav-home', route: 'home', label: 'Home', iconId: 'home' },
    { id: 'nav-guide', route: 'house-guide', label: 'House Guide', iconId: 'book-open' },
    { id: 'nav-emergency', route: 'emergency', label: 'Emergency', iconId: 'siren' }
  ],
  showOwnerStatusStrip: false,
  showControlsFooter: false,
  showHomeWelcomeGreeting: false,
  showHelpCard: true,
  showSitterHeaderWeather: true,
  controls: {
    labels: {
      1: { title: 'Downstairs Lights', subtitle: 'Turn on the main lights' },
      2: { title: 'Bedtime', subtitle: 'Settle the house for the night' },
      9: { title: 'Restore Lights', subtitle: 'Return the lounge to normal' },
      10: { title: 'Bedroom Lights', subtitle: 'Toggle bedroom lights on or off' }
    }
  },
  appTitleOverrides: {
    controls: 'Home Controls'
  }
};

export function getModeConfig() {
  return isHouseSitterExperience() ? houseSitterConfig : ownerConfig;
}

export { isHouseSitterExperience as isHouseSitterMode };

/**
 * @param {import('../types/app.js').App} app
 */
export function getAppDisplayTitle(app) {
  const override = getModeConfig().appTitleOverrides[app.id];
  return override ?? app.title;
}
