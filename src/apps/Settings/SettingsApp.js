import { defineApp } from '../../components/App/defineApp.js';
import { canReturnToHouseSitterMode } from '../../auth/ownerSession.js';
import { isOwnerUserMode } from '../../auth/userMode.js';
import { enterSitterMode, getDeviceMode, lockOwner } from '../../auth/deviceSessionStore.js';
import {
  clockFormatLabel,
  getClockFormat,
  getHomeScreenScale,
  HOME_SCREEN_SCALE_OPTIONS,
  homeScreenScaleLabel,
  setClockFormat,
  setHomeScreenScale
} from '../../services/displayPreferencesService.js';
import {
  getNightModeSetting,
  getNightModeWindowInputValues,
  nightModeSettingLabel,
  setNightModeSetting,
  setNightModeWindowFromInputs
} from '../../services/nightModeService.js';
import {
  clearWeatherLocationOverride,
  getWeatherLocationOverride,
  setWeatherLocationOverride
} from '../../services/weatherLocationService.js';
import { geocodeWeatherLocation } from '../../api/weatherApi.js';
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

/** @returns {string} */
function weatherLocationSummary() {
  const override = getWeatherLocationOverride();
  if (!override) return 'Home default';
  return override.detail ? `${override.label} · ${override.detail}` : override.label;
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
    createSettingsGroup('Appearance', createAppearanceFields(onRefresh)),
    createSettingsGroup('About', createAboutField())
  ];

  if (isOwnerUserMode()) {
    groups.splice(1, 0, createSettingsGroup('Weather location', createWeatherLocationField(context, onRefresh)));
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
function createAppearanceFields(onRefresh) {
  const wrap = document.createElement('div');
  wrap.className = 'settings-options settings-options--stacked';
  wrap.append(
    createThemeField(onRefresh),
    createClockFormatField(onRefresh),
    createHomeScaleField(onRefresh),
    createNightModeField(onRefresh)
  );
  return wrap;
}

/** @param {() => void} onRefresh */
function createNightModeField(onRefresh) {
  const wrap = document.createElement('div');
  wrap.className = 'settings-subsection';
  const title = document.createElement('p');
  title.className = 'settings-subsection-title';
  title.textContent = 'Night clock';
  wrap.append(title);

  const hint = document.createElement('p');
  hint.className = 'settings-help subtle';
  hint.textContent =
    'In House Sitter mode, show a dim clock on a black screen during these hours. Tap anywhere to wake the dashboard for five minutes.';

  const options = document.createElement('div');
  options.className = 'settings-options';
  const active = getNightModeSetting();
  for (const option of [
    { id: 'auto', label: 'Auto' },
    { id: 'off', label: 'Off' }
  ]) {
    options.append(
      createRadioOption('night-mode', option.id, option.label, option.id === active, undefined, () => {
        setNightModeSetting(/** @type {'off' | 'auto'} */ (option.id));
        onRefresh();
      })
    );
  }

  const schedule = document.createElement('div');
  schedule.className = 'settings-night-schedule';

  const { start, end } = getNightModeWindowInputValues();
  const startField = createNightModeTimeField('From', 'night-mode-start', start, onRefresh);
  const endField = createNightModeTimeField('Until', 'night-mode-end', end, onRefresh);

  schedule.append(startField, endField);
  wrap.append(hint, options, schedule);
  return wrap;
}

/**
 * @param {string} label
 * @param {string} id
 * @param {string} value
 * @param {() => void} onRefresh
 */
function createNightModeTimeField(label, id, value, onRefresh) {
  const field = document.createElement('label');
  field.className = 'settings-night-time-field';
  field.htmlFor = id;

  const title = document.createElement('span');
  title.className = 'settings-night-time-label';
  title.textContent = label;

  const input = document.createElement('input');
  input.type = 'time';
  input.id = id;
  input.className = 'settings-text-input settings-time-input';
  input.value = value;
  input.addEventListener('change', () => {
    const startInput = document.querySelector('#night-mode-start');
    const endInput = document.querySelector('#night-mode-end');
    if (!(startInput instanceof HTMLInputElement) || !(endInput instanceof HTMLInputElement)) return;
    if (!setNightModeWindowFromInputs(startInput.value, endInput.value)) {
      input.value = id === 'night-mode-start' ? getNightModeWindowInputValues().start : getNightModeWindowInputValues().end;
      return;
    }
    onRefresh();
  });

  field.append(title, input);
  return field;
}

/** @param {() => void} onRefresh */
function createThemeField(onRefresh) {
  const wrap = document.createElement('div');
  wrap.className = 'settings-subsection';
  const title = document.createElement('p');
  title.className = 'settings-subsection-title';
  title.textContent = 'Theme';
  wrap.append(title);

  const options = document.createElement('div');
  options.className = 'settings-options';
  /** @type {Array<{ id: import('../../services/themeService.js').ThemeId, label: string, hint?: string }>} */
  const themeOptions = [
    { id: 'dark', label: 'Dark' },
    { id: 'light', label: 'Light' },
    { id: 'auto', label: 'Auto', hint: 'Follow system' }
  ];
  const active = getActiveTheme();

  for (const option of themeOptions) {
    options.append(createRadioOption('theme', option.id, option.label, option.id === active, option.hint, () => {
      setActiveTheme(option.id);
      onRefresh();
    }));
  }

  wrap.append(options);
  return wrap;
}

/** @param {() => void} onRefresh */
function createHomeScaleField(onRefresh) {
  const wrap = document.createElement('div');
  wrap.className = 'settings-subsection';
  const title = document.createElement('p');
  title.className = 'settings-subsection-title';
  title.textContent = 'Home screen size';
  wrap.append(title);

  const hint = document.createElement('p');
  hint.className = 'settings-help subtle';
  hint.textContent = 'Make the home screen easier to read on the wall tablet. Your choice is remembered after refresh.';

  const options = document.createElement('div');
  options.className = 'settings-options';
  const active = getHomeScreenScale();

  for (const option of HOME_SCREEN_SCALE_OPTIONS) {
    options.append(
      createRadioOption('home-scale', option.id, option.label, option.id === active, undefined, () => {
        setHomeScreenScale(option.id);
        onRefresh();
      })
    );
  }

  wrap.append(hint, options);
  return wrap;
}

/** @param {() => void} onRefresh */
function createClockFormatField(onRefresh) {
  const wrap = document.createElement('div');
  wrap.className = 'settings-subsection';
  const title = document.createElement('p');
  title.className = 'settings-subsection-title';
  title.textContent = 'Clock';
  wrap.append(title);

  const options = document.createElement('div');
  options.className = 'settings-options';
  const active = getClockFormat();
  for (const option of [
    { id: '24', label: '24-hour' },
    { id: '12', label: '12-hour' }
  ]) {
    options.append(
      createRadioOption('clock-format', option.id, option.label, option.id === active, undefined, () => {
        setClockFormat(/** @type {'12' | '24'} */ (option.id));
        onRefresh();
      })
    );
  }

  wrap.append(options);
  return wrap;
}

/**
 * @param {string} name
 * @param {string} value
 * @param {string} label
 * @param {boolean} checked
 * @param {string | undefined} hint
 * @param {() => void} onSelect
 */
function createRadioOption(name, value, label, checked, hint, onSelect) {
  const optionLabel = document.createElement('label');
  optionLabel.className = 'settings-option';
  const input = document.createElement('input');
  input.type = 'radio';
  input.name = name;
  input.value = value;
  input.checked = checked;
  input.addEventListener('change', () => {
    if (!input.checked) return;
    onSelect();
  });
  const textWrap = document.createElement('span');
  textWrap.className = 'settings-option-text';
  const title = document.createElement('span');
  title.textContent = label;
  textWrap.append(title);
  if (hint) {
    const hintEl = document.createElement('small');
    hintEl.className = 'settings-option-hint';
    hintEl.textContent = hint;
    textWrap.append(hintEl);
  }
  optionLabel.append(input, textWrap);
  return optionLabel;
}

/** @param {import('../../types/app.js').ShellContext} context @param {() => void} onRefresh */
function createWeatherLocationField(context, onRefresh) {
  const wrap = document.createElement('div');
  wrap.className = 'settings-options settings-options--stacked';

  const help = document.createElement('p');
  help.className = 'settings-help subtle';
  help.textContent =
    'Search by UK postcode or place name. Leave on home default to use the location configured on the Worker.';

  const current = document.createElement('p');
  current.className = 'settings-current-value';
  current.dataset.settingsValue = 'weather-location';
  current.textContent = `Current: ${weatherLocationSummary()}`;

  const form = document.createElement('div');
  form.className = 'settings-inline-form';
  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'settings-text-input';
  input.placeholder = 'e.g. PO8 9XX or Portsmouth';
  input.autocomplete = 'postal-code';
  input.enterKeyHint = 'search';

  const lookupButton = document.createElement('button');
  lookupButton.type = 'button';
  lookupButton.className = 'settings-action-button settings-action-button--compact';
  lookupButton.textContent = 'Look up';

  const results = document.createElement('div');
  results.className = 'settings-lookup-results';
  results.hidden = true;

  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.className = 'settings-action-button settings-action-button--secondary';
  resetButton.textContent = 'Use home default location';
  resetButton.hidden = !getWeatherLocationOverride();
  resetButton.addEventListener('click', () => {
    clearWeatherLocationOverride();
    onRefresh();
    resetButton.hidden = true;
    results.hidden = true;
    results.replaceChildren();
    input.value = '';
    showToast(context.toast, 'Using home default weather location');
  });

  lookupButton.addEventListener('click', () => {
    void performWeatherLookup(input, lookupButton, results, context, onRefresh, resetButton);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void performWeatherLookup(input, lookupButton, results, context, onRefresh, resetButton);
    }
  });

  form.append(input, lookupButton);
  wrap.append(help, current, form, results, resetButton);
  return wrap;
}

