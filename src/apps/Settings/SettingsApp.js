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
  getScreensaverSetting,
  getScreensaverTimeoutMinutes,
  SCREENSAVER_TIMEOUT_OPTIONS,
  screensaverSettingLabel,
  setScreensaverSetting,
  setScreensaverTimeoutMinutes
} from '../../services/screensaverService.js';
import { getActiveTheme, getEffectiveTheme, setActiveTheme } from '../../services/themeService.js';
import {
  clearWeatherLocationOverride,
  getWeatherLocationOverride,
  setWeatherLocationOverride
} from '../../services/weatherLocationService.js';
import { geocodeWeatherLocation } from '../../api/weatherApi.js';
import { showConfirmDialog } from '../../components/ConfirmDialog/confirmDialog.js';
import { createOwnerHelpButton } from '../../components/HelpGuide/ownerHelp.js';
import { createSitterHelpButton } from '../../components/HelpGuide/sitterHelp.js';
import { showToast } from '../../js/modules/toast.js';
import {
  getSitterSecretsDisclosed,
  setSitterSecretsDisclosed,
  subscribeToSitterSecrets,
  syncSitterSecretsFromServer
} from '../../services/sitterSecretsService.js';
import { fetchSiteBackup, restoreSiteBackup } from '../../api/siteBackupApi.js';
import {
  downloadJsonFile,
  normalizeBackupForRestore,
  readJsonFile,
  uploadedMediaRestoreHint
} from '../../utils/backupJson.js';
import { refreshGuideContent } from '../../services/guideContentService.js';
import { applyShellBranding } from '../../shell/shellBranding.js';
import {
  createContactGroup,
  createGuestAccessFields,
  createSetupField,
  createSetupIntro,
  contactSecretsPatch,
  readGuestAccessSecrets
} from '../../components/HubSetup/hubSetupFields.js';
import {
  factoryResetHub,
  getSiteProfileState,
  saveHubSecrets,
  saveSiteProfile
} from '../../services/siteProfileService.js';

/** @returns {string} */
function deviceModeLabel() {
  return getDeviceMode() === 'sitter' ? 'House sitter' : 'Owner';
}

