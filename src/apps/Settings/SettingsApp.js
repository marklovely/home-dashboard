import { defineApp } from '../../components/App/defineApp.js';
import { canReturnToHouseSitterMode } from '../../auth/ownerSession.js';
import { isOwnerUserMode } from '../../auth/userMode.js';
import { enterSitterMode, getDeviceMode, lockOwner } from '../../auth/deviceSessionStore.js';
import { getActiveTheme, getEffectiveTheme, setActiveTheme } from '../../services/themeService.js';
import { showToast } from '../../js/modules/toast.js';

/** @returns {string} */
function deviceModeLabel() {
  return getDeviceMode() === 'sitter' ? 'House sitter' : 'Owner';
}

/** @returns {string} */
function themeLabel() {
  const active = getActiveTheme();
  if (active === 'auto') {
    return `Auto (${getEffectiveTheme() === 'light' ? 'Light' : 'Dark'})`;
  }
  return active === 'light' ? 'Light' : 'Dark';
}

/**
 * @param {import('../../types/app.js').ShellContext} context
 * @param {() => void} onRefresh
 */
function mountSettingsApp(viewport, context, onRefresh) {
  const page = document.createElement('section');
  page.className = 'app-page settings-app';
  page.setAttribute('aria-label', 'Settings');

  /** @type {HTMLElement[]} */
  const groups = [
    createSettingsGroup('Appearance', createThemeField(onRefresh)),
    createSettingsGroup('About', createAboutField())
  ];

  if (isOwnerUserMode()) {
    groups.unshift(createSettingsGroup('House sitter mode', createHouseSitterModeFields(context, onRefresh)));
  }

  page.append(...groups);
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

/** @param {import('../../types/app.js').ShellContext} context @param {() => void} onRefresh */
function createHouseSitterModeFields(context, onRefresh) {
  const wrap = document.createElement('div');
  wrap.className = 'settings-options settings-options--stacked';

  const enableCopy = document.createElement('p');
  enableCopy.className = 'settings-help subtle';
  enableCopy.textContent =
    'Hand the tablet to guests with owner-only apps and personal information hidden. The dashboard stays in House Sitter Mode after refreshes and restarts until an owner unlocks it.';

  const enableButton = document.createElement('button');
  enableButton.type = 'button';
  enableButton.className = 'settings-action-button';
  enableButton.textContent = 'Enable House Sitter Mode';
  enableButton.addEventListener('click', () => {
    if (
      !window.confirm(
        'Enable House Sitter Mode?\n\nOwner-only apps and personal information will be hidden. The dashboard will remain in House Sitter Mode after refreshes and tablet restarts.'
      )
    ) {
      return;
    }
    void enterSitterMode(() => {
      context.navigate('home');
      onRefresh();
      context.refreshShell?.();
      showToast(context.toast, 'House Sitter Mode enabled');
    }).then((ok) => {
      if (!ok) showToast(context.toast, 'Could not enable House Sitter Mode');
    });
  });

  wrap.append(enableCopy, enableButton);

  if (canReturnToHouseSitterMode()) {
    const lockButton = document.createElement('button');
    lockButton.type = 'button';
    lockButton.className = 'settings-action-button settings-action-button--secondary';
    lockButton.textContent = 'Return to House Sitter Mode';
    lockButton.addEventListener('click', () => {
      void lockOwner(() => {
        context.navigate('home');
        onRefresh();
        context.refreshShell?.();
      }).then((ok) => {
        if (!ok) showToast(context.toast, 'Could not return to House Sitter Mode');
      });
    });
    wrap.append(lockButton);
  }

  return wrap;
}

/** @param {() => void} onRefresh */
function createThemeField(onRefresh) {
  const wrap = document.createElement('div');
  wrap.className = 'settings-options';
  /** @type {Array<{ id: import('../../services/themeService.js').ThemeId, label: string, hint?: string }>} */
  const options = [
    { id: 'dark', label: 'Dark' },
    { id: 'light', label: 'Light' },
    { id: 'auto', label: 'Auto', hint: 'Follow system' }
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
    input.addEventListener('change', () => {
      if (!input.checked) return;
      setActiveTheme(option.id);
      onRefresh();
    });
    const textWrap = document.createElement('span');
    textWrap.className = 'settings-option-text';
    const title = document.createElement('span');
    title.textContent = option.label;
    textWrap.append(title);
    if (option.hint) {
      const hint = document.createElement('small');
      hint.className = 'settings-option-hint';
      hint.textContent = option.hint;
      textWrap.append(hint);
    }
    label.append(input, textWrap);
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
  appendAboutRow(list, 'Device mode', deviceModeLabel(), 'mode');
  appendAboutRow(list, 'Theme', themeLabel(), 'theme');

  return list;
}

/** @param {HTMLDListElement} list
 * @param {string} term
 * @param {string} value
 * @param {'mode' | 'theme'} [valueKey]
 */
function appendAboutRow(list, term, value, valueKey) {
  const dt = document.createElement('dt');
  dt.textContent = term;
  const dd = document.createElement('dd');
  dd.textContent = value;
  if (valueKey) {
    dd.dataset.settingsValue = valueKey;
  }
  list.append(dt, dd);
}

/** @param {string} iso */
function formatBuildTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

/** @param {ParentNode} viewport */
function refreshAboutValues(viewport) {
  const modeValue = viewport.querySelector('[data-settings-value="mode"]');
  if (modeValue) modeValue.textContent = deviceModeLabel();
  const themeValue = viewport.querySelector('[data-settings-value="theme"]');
  if (themeValue) themeValue.textContent = themeLabel();
}

function settingsSummary() {
  return { title: 'Configuration', subtitle: themeLabel() };
}

export const settingsApp = defineApp({
  id: 'settings',
  title: 'Settings',
  iconId: 'settings',
  description: 'Appearance, guest mode, and about this hub',
  capabilities: ['configuration', 'theme'],
  accent: '#aeb7c6',
  profiles: ['owner', 'housesitter'],
  summary: settingsSummary,
  mount(viewport, context) {
    const refresh = () => {
      refreshAboutValues(viewport);
      context.refreshShell?.();
    };
    mountSettingsApp(viewport, context, refresh);
  }
});