/**
 * @param {HTMLInputElement} input
 * @param {HTMLButtonElement} lookupButton
 * @param {HTMLElement} results
 * @param {import('../../types/app.js').ShellContext} context
 * @param {() => void} onRefresh
 * @param {HTMLButtonElement} resetButton
 */
async function performWeatherLookup(input, lookupButton, results, context, onRefresh, resetButton) {
  const query = input.value.trim();
  if (!query) {
    showToast(context.toast, 'Enter a postcode or place name');
    return;
  }

  lookupButton.disabled = true;
  lookupButton.textContent = 'Looking up…';
  results.hidden = true;
  results.replaceChildren();

  const response = await geocodeWeatherLocation(query);
  lookupButton.disabled = false;
  lookupButton.textContent = 'Look up';

  if (!response.ok) {
    showToast(context.toast, response.message);
    return;
  }

  if (response.results.length === 1) {
    applyWeatherLocation(response.results[0], context, onRefresh, resetButton, results, input);
    return;
  }

  results.hidden = false;
  for (const result of response.results) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'settings-lookup-result';
    button.textContent = result.detail ? `${result.label} · ${result.detail}` : result.label;
    button.addEventListener('click', () => {
      applyWeatherLocation(result, context, onRefresh, resetButton, results, input);
    });
    results.append(button);
  }
}