/** @param {string} [code] */
function houseSitterModeErrorMessage(code) {
  if (code === 'SESSION_UNAVAILABLE') {
    return 'House Sitter Mode could not start because the hub could not create a secure session. Try again in a moment.';
  }
  if (code === 'SESSION_NOT_PERSISTED') {
    return 'House Sitter Mode did not stick. Check that cookies are allowed on this tablet, then try again.';
  }
  return 'Could not enable House Sitter Mode';
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
    createSettingsGroup('Help', createHelpFields()),
    createSettingsGroup('Appearance', createAppearanceFields(onRefresh)),
    createSettingsGroup('About', createAboutField())
  ];

  if (isOwnerUserMode()) {
    groups.splice(1, 0, createSettingsGroup('Backup & restore', createBackupRestoreFields(context)));
    groups.splice(1, 0, createSettingsGroup('Home details', createHomeDetailsFields(context)));
    groups.splice(2, 0, createSettingsGroup('Weather location', createWeatherLocationField(context, onRefresh)));
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

/**
 * @param {import('../../types/app.js').ShellContext} context
 */
function createBackupRestoreFields(context) {
  const wrap = document.createElement('div');
  wrap.className = 'settings-options settings-options--stacked';

  const intro = document.createElement('p');
  intro.className = 'subtle';
  intro.textContent =
    'Download a JSON backup of your House Guide and site settings (not Wi-Fi, PINs, or other Worker secrets). Restore replaces guide content on this hub only.';

  const exportButton = document.createElement('button');
  exportButton.type = 'button';
  exportButton.className = 'settings-action-button';
  exportButton.textContent = 'Download site backup';
  exportButton.addEventListener('click', () => {
    exportButton.disabled = true;
    void fetchSiteBackup().then((result) => {
      exportButton.disabled = false;
      if (!result.ok || !result.data) {
        showToast(context.toast, result.message || 'Could not export backup.');
        return;
      }
      downloadJsonFile('lovely-home-hub-backup.json', result.data);
      showToast(context.toast, 'Site backup downloaded.');
    });
  });

  const importButton = document.createElement('button');
  importButton.type = 'button';
  importButton.className = 'settings-action-button settings-action-button--secondary';
  importButton.textContent = 'Restore from backup file';
  const importInput = document.createElement('input');
  importInput.type = 'file';
  importInput.accept = 'application/json,.json';
  importInput.hidden = true;
  importButton.addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', () => {
    const file = importInput.files?.[0];
    importInput.value = '';
    if (!file) return;

    void (async () => {
      try {
        const raw = await readJsonFile(file);
        const backup = normalizeBackupForRestore(raw);
        const uploaded = /** @type {{ id: string, alt: string }[]} */ (
          backup.guide?.uploadedMedia ?? []
        );
        const confirmed = await showConfirmDialog({
          title: 'Restore site backup?',
          message: `This replaces House Guide content on this hub.${uploadedMediaRestoreHint(uploaded)}`,
          confirmLabel: 'Restore',
          danger: true
        });
        if (!confirmed) return;

        const result = await restoreSiteBackup(backup);
        if (!result.ok) {
          showToast(context.toast, result.message || 'Restore failed.');
          return;
        }

        await syncSitterSecretsFromServer();
        await refreshGuideContent(fetch, { draft: true, force: true });
        showToast(context.toast, 'Site backup restored.');
      } catch (error) {
        showToast(context.toast, error instanceof Error ? error.message : 'Invalid backup file.');
      }
    })();
  });
  wrap.append(intro, exportButton, importButton, importInput);

  const resetIntro = document.createElement('p');
  resetIntro.className = 'settings-help subtle';
  resetIntro.textContent =
    'Factory reset clears House Guide content, hub secrets stored in the database, and site settings on this hub. Worker CLI secrets are not removed. Download a backup first if you need one.';

  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.className = 'settings-action-button settings-action-button--secondary';
  resetButton.textContent = 'Factory reset hub';
  resetButton.addEventListener('click', () => {
    void showConfirmDialog({
      title: 'Factory reset this hub?',
      message:
        'This deletes guide content, saved home details, and settings in the database. This cannot be undone.',
      confirmLabel: 'Reset everything',
      danger: true
    }).then(async (confirmed) => {
      if (!confirmed) return;
      const result = await factoryResetHub();
      if (!result.ok) {
        showToast(context.toast, result.message || 'Reset failed.');
        return;
      }
      await refreshGuideContent(fetch, { draft: true, force: true });
      applyShellBranding({
        shellEyebrow: document.querySelector('#shell-eyebrow'),
        shellTagline: document.querySelector('#shell-tagline')
      });
      showToast(context.toast, 'Hub reset. Open Hub setup to configure again.');
      context.navigate('hub-setup');
    });
  });

  wrap.append(resetIntro, resetButton);
  return wrap;
}

/**
 * @param {import('../../types/app.js').ShellContext} context
 */
