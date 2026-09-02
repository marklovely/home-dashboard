import { defineApp } from '../../components/App/defineApp.js';
import { canReturnToHouseSitterMode } from '../../auth/ownerSession.js';
import { promptOwnerPinUnlock } from '../../auth/ownerAccessGesture.js';
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
import { showPasswordDialog } from '../../components/PasswordDialog/passwordDialog.js';
import { createOwnerHelpButton } from '../../components/HelpGuide/ownerHelp.js';
import { createSitterHelpButton } from '../../components/HelpGuide/sitterHelp.js';
import { createHubSetupHelpButton } from '../../components/HubSetup/hubSetupHelp.js';
import { createCalendarConnectionField, createBinAlertHoursField, createBinColorFields, createBinScheduleDateEditor } from '../../components/HubSetup/binScheduleFields.js';
import { HUB_SETUP_FIELD_HELP, getBinScheduleFieldHelp } from '../../components/HubSetup/hubSetupHelpContent.js';
import { inferBinSchedulePeriod, normalizeBinSchedule, readBinScheduleFromProfile, validateBinSchedule } from '../../lib/binScheduleProfile.js';
import {
  clearBinAlertDismissal,
  getDismissedBinCollectionDate
} from '../../services/binAlertDismissalService.js';
import { formatCollectionDateLabel } from '../../services/binCollectionService.js';
import {
  getSettingsSections,
  getStoredSettingsPanel,
  normalizeSettingsPanel,
  storeSettingsPanel
} from './settingsNavigation.js';
import { createCameraSettingsFields } from './createCameraSettingsFields.js';
import { createSitterScheduleBanner, createSitterStaysSection } from './sitterStaysFields.js';
import {
  syncSitterAccessEmailsFromServer
} from '../../services/sitterAccessEmailsService.js';
import { showToast } from '../../js/modules/toast.js';
import {
  getSitterSecretsManual,
  setSitterSecretsDisclosed,
  subscribeToSitterSecrets,
  syncSitterSecretsFromServer
} from '../../services/sitterSecretsService.js';
import { syncSitterStaysFromServer } from '../../services/sitterStaysService.js';
import {
  getSitterAccessEmails,
  saveSitterAccessEmails,
  subscribeToSitterAccessEmails
} from '../../services/sitterAccessEmailsService.js';
import { createSetupTextarea } from '../../components/HubSetup/hubSetupFields.js';
import { fetchSiteBackup } from '../../api/siteBackupApi.js';
import {
  downloadEncryptedBackupFile,
  hasFullBackupContent
} from '../../utils/backupJson.js';
import {
  readAndConfirmSiteBackupRestore,
  runSiteBackupRestore
} from '../../services/siteBackupRestoreFlow.js';
import { refreshGuideContent } from '../../services/guideContentService.js';
import { syncWeatherLocationFromPropertyAddress } from '../../services/weatherLocationFromProfile.js';
import { openHubSetupWizard, openHubSetupWizardAfterReset } from '../HubSetup/hubSetupLauncher.js';
import { applyShellBranding } from '../../shell/shellBranding.js';
import {
  applyGuestAccessDisplayValues,
  buildHomeDetailsFormProfile,
  createContactGroup,
  createGuestAccessFields,
  createSetupField,
  createSetupIntro,
  contactSecretsPatch,
  readGuestAccessSecrets,
  readPropertyAddressProfilePatch
} from '../../components/HubSetup/hubSetupFields.js';
import {
  factoryResetHub,
  fetchHubSecretsConfigured,
  getSiteProfileState,
  saveHubSecrets,
  saveSiteProfile,
  subscribeToSiteProfile,
  syncSiteProfileFromServer
} from '../../services/siteProfileService.js';
import { refreshPrivateConfig } from '../../services/privateConfigService.js';
import { normalizeHubCountryCode } from '../../lib/hubCountries.js';
import { validateEmailAddresses, validateHubContacts, validatePropertyAddress } from '../../lib/contactValidation.js';
import { attachContactGroupValidation, attachPropertyAddressValidation } from '../../lib/contactFieldValidationUi.js';
import { withAsyncButtonFeedback } from '../../lib/asyncButtonFeedback.js';
import {
  buildSitterUnlockPatch,
  canUseSettingsPinUnlock,
  formatOwnerUnlockInstructions,
  getSitterUnlockPreferences,
  normalizeSitterUnlock
} from '../../lib/sitterUnlockPreferences.js';