/**
 * @param {import('../../api/weatherApi.js').WeatherGeocodeResult} result
 * @param {import('../../types/app.js').ShellContext} context
 * @param {() => void} onRefresh
 * @param {HTMLButtonElement} resetButton
 * @param {HTMLElement} results
 * @param {HTMLInputElement} input
 */
function applyWeatherLocation(result, context, onRefresh, resetButton, results, input) {
  setWeatherLocationOverride({
    latitude: result.latitude,
    longitude: result.longitude,
    label: result.label,
    detail: result.detail ?? null
  });
  input.value = '';
  results.hidden = true;
  results.replaceChildren();
  resetButton.hidden = false;
  onRefresh();
  showToast(context.toast, `Weather location set to ${result.label}`);
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
  appendAboutRow(list, 'Clock', clockFormatLabel(), 'clock');
  appendAboutRow(list, 'Home screen', homeScreenScaleLabel(), 'home-scale');
  appendAboutRow(list, 'Night clock', nightModeSettingLabel(), 'night-mode');
  if (isOwnerUserMode()) {
    appendAboutRow(list, 'Weather', weatherLocationSummary(), 'weather-location');
  }

  const wrap = document.createElement('div');
  wrap.append(list);

  if (isOwnerUserMode()) {
    const kioskNote = document.createElement('p');
    kioskNote.className = 'settings-help subtle settings-about-note';
    kioskNote.textContent = 'Screen wake and kiosk behaviour are managed by Fully Kiosk on this tablet.';
    wrap.append(kioskNote);
  }

  return wrap;
}

/** @param {HTMLDListElement} list
 * @param {string} term
 * @param {string} value
 * @param {'mode' | 'theme' | 'clock' | 'home-scale' | 'weather-location' | 'night-mode'} [valueKey]
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
  const modeValue = viewport.querySelector('dd[data-settings-value="mode"]');
  if (modeValue) modeValue.textContent = deviceModeLabel();
  const themeValue = viewport.querySelector('dd[data-settings-value="theme"]');
  if (themeValue) themeValue.textContent = themeLabel();
  const clockValue = viewport.querySelector('dd[data-settings-value="clock"]');
  if (clockValue) clockValue.textContent = clockFormatLabel();
  const homeScaleValue = viewport.querySelector('dd[data-settings-value="home-scale"]');
  if (homeScaleValue) homeScaleValue.textContent = homeScreenScaleLabel();
  const nightModeValue = viewport.querySelector('dd[data-settings-value="night-mode"]');
  if (nightModeValue) nightModeValue.textContent = nightModeSettingLabel();
  const weatherAbout = viewport.querySelector('dd[data-settings-value="weather-location"]');
  if (weatherAbout) weatherAbout.textContent = weatherLocationSummary();
  const weatherCurrent = viewport.querySelector('p[data-settings-value="weather-location"]');
  if (weatherCurrent) weatherCurrent.textContent = `Current: ${weatherLocationSummary()}`;
}

function settingsSummary() {
  return { title: 'Configuration', subtitle: themeLabel() };
}

export const settingsApp = defineApp({
  id: 'settings',
  title: 'Settings',
  iconId: 'settings',
  description: 'Appearance, weather, guest mode, and about this hub',
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