function createHomeDetailsFields(context) {
  const wrap = document.createElement('div');
  wrap.className = 'settings-options settings-options--stacked';

  const profileState = getSiteProfileState();
  const profile = profileState?.profile ?? {};

  wrap.append(
    createSetupIntro(
      'Store Wi-Fi, contacts, address, lockbox code, and owner PIN on your hub — no command line required. Leave a field blank when saving to keep its current value.'
    )
  );

  const hubName = createSetupField('Hub name', String(profile.hubName ?? ''));
  const primaryGroup = createContactGroup('Primary contact', profile.primaryContact ?? {});
  const secondaryGroup = createContactGroup('Secondary contact', profile.secondaryContact ?? {});
  const guestFields = createGuestAccessFields(profile);

  const wizardButton = document.createElement('button');
  wizardButton.type = 'button';
  wizardButton.className = 'settings-action-button settings-action-button--secondary';
  wizardButton.textContent = 'Open setup wizard';
  wizardButton.addEventListener('click', () => context.navigate('hub-setup'));

  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.className = 'settings-action-button';
  saveButton.textContent = 'Save home details';
  saveButton.addEventListener('click', () => {
    saveButton.disabled = true;
    void (async () => {
      try {
        const primaryInputs = /** @type {HTMLInputElement[]} */ (primaryGroup.querySelectorAll('input'));
        const secondaryInputs = /** @type {HTMLInputElement[]} */ (secondaryGroup.querySelectorAll('input'));
        const contacts = {
          primaryContact: {
            name: primaryInputs[0]?.value.trim() ?? '',
            phone: primaryInputs[1]?.value.trim() ?? '',
            email: primaryInputs[2]?.value.trim() ?? ''
          },
          secondaryContact: {
            name: secondaryInputs[0]?.value.trim() ?? '',
            phone: secondaryInputs[1]?.value.trim() ?? '',
            email: secondaryInputs[2]?.value.trim() ?? ''
          }
        };

        const profileResult = await saveSiteProfile({
          hubName: hubName.input.value.trim(),
          ...contacts
        });
        if (!profileResult.ok) {
          showToast(context.toast, profileResult.message || 'Could not save profile.');
          return;
        }

        const secretsPatch = {
          ...contactSecretsPatch(contacts),
          ...readGuestAccessSecrets(guestFields)
        };
        if (Object.keys(secretsPatch).length) {
          const pin = secretsPatch.owner_pin;
          if (pin && !/^\d{4}$/.test(pin)) {
            showToast(context.toast, 'Owner PIN must be exactly 4 digits.');
            return;
          }
          const secretsResult = await saveHubSecrets(secretsPatch);
          if (!secretsResult.ok) {
            showToast(context.toast, secretsResult.message || 'Could not save secrets.');
            return;
          }
        }

        guestFields.ownerPin.input.value = '';
        guestFields.wifiPassword.input.value = '';
        guestFields.lockbox.input.value = '';
        context.refreshShell?.();
        showToast(context.toast, 'Home details saved.');
      } finally {
        saveButton.disabled = false;
      }
    })();
  });

  wrap.append(hubName.wrap, primaryGroup, secondaryGroup, guestFields.wrap, saveButton, wizardButton);
  return wrap;
}

function createHelpFields() {
  const wrap = document.createElement('div');
  wrap.className = 'settings-options settings-options--stacked';

  const intro = document.createElement('p');
  intro.className = 'settings-help subtle';
  intro.textContent =
    'Searchable guides for running the hub as an owner and for what house sitters see on the tablet.';

  wrap.append(intro);

  if (isOwnerUserMode()) {
    wrap.append(createOwnerHelpButton({ buttonClassName: 'settings-action-button' }));
    wrap.append(
      createSitterHelpButton({
        label: 'Guest tablet guide',
        buttonClassName: 'settings-action-button'
      })
    );
  } else {
    wrap.append(
      createSitterHelpButton({
        buttonClassName: 'settings-action-button'
      })
    );
  }

  return wrap;
}