/**
 * @param {{ ok: boolean, code?: string, message?: string }} result
 * @param {string} fallback
 */
function siteProfileSaveErrorMessage(result, fallback) {
  if (result.code === 'DEVICE_MODE_REQUIRED') {
    return `Unlock owner mode first — ${formatOwnerUnlockInstructions()}`;
  }
  if (result.code === 'NETWORK_ERROR') {
    return 'Could not reach the hub API. PR preview URLs need HUB_API on preview (run enable-hub-pages-previews.mjs) or save from production.';
  }
  return result.message || fallback;
}

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
 * @param {(options?: { soft?: boolean }) => void} onRefresh
 * @param {string} [activePanelId]
 */
function mountSettingsApp(viewport, context, onRefresh, activePanelId) {
  const isOwner = isOwnerUserMode();
  const sections = getSettingsSections(isOwner);
  const panelId = normalizeSettingsPanel(activePanelId ?? getStoredSettingsPanel(), isOwner);
  storeSettingsPanel(panelId);
  const activeSection = sections.find((section) => section.id === panelId) ?? sections[0];

  const page = document.createElement('section');
  page.className = 'app-page settings-app';
  page.setAttribute('aria-label', 'Settings');

  const nav = document.createElement('nav');
  nav.className = 'settings-nav';
  nav.setAttribute('aria-label', 'Settings categories');

  const panelHost = document.createElement('div');
  panelHost.className = 'settings-panel';

  for (const section of sections) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'settings-nav-item';
    button.dataset.settingsPanel = section.id;
    button.textContent = section.label;
    button.setAttribute('aria-current', section.id === panelId ? 'page' : 'false');
    if (section.id === panelId) {
      button.classList.add('is-active');
    }
    button.addEventListener('click', () => {
      if (section.id === panelId) return;
      mountSettingsApp(viewport, context, onRefresh, section.id);
    });
    nav.append(button);
  }

  const panelHeader = document.createElement('header');
  panelHeader.className = 'settings-panel-header';
  const panelTitle = document.createElement('h1');
  panelTitle.className = 'settings-panel-title';
  panelTitle.textContent = activeSection.label;
  const panelDescription = document.createElement('p');
  panelDescription.className = 'settings-panel-description subtle';
  panelDescription.textContent = activeSection.description;
  panelHeader.append(panelTitle, panelDescription);

  const panelBody = document.createElement('div');
  panelBody.className = 'settings-panel-body';
  panelBody.append(renderSettingsPanelContent(panelId, context, onRefresh));

  panelHost.append(panelHeader, panelBody);
  const unlockBanner = createSettingsUnlockBanner(context);
  if (unlockBanner) {
    page.append(unlockBanner);
  }
  page.append(nav, panelHost);
  viewport.replaceChildren(page);
}

/**
 * @param {string} panelId
 * @param {import('../../types/app.js').ShellContext} context
 * @param {(options?: { soft?: boolean }) => void} onRefresh
 */
function renderSettingsPanelContent(panelId, context, onRefresh) {
  switch (panelId) {
    case 'appearance':
      return createAppearanceFields(onRefresh);
    case 'guest-mode':
      return createHouseSitterModeFields(context, onRefresh);
    case 'home-details':
      return createHomeDetailsFields(context);
    case 'bins':
      return createBinReminderFields(context, onRefresh);
    case 'weather':
      return createWeatherLocationField(context, onRefresh);
    case 'cameras':
      return createCameraSettingsFields(context, onRefresh);
    case 'utilities':
      return createUtilitiesFields(context);
    case 'help':
      return createHelpFields();
    case 'about':
    default:
      return createAboutField();
  }
}

/**
 * @param {import('../../types/app.js').ShellContext} context
 */
