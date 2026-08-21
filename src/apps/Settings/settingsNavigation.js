/** @typedef {{ id: string, label: string, description: string, ownerOnly?: boolean }} SettingsSection */

export const SETTINGS_PANEL_STORAGE_KEY = 'home-dashboard-settings-panel';

/** @type {SettingsSection[]} */
export const SHARED_SETTINGS_SECTIONS = [
  {
    id: 'appearance',
    label: 'Appearance',
    description: 'Theme, clock format, home screen size, and screensaver.'
  },
  {
    id: 'help',
    label: 'Help',
    description: 'Owner, setup, and guest tablet guides.'
  },
  {
    id: 'about',
    label: 'About',
    description: 'Version, build, and current configuration summary.'
  }
];

/** @type {SettingsSection[]} */
export const OWNER_SETTINGS_SECTIONS = [
  {
    id: 'guest-mode',
    label: 'House sitter mode',
    description: 'Hand the tablet to guests, share home access details, and manage sitter login emails.',
    ownerOnly: true
  },
  {
    id: 'home-details',
    label: 'Home details',
    description: 'Hub name, contacts, Wi‑Fi, property address, lockbox code, owner PIN, and calendar link.',
    ownerOnly: true
  },
  {
    id: 'bins',
    label: 'Bin reminders',
    description: 'Collection reminders for sitters and where bins are collected from.',
    ownerOnly: true
  },
  {
    id: 'weather',
    label: 'Weather location',
    description: 'Override the weather location shown on this tablet.',
    ownerOnly: true
  },
  {
    id: 'cameras',
    label: 'Cameras',
    description: 'Owner-only live view via go2rtc on your home network.',
    ownerOnly: true
  },
  {
    id: 'utilities',
    label: 'Utilities',
    description: 'Hub setup wizard, site backup, and factory reset.',
    ownerOnly: true
  }
];

/**
 * @param {boolean} isOwner
 * @returns {SettingsSection[]}
 */
export function getSettingsSections(isOwner) {
  if (!isOwner) return [...SHARED_SETTINGS_SECTIONS];
  return [
    SHARED_SETTINGS_SECTIONS[0],
    ...OWNER_SETTINGS_SECTIONS,
    SHARED_SETTINGS_SECTIONS[1],
    SHARED_SETTINGS_SECTIONS[2]
  ];
}

/** @returns {string} */
export function getStoredSettingsPanel() {
  try {
    return sessionStorage.getItem(SETTINGS_PANEL_STORAGE_KEY) || 'appearance';
  } catch {
    return 'appearance';
  }
}

/** @param {string} panelId */
export function storeSettingsPanel(panelId) {
  try {
    sessionStorage.setItem(SETTINGS_PANEL_STORAGE_KEY, panelId);
  } catch {
    // ignore storage failures
  }
}

/**
 * @param {string} panelId
 * @param {boolean} isOwner
 * @returns {string}
 */
export function normalizeSettingsPanel(panelId, isOwner) {
  const migratedPanelId = panelId === 'backup' ? 'utilities' : panelId;
  const allowed = new Set(getSettingsSections(isOwner).map((section) => section.id));
  return allowed.has(migratedPanelId) ? migratedPanelId : 'appearance';
}
