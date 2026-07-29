import { defineApp } from '../../components/App/defineApp.js';
import { profiles } from '../../profiles/index.js';
import { getActiveProfileId, setActiveProfileId } from '../../services/profileService.js';
import { getActiveTheme, setActiveTheme } from '../../services/themeService.js';

/**
 * @param {import('../../types/app.js').ShellContext} context
 * @param {() => void} onProfileChange
 */
function mountSettingsApp(viewport, context, onProfileChange) {
  const page = document.createElement('section');
  page.className = 'app-page settings-app';
  page.setAttribute('aria-label', 'Settings');

  page.append(
    createSettingsGroup('Profile', createProfileField(onProfileChange)),
    createSettingsGroup('Theme', createThemeField()),
    createSettingsGroup('About', createAboutField())
  );

  viewport.replaceChildren(page);
}

/**
 * @param {string} legend
 * @param {HTMLElement} body
 */
function createSettingsGroup(legend, body) {
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'settings-group';
  const heading = document.createElement('legend');
  heading.className = 'settings-group-title';
  heading.textContent = legend;
  fieldset.append(heading, body);
  return fieldset;
}

/** @param {() => void} onProfileChange */
function createProfileField(onProfileChange) {
  const wrap = document.createElement('div');
  wrap.className = 'settings-options';
  const active = getActiveProfileId();

  for (const profile of Object.values(profiles)) {
    const label = document.createElement('label');
    label.className = 'settings-option';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'profile';
    input.value = profile.id;
    input.checked = profile.id === active;
    input.addEventListener('change', () => {
      if (!input.checked) return;
      setActiveProfileId(/** @type {import('../../types/app.js').ProfileId} */ (profile.id));
      onProfileChange();
    });
    const text = document.createElement('span');
    text.textContent = profile.label;
    label.append(input, text);
    wrap.append(label);
  }
  return wrap;
}

function createThemeField() {
  const wrap = document.createElement('div');
  wrap.className = 'settings-options';
  const options = [
    { id: 'dark', label: 'Dark', enabled: true },
    { id: 'light', label: 'Light', enabled: false },
    { id: 'auto', label: 'Auto', enabled: false }
  ];
  const active = getActiveTheme();

  for (const option of options) {
    const label = document.createElement('label');
    label.className = 'settings-option';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'theme';
    input.value = option.id;
    input.checked = option.id === active;
    input.disabled = !option.enabled;
    input.addEventListener('change', () => {
      if (input.checked) setActiveTheme('dark');
    });
    const text = document.createElement('span');
    text.textContent = option.label;
    if (!option.enabled) {
      text.append(document.createTextNode(' (soon)'));
    }
    label.append(input, text);
    wrap.append(label);
  }
  return wrap;
}

function createAboutField() {
  const list = document.createElement('dl');
  list.className = 'settings-about';

  const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.1';
  const buildTime = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'Development build';

  appendAboutRow(list, 'Application', 'Home Hub');
  appendAboutRow(list, 'Version', version);
  appendAboutRow(list, 'Build', formatBuildTime(buildTime));
  appendAboutRow(list, 'Profile', profiles[getActiveProfileId()]?.label ?? getActiveProfileId(), true);

  return list;
}

/** @param {HTMLDListElement} list
 * @param {string} term
 * @param {string} value
 * @param {boolean} [isProfile]
 */
function appendAboutRow(list, term, value, isProfile = false) {
  const dt = document.createElement('dt');
  dt.textContent = term;
  const dd = document.createElement('dd');
  dd.textContent = value;
  if (isProfile) {
    dd.dataset.settingsProfileValue = 'true';
  }
  list.append(dt, dd);
}

/** @param {string} iso */
function formatBuildTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

function settingsSummary() {
  return { title: 'Configuration', subtitle: profiles[getActiveProfileId()]?.label ?? 'Profile' };
}

export const settingsApp = defineApp({
  id: 'settings',
  title: 'Settings',
  iconId: 'settings',
  description: 'Profile, display, and about this hub',
  capabilities: ['configuration', 'profiles', 'theme'],
  accent: '#aeb7c6',
  profiles: ['owner', 'housesitter'],
  summary: settingsSummary,
  mount(viewport, context) {
    mountSettingsApp(viewport, context, () => {
      const profileValue = viewport.querySelector('[data-settings-profile-value]');
      if (profileValue) {
        profileValue.textContent = profiles[getActiveProfileId()]?.label ?? getActiveProfileId();
      }
      context.refreshShell?.();
    });
  }
});