function createUtilitiesFields(context) {
  const wrap = document.createElement('div');
  wrap.className = 'settings-options settings-options--stacked';

  const wizardHeading = document.createElement('h2');
  wizardHeading.className = 'settings-utilities-heading';
  wizardHeading.textContent = 'Hub setup wizard';

  const wizardIntro = document.createElement('p');
  wizardIntro.className = 'settings-help subtle';
  wizardIntro.textContent =
    'Re-run the first-time setup flow with your current hub details pre-filled. Use this to review or update settings step by step.';

  const wizardButton = document.createElement('button');
  wizardButton.type = 'button';
  wizardButton.className = 'settings-action-button';
  wizardButton.textContent = 'Open setup wizard';
  wizardButton.addEventListener('click', () => openHubSetupWizard(context));

  wrap.append(wizardHeading, wizardIntro, wizardButton);

  const backupHeading = document.createElement('h2');
  backupHeading.className = 'settings-utilities-heading';
  backupHeading.textContent = 'Backup & restore';

  const intro = document.createElement('p');
  intro.className = 'subtle';
  intro.textContent =
    'Backups are encrypted with a password you choose before download. Full backup includes House Guide, home details, Wi‑Fi, PIN, lockbox, calendar link, and sitter settings. Guide-only backup is smaller and omits secrets. Uploaded photo files are never embedded — re-upload after restore.';

  const exportFullButton = document.createElement('button');
  exportFullButton.type = 'button';
  exportFullButton.className = 'settings-action-button';
  exportFullButton.textContent = 'Download full site backup';
  exportFullButton.addEventListener('click', () => {
    void withAsyncButtonFeedback(exportFullButton, 'Preparing…', async () => {
      exportGuideButton.disabled = true;
      try {
        const result = await fetchSiteBackup({ scope: 'full' });
        if (!result.ok || !result.data) {
          showToast(context.toast, result.message || 'Could not export backup.');
          return;
        }
        const password = await showPasswordDialog({
          title: 'Encrypt full backup',
          message:
            'Choose a password for this backup file. You will need the same password to restore it. Lovely Home cannot recover a forgotten password.',
          confirmLabel: 'Download',
          requireConfirmation: true
        });
        if (!password) return;
        if (!hasFullBackupContent(result.data)) {
          showToast(
            context.toast,
            'Warning: this backup may only include House Guide content. Update the hub worker, then download again for home details and secrets.',
            15000
          );
        }
        await downloadEncryptedBackupFile('lovely-home-hub-backup.json', result.data, password);
        showToast(context.toast, 'Encrypted full site backup downloaded.');
      } catch (error) {
        showToast(context.toast, error instanceof Error ? error.message : 'Could not export backup.');
      } finally {
        exportGuideButton.disabled = false;
      }
    });
  });

  const exportGuideButton = document.createElement('button');
  exportGuideButton.type = 'button';
  exportGuideButton.className = 'settings-action-button settings-action-button--secondary';
  exportGuideButton.textContent = 'Download guide only';
  exportGuideButton.addEventListener('click', () => {
    void withAsyncButtonFeedback(exportGuideButton, 'Preparing…', async () => {
      exportFullButton.disabled = true;
      try {
        const result = await fetchSiteBackup({ scope: 'guide' });
        if (!result.ok || !result.data) {
          showToast(context.toast, result.message || 'Could not export backup.');
          return;
        }
        const password = await showPasswordDialog({
          title: 'Encrypt guide backup',
          message:
            'Choose a password for this backup file. You will need the same password to restore it. Lovely Home cannot recover a forgotten password.',
          confirmLabel: 'Download',
          requireConfirmation: true
        });
        if (!password) return;
        await downloadEncryptedBackupFile('lovely-home-guide-backup.json', result.data, password);
        showToast(context.toast, 'Encrypted guide backup downloaded.');
      } catch (error) {
        showToast(context.toast, error instanceof Error ? error.message : 'Could not export backup.');
      } finally {
        exportFullButton.disabled = false;
      }
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
  const restoreStatus = document.createElement('p');
  restoreStatus.className = 'subtle settings-restore-status';
  restoreStatus.hidden = true;
  restoreStatus.setAttribute('role', 'status');
  restoreStatus.setAttribute('aria-live', 'polite');
  importButton.addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', () => {
    const file = importInput.files?.[0];
    importInput.value = '';
    if (!file) return;

    void (async () => {
      try {
        const backup = await readAndConfirmSiteBackupRestore(file);
        if (!backup) return;

        await withAsyncButtonFeedback(importButton, 'Restoring…', async () => {
          restoreStatus.hidden = false;
          restoreStatus.textContent = 'Restoring backup…';
          exportFullButton.disabled = true;
          exportGuideButton.disabled = true;
          showToast(context.toast, 'Restoring backup…', 120000);
          try {
            const result = await runSiteBackupRestore(backup);
            if (!result.ok) {
              restoreStatus.textContent = result.message || 'Restore failed.';
              showToast(context.toast, result.message || 'Restore failed.');
              return;
            }
            restoreStatus.textContent = 'Site backup restored.';
            showToast(context.toast, 'Site backup restored.');
          } finally {
            exportFullButton.disabled = false;
            exportGuideButton.disabled = false;
          }
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid backup file.';
        restoreStatus.hidden = false;
        restoreStatus.textContent = message;
        showToast(context.toast, message);
      }
    })();
  });
  wrap.append(backupHeading, intro, exportFullButton, exportGuideButton, importButton, importInput, restoreStatus);

  const resetHeading = document.createElement('h2');
  resetHeading.className = 'settings-utilities-heading';
  resetHeading.textContent = 'Factory reset';

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
      await withAsyncButtonFeedback(resetButton, 'Resetting…', async () => {
        showToast(context.toast, 'Resetting hub…');
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
        showToast(context.toast, 'Hub reset. Opening setup wizard…');
        openHubSetupWizardAfterReset(context);
      });
    });
  });

  wrap.append(resetHeading, resetIntro, resetButton);
  return wrap;
}