/** @param {import('../../types/app.js').ShellContext} context */
function createSitterSecretsToggle(context) {
  const subsection = document.createElement('div');
  subsection.className = 'settings-subsection';

  const title = document.createElement('p');
  title.className = 'settings-subsection-title';
  title.textContent = 'Sitter is here';

  const hint = document.createElement('p');
  hint.className = 'settings-help subtle';
  hint.textContent =
    'When a house sitter is staying, turn this on so Wi‑Fi, the home address, contact details, and the key lockbox code appear in the House Guide. Turn it off when they leave. You can change this from any signed-in owner device.';

  const label = document.createElement('label');
  label.className = 'settings-option settings-option--toggle';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.className = 'settings-toggle-input';
  input.checked = getSitterSecretsDisclosed() === true;
  input.disabled = getSitterSecretsDisclosed() === null;

  const textWrap = document.createElement('span');
  textWrap.className = 'settings-option-text';
  const toggleTitle = document.createElement('span');
  toggleTitle.textContent = 'Show home access details to sitters';
  const toggleHint = document.createElement('small');
  toggleHint.className = 'settings-option-hint';
  toggleHint.textContent =
    'Wi‑Fi, address, contacts, and lockbox code in House Guide protected blocks — not owner apps or calendar.';
  textWrap.append(toggleTitle, toggleHint);
  label.append(input, textWrap);

  input.addEventListener('change', () => {
    const next = input.checked;
    input.disabled = true;
    void setSitterSecretsDisclosed(next).then((ok) => {
      input.disabled = false;
      if (!ok) {
        input.checked = !next;
        showToast(context.toast, 'Could not update sitter access to home details');
        return;
      }
      showToast(
        context.toast,
        next ? 'Home details shared with sitters' : 'Home details hidden from sitters'
      );
    });
  });

  subscribeToSitterSecrets(() => {
    if (getSitterSecretsDisclosed() === null) {
      input.disabled = true;
      return;
    }
    input.disabled = false;
    input.checked = getSitterSecretsDisclosed() === true;
  });

  subsection.append(title, hint, label);
  return subsection;
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
    void showConfirmDialog({
      title: 'Enable House Sitter Mode?',
      message:
        'Owner-only apps and personal information will be hidden. The dashboard will remain in House Sitter Mode after refreshes and tablet restarts.',
      confirmLabel: 'Enable',
      cancelLabel: 'Cancel'
    }).then((confirmed) => {
      if (!confirmed) return;
      void enterSitterMode(() => {
        context.navigate('home');
        onRefresh();
        context.refreshShell?.();
        showToast(context.toast, 'House Sitter Mode enabled');
      }).then((result) => {
        if (!result.ok) showToast(context.toast, houseSitterModeErrorMessage(result.code));
      });
    });
  });

  wrap.append(createSitterSecretsToggle(context), enableCopy, enableButton);

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
      }).then((result) => {
        if (!result.ok) showToast(context.toast, houseSitterModeErrorMessage(result.code));
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
    createScreensaverField(onRefresh)
  );
  return wrap;
}

/** @param {() => void} onRefresh */
function createScreensaverField(onRefresh) {
  const wrap = document.createElement('div');
  wrap.className = 'settings-subsection';
  const title = document.createElement('p');
  title.className = 'settings-subsection-title';
  title.textContent = 'Screensaver';
  wrap.append(title);

  const hint = document.createElement('p');
  hint.className = 'settings-help subtle';
  hint.textContent =
    'In House Sitter mode, show a dim clock after the tablet has been idle. Tap anywhere to wake the dashboard.';

  const options = document.createElement('div');
  options.className = 'settings-options';
  const active = getScreensaverSetting();
  for (const option of [
    { id: 'on', label: 'On' },
    { id: 'off', label: 'Off' }
  ]) {
    options.append(
      createRadioOption('screensaver', option.id, option.label, option.id === active, undefined, () => {
        setScreensaverSetting(/** @type {'off' | 'on'} */ (option.id));
        onRefresh();
      })
    );
  }

  const timeoutTitle = document.createElement('p');
  timeoutTitle.className = 'settings-subsection-title settings-subsection-title--nested';
  timeoutTitle.textContent = 'Turn on after';

  const timeoutOptions = document.createElement('div');
  timeoutOptions.className = 'settings-options';
  const activeTimeout = getScreensaverTimeoutMinutes();
  for (const option of SCREENSAVER_TIMEOUT_OPTIONS) {
    timeoutOptions.append(
      createRadioOption(
        'screensaver-timeout',
        String(option.minutes),
        option.label,
        option.minutes === activeTimeout,
        undefined,
        () => {
          setScreensaverTimeoutMinutes(option.minutes);
          onRefresh();
        }
      )
    );
  }

  wrap.append(hint, options, timeoutTitle, timeoutOptions);
  return wrap;
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
  appendAboutRow(list, 'Screensaver', screensaverSettingLabel(), 'screensaver');
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
 * @param {'mode' | 'theme' | 'clock' | 'home-scale' | 'weather-location' | 'screensaver'} [valueKey]
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
  const screensaverValue = viewport.querySelector('dd[data-settings-value="screensaver"]');
  if (screensaverValue) screensaverValue.textContent = screensaverSettingLabel();
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