/**
 * @param {import('../../types/app.js').ShellContext} context
 */
function createHomeDetailsFields(context) {
  const wrap = document.createElement('div');
  wrap.className = 'settings-options settings-options--stacked';

  const profileState = getSiteProfileState();
  const profile = buildHomeDetailsFormProfile(profileState?.profile ?? {});

  wrap.append(
    createSetupIntro(
      'Store Wi-Fi, contacts, address, lockbox code, and owner PIN on your hub — no command line required. Leave a field blank when saving to keep its current value.'
    ),
    createHubSetupHelpButton({
      label: 'Home details & setup help',
      initialSectionId: 'step-access',
      buttonClassName: 'settings-action-button settings-action-button--secondary'
    })
  );

  const hubName = createSetupField('Hub name', String(profile.hubName ?? ''), HUB_SETUP_FIELD_HELP.hubName);
  const primaryGroup = createContactGroup('Primary contact', profile.primaryContact ?? {}, {
    variant: 'primary'
  });
  const secondaryGroup = createContactGroup('Secondary contact (optional)', profile.secondaryContact ?? {}, {
    variant: 'secondary'
  });
  const guestFields = createGuestAccessFields(profile, {
    hubCountryCode: normalizeHubCountryCode(profile.hubCountryCode)
  });
  const getCountryCode = () => normalizeHubCountryCode(profile.hubCountryCode);
  attachContactGroupValidation(primaryGroup, getCountryCode);
  attachContactGroupValidation(secondaryGroup, getCountryCode);
  const addressValidation = attachPropertyAddressValidation(guestFields.propertyAddress, getCountryCode);
  let calendarFields = createCalendarConnectionField();

  void fetchHubSecretsConfigured().then((result) => {
    const configured = result.ok ? result.data?.configured ?? {} : {};
    const stored = result.ok ? result.data?.stored ?? configured : {};
    applyGuestAccessDisplayValues(guestFields, configured, stored);

    if (configured.calendar_ics_url) {
      const existing = calendarFields;
      calendarFields = createCalendarConnectionField({ configured: true });
      if (existing.wrap.parentElement) {
        existing.wrap.replaceWith(calendarFields.wrap);
      }
    }
  });

  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.className = 'settings-action-button';
  saveButton.textContent = 'Save home details';
  saveButton.addEventListener('click', () => {
    void withAsyncButtonFeedback(saveButton, 'Saving…', async () => {
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
      const countryCode = normalizeHubCountryCode(profile.hubCountryCode);
      const contactError = validateHubContacts(contacts, countryCode);
      if (contactError) {
        showToast(context.toast, contactError);
        return;
      }
      const addressPatch = readPropertyAddressProfilePatch(guestFields);
      const addressError = validatePropertyAddress(addressPatch.propertyAddress, countryCode);
      if (addressError) {
        addressValidation?.validateAll();
        showToast(context.toast, addressError);
        return;
      }

      const profileResult = await saveSiteProfile({
        hubName: hubName.input.value.trim(),
        ...contacts,
        ...addressPatch
      });
      if (!profileResult.ok) {
        showToast(context.toast, profileResult.message || 'Could not save profile.');
        return;
      }

      void syncWeatherLocationFromPropertyAddress(addressPatch.propertyAddress);

      const secretsPatch = {
        ...contactSecretsPatch(contacts),
        ...readGuestAccessSecrets(guestFields),
        ...calendarFields.readCalendarPatch()
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
      calendarFields.input.value = '';
      context.refreshShell?.();
      showToast(context.toast, 'Home details saved.');
    });
  });

  wrap.append(hubName.wrap, primaryGroup, secondaryGroup, guestFields.wrap, calendarFields.wrap, saveButton);
  return wrap;
}

/**
 * @param {import('../../types/app.js').ShellContext} context
 * @param {() => void} onRefresh
 */
function createBinReminderFields(context, onRefresh) {
  const wrap = document.createElement('div');
  wrap.className = 'settings-options settings-options--stacked';

  const profile = buildHomeDetailsFormProfile(getSiteProfileState()?.profile ?? {});
  const schedule = readBinScheduleFromProfile(profile);

  wrap.append(
    createSetupIntro(
      'Sitters see a prominent reminder on the home screen before each bin collection. Reminders count down from 6am on collection day — the same time bins are normally put out. Add dates below, then tap Save bin reminders; the list is a draft until you save.'
    )
  );

  const alertField = createBinAlertHoursField(profile);
  const locationField = createSetupField(
    'Where are bins collected from?',
    schedule.collectionLocation,
    {
      placeholder: 'End of the close, left-hand side',
      ...getBinScheduleFieldHelp(String(profile.useCase ?? 'owner'))
    }
  );
  const councilField = createSetupField('Council bins website (optional)', schedule.councilUrl, {
    placeholder: 'https://www.example.gov.uk/bins',
    type: 'url',
    ...HUB_SETUP_FIELD_HELP.binCouncilUrl
  });

  const validUntilField = createSetupField('Schedule valid until (optional)', schedule.validUntil, {
    type: 'date',
    ...HUB_SETUP_FIELD_HELP.binValidUntil
  });

  const dateEditor = createBinScheduleDateEditor({
    schedule,
    getRepeatUntilFallback: () => validUntilField.input.value.trim(),
    onLastDateChange: (lastDate) => {
      const current = validUntilField.input.value.trim();
      if (lastDate && (!current || lastDate > current)) {
        validUntilField.input.value = lastDate;
      }
    }
  });

  const colorFields = createBinColorFields(schedule);

  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.className = 'settings-action-button';
  saveButton.textContent = 'Save bin reminders';
  saveButton.addEventListener('click', () => {
    void withAsyncButtonFeedback(saveButton, 'Saving…', async () => {
      const { household, gardenWaste } = dateEditor.readHouseholdAndGarden();
      const binSchedule = inferBinSchedulePeriod(
        normalizeBinSchedule({
          ...schedule,
          alertHoursBefore: alertField.readAlertHoursBefore(),
          collectionLocation: locationField.input.value.trim(),
          councilUrl: councilField.input.value.trim(),
          validUntil: validUntilField.input.value.trim(),
          binColors: colorFields.readBinColors(),
          household,
          gardenWaste
        })
      );
      const validation = validateBinSchedule(binSchedule);
      if (!validation.ok) {
        showToast(context.toast, validation.message);
        return;
      }
      const result = await saveSiteProfile({ binSchedule });
      if (!result.ok) {
        showToast(context.toast, siteProfileSaveErrorMessage(result, 'Could not save bin reminders.'));
        return;
      }
      context.refreshShell?.();
      onRefresh({ panelId: 'bins' });
      showToast(context.toast, 'Bin reminders saved.');
    });
  });

  wrap.append(
    alertField.wrap,
    locationField.wrap,
    councilField.wrap,
    validUntilField.wrap,
    colorFields.wrap,
    dateEditor.wrap,
    saveButton
  );

  const dismissedCollectionDate = getDismissedBinCollectionDate();
  if (dismissedCollectionDate) {
    const dismissalStatus = document.createElement('p');
    dismissalStatus.className = 'settings-current-value';
    dismissalStatus.textContent = `Home reminder hidden for collection on ${formatCollectionDateLabel(dismissedCollectionDate)}.`;

    const resetDismissalButton = document.createElement('button');
    resetDismissalButton.type = 'button';
    resetDismissalButton.className = 'settings-action-button settings-action-button--secondary';
    resetDismissalButton.textContent = 'Show bin reminder again';
    resetDismissalButton.addEventListener('click', () => {
      clearBinAlertDismissal();
      onRefresh({ panelId: 'bins' });
      showToast(context.toast, 'Bin reminder restored.');
    });

    wrap.append(dismissalStatus, resetDismissalButton);
  }

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
      createHubSetupHelpButton({
        buttonClassName: 'settings-action-button settings-action-button--secondary'
      })
    );
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
    'When a house sitter is staying, turn this on so Wi‑Fi, the property address, contact details, and the key lockbox code appear in the House Guide. Turn it off when they leave. You can change this from any signed-in owner device.';

  const label = document.createElement('label');
  label.className = 'settings-option settings-option--toggle';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.className = 'settings-toggle-input';
  input.checked = getSitterSecretsManual() === true;
  input.disabled = getSitterSecretsManual() === null;

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
    if (getSitterSecretsManual() === null) {
      input.disabled = true;
      return;
    }
    input.disabled = false;
    input.checked = getSitterSecretsManual() === true;
  });

  subsection.append(title, hint, label, createSitterScheduleBanner(context));
  return subsection;
}

/** @param {import('../../types/app.js').ShellContext} context */
function createSitterAccessEmailsField(context) {
  const subsection = document.createElement('div');
  subsection.className = 'settings-subsection';

  const title = document.createElement('p');
  title.className = 'settings-subsection-title';
  title.textContent = 'Sitter login emails';

  const hint = document.createElement('p');
  hint.className = 'settings-help subtle';
  hint.textContent =
    'Cloudflare Access emails with permanent sitter login (comma- or newline-separated). For temporary access, use Scheduled stays below instead. Leave empty to remove permanent sitter login.';

  const emailsField = createSetupTextarea(
    'Email addresses',
    (getSitterAccessEmails() ?? []).join(', '),
    {
      rows: 3,
      placeholder: 'sitter@example.com, partner-sitter@example.com',
      helpText:
        'Changes update Cloudflare Access immediately when the hub Worker is configured for Access sync.'
    }
  );

  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.className = 'settings-action-button settings-action-button--secondary';
  saveButton.textContent = 'Save sitter login emails';
  saveButton.disabled = getSitterAccessEmails() === null;

  saveButton.addEventListener('click', () => {
    const raw = emailsField.textarea.value;
    const emails = raw
      .split(/[,;\n]+/)
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean);
    const emailError = validateEmailAddresses(emails);
    if (emailError) {
      showToast(context.toast, emailError);
      return;
    }
    void withAsyncButtonFeedback(saveButton, 'Saving…', async () => {
      const result = await saveSitterAccessEmails(emails);
      if (!result.ok) {
        showToast(context.toast, result.message || 'Could not save sitter login emails.');
        return;
      }
      showToast(context.toast, 'Sitter login emails saved.');
    });
  });

  subscribeToSitterAccessEmails(() => {
    const current = getSitterAccessEmails();
    saveButton.disabled = current === null;
    if (current !== null) {
      emailsField.textarea.value = current.join(', ');
    }
  });

  subsection.append(title, hint, emailsField.wrap, saveButton);
  return subsection;
}

/** @param {import('../../types/app.js').ShellContext} context */
function createSettingsUnlockBanner(context) {
  if (!canUseSettingsPinUnlock()) return null;

  const banner = document.createElement('div');
  banner.className = 'settings-unlock-banner';

  const copy = document.createElement('p');
  copy.className = 'settings-help';
  copy.textContent =
    'This tablet is locked in House Sitter Mode. Owners can restore full access with their PIN.';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'settings-action-button';
  button.textContent = 'Unlock owner mode';
  button.addEventListener('click', () => {
    const host = document.querySelector('#owner-access-host');
    promptOwnerPinUnlock({
      host,
      onSuccess: () => {
        context.refreshShell?.();
        showToast(context.toast, 'Owner mode restored');
      }
    });
  });

  banner.append(copy, button);
  return banner;
}

/** @param {import('../../types/app.js').ShellContext} context */
function createSitterUnlockMethodFields(context) {
  const subsection = document.createElement('div');
  subsection.className = 'settings-subsection';

  const title = document.createElement('p');
  title.className = 'settings-subsection-title';
  title.textContent = 'Unlock owner mode';

  const hint = document.createElement('p');
  hint.className = 'settings-help subtle';
  hint.textContent =
    'Choose how owners can leave House Sitter Mode on a locked tablet. A PIN is always required — sitters cannot use these options without it. Fully Kiosk admin exits and remote unlock are separate; configure those in Fully Kiosk.';

  const logoLabel = document.createElement('label');
  logoLabel.className = 'settings-option settings-option--toggle';
  const logoInput = document.createElement('input');
  logoInput.type = 'checkbox';
  logoInput.className = 'settings-toggle-input';

  const logoText = document.createElement('span');
  logoText.className = 'settings-option-text';
  const logoTitle = document.createElement('span');
  logoTitle.textContent = 'Press and hold the hub logo';
  const logoHint = document.createElement('small');
  logoHint.className = 'settings-option-hint';
  logoHint.textContent = 'Hold the header logo for five seconds, then enter your PIN.';
  logoText.append(logoTitle, logoHint);
  logoLabel.append(logoInput, logoText);

  const settingsLabel = document.createElement('label');
  settingsLabel.className = 'settings-option settings-option--toggle';
  const settingsInput = document.createElement('input');
  settingsInput.type = 'checkbox';
  settingsInput.className = 'settings-toggle-input';

  const settingsText = document.createElement('span');
  settingsText.className = 'settings-option-text';
  const settingsTitle = document.createElement('span');
  settingsTitle.textContent = 'Settings unlock button';
  const settingsHint = document.createElement('small');
  settingsHint.className = 'settings-option-hint';
  settingsHint.textContent = 'Show Unlock owner mode at the top of Settings while the tablet is locked.';
  settingsText.append(settingsTitle, settingsHint);
  settingsLabel.append(settingsInput, settingsText);

  const applyPrefs = () => {
    const prefs = getSitterUnlockPreferences();
    logoInput.checked = prefs.logoHold;
    settingsInput.checked = prefs.settingsButton;
  };

  const savePrefs = () => {
    const next = normalizeSitterUnlock({
      logoHold: logoInput.checked,
      settingsButton: settingsInput.checked
    });
    logoInput.disabled = true;
    settingsInput.disabled = true;
    void saveSiteProfile(buildSitterUnlockPatch(next)).then((result) => {
      logoInput.disabled = false;
      settingsInput.disabled = false;
      if (!result.ok) {
        applyPrefs();
        showToast(context.toast, siteProfileSaveErrorMessage(result, 'Could not save unlock options'));
        return;
      }
      showToast(context.toast, 'Unlock options saved');
    });
  };

  logoInput.addEventListener('change', () => {
    if (!logoInput.checked && !settingsInput.checked) {
      logoInput.checked = true;
      showToast(context.toast, 'Keep at least one unlock option enabled.');
      return;
    }
    savePrefs();
  });

  settingsInput.addEventListener('change', () => {
    if (!logoInput.checked && !settingsInput.checked) {
      settingsInput.checked = true;
      showToast(context.toast, 'Keep at least one unlock option enabled.');
      return;
    }
    savePrefs();
  });

  applyPrefs();
  subscribeToSiteProfile(applyPrefs);

  subsection.append(title, hint, logoLabel, settingsLabel);
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
    }).then(async (confirmed) => {
      if (!confirmed) return;
      await withAsyncButtonFeedback(enableButton, 'Enabling…', async () => {
        const result = await enterSitterMode(() => {
          context.navigate('home');
          onRefresh();
          context.refreshShell?.();
          showToast(context.toast, 'House Sitter Mode enabled');
        });
        if (!result.ok) showToast(context.toast, houseSitterModeErrorMessage(result.code));
      });
    });
  });

  wrap.append(
    createSitterSecretsToggle(context),
    createSitterStaysSection(context),
    createSitterAccessEmailsField(context),
    createSitterUnlockMethodFields(context),
    enableCopy,
    enableButton
  );

  if (canReturnToHouseSitterMode()) {
    const lockButton = document.createElement('button');
    lockButton.type = 'button';
    lockButton.className = 'settings-action-button settings-action-button--secondary';
    lockButton.textContent = 'Return to House Sitter Mode';
    lockButton.addEventListener('click', () => {
      void withAsyncButtonFeedback(lockButton, 'Locking…', async () => {
        const result = await lockOwner(() => {
          context.navigate('home');
          onRefresh();
          context.refreshShell?.();
        });
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
        onRefresh({ soft: true });
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
          onRefresh({ soft: true });
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
      onRefresh({ soft: true });
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
  hint.textContent = 'Make the home screen easier to read on the wall tablet. Synced across all hub tablets.';

  const options = document.createElement('div');
  options.className = 'settings-options';
  const active = getHomeScreenScale();

  for (const option of HOME_SCREEN_SCALE_OPTIONS) {
    options.append(
      createRadioOption('home-scale', option.id, option.label, option.id === active, undefined, () => {
        setHomeScreenScale(option.id);
        onRefresh({ soft: true });
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
        onRefresh({ soft: true });
      })
    );
  }

  wrap.append(options);
  return wrap;
}

/**
 * @param {string} name
 */
function syncSettingsRadioGroup(name) {
  for (const input of document.querySelectorAll(`input[type="radio"][name="${name}"]`)) {
    const option = input.closest('.settings-option');
    if (option) {
      option.classList.toggle('is-selected', input.checked);
    }
  }
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
  if (checked) optionLabel.classList.add('is-selected');
  const input = document.createElement('input');
  input.type = 'radio';
  input.name = name;
  input.value = value;
  input.checked = checked;
  input.addEventListener('change', () => {
    if (!input.checked) return;
    syncSettingsRadioGroup(name);
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
    onRefresh({ panelId: 'weather' });
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

  results.hidden = true;
  results.replaceChildren();

  const response = await withAsyncButtonFeedback(lookupButton, 'Looking up…', () =>
    geocodeWeatherLocation(query)
  );

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
  onRefresh({ panelId: 'weather' });
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
    /** @type {(options?: { soft?: boolean, panelId?: string }) => void} */
    let refreshSettings = () => {};
    refreshSettings = (options = {}) => {
      refreshAboutValues(viewport);
      context.refreshShell?.();
      if (options.soft) return;
      const storedPanel = options.panelId ?? getStoredSettingsPanel();
      mountSettingsApp(viewport, context, refreshSettings, storedPanel);
    };

    const loading = document.createElement('section');
    loading.className = 'app-page settings-app settings-app--loading';
    loading.setAttribute('aria-label', 'Settings');
    loading.innerHTML = '<p class="subtle settings-loading-copy">Loading settings…</p>';
    viewport.replaceChildren(loading);

    void Promise.all([
      syncSiteProfileFromServer(),
      refreshPrivateConfig(),
      syncSitterAccessEmailsFromServer(),
      syncSitterSecretsFromServer(),
      syncSitterStaysFromServer()
    ]).finally(() => {
      mountSettingsApp(viewport, context, refreshSettings);
    });
  }
});
