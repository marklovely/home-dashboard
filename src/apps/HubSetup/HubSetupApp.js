import { defineApp } from '../../components/App/defineApp.js';
import { renderIcon } from '../../components/icons/renderIcon.js';
import { showToast } from '../../js/modules/toast.js';
import {
  applyGuestAccessDisplayValues,
  buildHomeDetailsFormProfile,
  createContactGroup,
  createGuestAccessFields,
  createPetDetailsFields,
  createSetupField,
  createSetupInfoHint,
  createSetupIntro,
  createSetupSelect,
  contactSecretsPatch,
  readGuestAccessSecrets,
  readPropertyAddressProfilePatch
} from '../../components/HubSetup/hubSetupFields.js';
import { isHubSetupWizardRerunRequested } from './hubSetupLauncher.js';
import { HUB_SETUP_FIELD_HELP } from '../../components/HubSetup/hubSetupHelpContent.js';
import {
  createHubSetupHelpButton,
  createHubSetupStepHelpLink
} from '../../components/HubSetup/hubSetupHelp.js';
import { buildStarterGuideCatalog } from '../../content/houseguide/templates/buildStarterGuideCatalog.js';
import {
  getStarterGuideTemplate
} from '../../content/houseguide/templates/starterGuideTemplates.js';
import { importHouseGuideCatalog } from '../../api/houseGuideApi.js';
import {
  createBinScheduleFields,
  createCalendarConnectionField
} from '../../components/HubSetup/binScheduleFields.js';
import {
  validateBinSchedule
} from '../../lib/binScheduleProfile.js';
import {
  fetchHubSecretsConfigured,
  getSiteProfileState,
  getSiteSetupUnavailableMessage,
  isOnboardingComplete,
  isSiteSetupAvailable,
  saveHubSecrets,
  saveSiteProfile,
  syncSiteProfileFromServer
} from '../../services/siteProfileService.js';
import { refreshGuideContent } from '../../services/guideContentService.js';
import { syncWeatherLocationFromPropertyAddress } from '../../services/weatherLocationFromProfile.js';
import { getModeConfig } from '../../modes/modeConfig.js';
import { applyShellBranding } from '../../shell/shellBranding.js';
import {
  clearHubSetupWizardRerunRequest,
  getHubSetupWizardStep,
  resetHubSetupWizardStep,
  setHubSetupWizardStep
} from './hubSetupWizardState.js';
import {
  getHubSetupStepMeta,
  getWizardSteps
} from './hubSetupNavigation.js';

const USE_CASE_OPTIONS = [
  { value: 'owner', label: 'Owner only' },
  { value: 'housesitter', label: 'Trusted housesitters / long stays' },
  { value: 'airbnb', label: 'Airbnb / short lets' },
  { value: 'both', label: 'Both sitters and short lets' }
];

const HUB_SETUP_WELCOME = {
  title: 'Welcome to Lovely Home setup',
  lead:
    'A few short steps to name your hub, add contacts, and get guests started. Each step saves as you go — you can change everything later in Settings.'
};

const HUB_SETUP_RERUN_WELCOME = {
  title: 'Hub setup wizard',
  lead:
    'Step through your hub settings with your current details pre-filled. Leave secret fields blank to keep saved values.'
};

/**
 * @param {HTMLElement} viewport
 * @param {import('../../types/app.js').ShellContext} context
 */
function mountHubSetupUnavailable(viewport, context) {
  const page = document.createElement('section');
  page.className = 'app-page settings-app hub-setup-app hub-setup-app--unavailable';
  page.setAttribute('aria-label', 'Hub setup unavailable');

  const title = document.createElement('h1');
  title.className = 'hub-setup-title';
  title.textContent = 'Set up your hub';

  const message = document.createElement('p');
  message.className = 'hub-setup-unavailable-message';
  message.textContent = getSiteSetupUnavailableMessage();

  const hint = document.createElement('p');
  hint.className = 'subtle';
  hint.textContent =
    'Your answers cannot be saved until the hub is connected. If this keeps happening, whoever manages this hub may need to finish the server update.';

  const actions = document.createElement('div');
  actions.className = 'hub-setup-actions';

  const retryButton = document.createElement('button');
  retryButton.type = 'button';
  retryButton.className = 'settings-action-button';
  retryButton.textContent = 'Try again';
  retryButton.addEventListener('click', () => {
    retryButton.disabled = true;
    void syncSiteProfileFromServer().finally(() => {
      retryButton.disabled = false;
      mountHubSetup(viewport, context);
    });
  });

  const homeButton = document.createElement('button');
  homeButton.type = 'button';
  homeButton.className = 'settings-action-button settings-action-button--secondary';
  homeButton.textContent = 'Back to Home';
  homeButton.addEventListener('click', () => context.navigate('home'));

  actions.append(retryButton, homeButton);
  page.append(title, message, hint, actions);
  viewport.replaceChildren(page);
}

/**
 * @param {import('../../types/app.js').ShellContext} context
 */
function mountHubSetupWizard(viewport, context) {
  const page = document.createElement('section');
  page.className = 'app-page settings-app hub-setup-app';
  page.setAttribute('aria-label', 'Hub setup');

  const profileState = getSiteProfileState();
  const profile = buildHomeDetailsFormProfile(profileState?.profile ?? {});

  let step = getHubSetupWizardStep();

  const nav = document.createElement('nav');
  nav.className = 'settings-nav hub-setup-nav';
  nav.setAttribute('aria-label', 'Setup steps');

  const navHeading = document.createElement('p');
  navHeading.className = 'hub-setup-nav-heading';
  navHeading.textContent = 'Hub setup';

  const navProgress = document.createElement('p');
  navProgress.className = 'hub-setup-nav-progress subtle';

  const navList = document.createElement('div');
  navList.className = 'hub-setup-nav-list';
  navList.setAttribute('role', 'list');

  const navFooter = document.createElement('div');
  navFooter.className = 'hub-setup-nav-footer';
  navFooter.append(
    createHubSetupHelpButton({ buttonClassName: 'settings-action-button settings-action-button--secondary' })
  );

  nav.append(navHeading, navProgress, navList, navFooter);

  const panel = document.createElement('div');
  panel.className = 'settings-panel hub-setup-panel';

  const panelHeader = document.createElement('header');
  panelHeader.className = 'settings-panel-header hub-setup-panel-header';

  const welcomeBlock = document.createElement('div');
  welcomeBlock.className = 'hub-setup-welcome';

  const welcomeEyebrow = document.createElement('p');
  welcomeEyebrow.className = 'hub-setup-welcome-eyebrow';
  welcomeEyebrow.textContent = getModeConfig().branding.eyebrow;

  const welcomeCopy = isHubSetupWizardRerunRequested() ? HUB_SETUP_RERUN_WELCOME : HUB_SETUP_WELCOME;

  const welcomeTitle = document.createElement('h2');
  welcomeTitle.className = 'hub-setup-welcome-title';
  welcomeTitle.textContent = welcomeCopy.title;

  const welcomeLead = document.createElement('p');
  welcomeLead.className = 'hub-setup-welcome-lead subtle';
  welcomeLead.textContent = welcomeCopy.lead;

  welcomeBlock.append(welcomeEyebrow, welcomeTitle, welcomeLead);

  const stepHeader = document.createElement('div');
  stepHeader.className = 'hub-setup-step-header';

  const panelTitle = document.createElement('h1');
  panelTitle.className = 'settings-panel-title';

  const panelDescription = document.createElement('p');
  panelDescription.className = 'settings-panel-description subtle';

  const stepHelpHost = document.createElement('div');
  stepHelpHost.className = 'hub-setup-step-help-host';

  stepHeader.append(panelTitle, panelDescription, stepHelpHost);
  panelHeader.append(welcomeBlock, stepHeader);

  const body = document.createElement('div');
  body.className = 'settings-panel-body hub-setup-body';

  const actions = document.createElement('div');
  actions.className = 'hub-setup-actions hub-setup-panel-actions';

  const backButton = document.createElement('button');
  backButton.type = 'button';
  backButton.className = 'settings-action-button settings-action-button--secondary';
  backButton.textContent = 'Back';

  const nextButton = document.createElement('button');
  nextButton.type = 'button';
  nextButton.className = 'settings-action-button';
  nextButton.textContent = 'Continue';

  actions.append(backButton, nextButton);
  panel.append(panelHeader, body, actions);
  page.append(nav, panel);
  viewport.replaceChildren(page);

  const hubName = createSetupField('Hub name', String(profile.hubName ?? ''), {
    placeholder: 'Rose Cottage Hub',
    required: true,
    ...HUB_SETUP_FIELD_HELP.hubName
  });
  const useCase = createSetupSelect(
    'How will guests use this hub?',
    String(profile.useCase ?? 'owner'),
    USE_CASE_OPTIONS,
    HUB_SETUP_FIELD_HELP.useCase
  );

  const primaryGroup = createContactGroup('Primary contact', profile.primaryContact ?? {}, {
    variant: 'primary'
  });
  const secondaryGroup = createContactGroup('Secondary contact (optional)', profile.secondaryContact ?? {}, {
    variant: 'secondary'
  });

  const guestFields = createGuestAccessFields(profile);
  let binFields = createBinScheduleFields(profile, String(profile.useCase ?? 'owner'));
  let calendarFields = createCalendarConnectionField();

  void fetchHubSecretsConfigured().then((result) => {
    if (!result.ok) return;
    const configured = result.data?.configured ?? {};
    applyGuestAccessDisplayValues(guestFields, configured);
    if (configured.calendar_ics_url) {
      calendarFields = createCalendarConnectionField({ configured: true });
      if (currentStepId() === 'calendar') {
        renderStep();
      }
    }
  });

  const petFields = createPetDetailsFields(profile);

  function wizardSteps() {
    return getWizardSteps(useCase.select.value);
  }

  function currentStepId() {
    const steps = wizardSteps();
    if (step >= steps.length) {
      step = steps.length - 1;
      setHubSetupWizardStep(step);
    }
    return steps[step];
  }

  function isLastWizardStep() {
    return step >= wizardSteps().length - 1;
  }

  function scrollWizardToTop() {
    requestAnimationFrame(() => {
      panel.scrollTop = 0;
      body.scrollTop = 0;
      page.scrollTop = 0;
      if (viewport.scrollTop > 0) {
        viewport.scrollTop = 0;
      }
      window.scrollTo(0, 0);
    });
  }

  function renderNav() {
    const steps = wizardSteps();
    navProgress.textContent = `Step ${step + 1} of ${steps.length}`;
    navList.replaceChildren();

    steps.forEach((stepId, index) => {
      const meta = getHubSetupStepMeta(stepId);
      const isActive = index === step;
      const isComplete = index < step;
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'settings-nav-item hub-setup-nav-item';
      item.setAttribute('role', 'listitem');
      if (isActive) {
        item.classList.add('is-active');
        item.setAttribute('aria-current', 'step');
      } else if (isComplete) {
        item.classList.add('is-complete');
      } else {
        item.classList.add('is-upcoming');
        item.disabled = true;
      }

      const iconWrap = document.createElement('span');
      iconWrap.className = 'hub-setup-nav-icon';
      iconWrap.setAttribute('aria-hidden', 'true');
      iconWrap.append(renderIcon(meta?.iconId ?? 'settings', { size: 18, className: 'hub-setup-nav-svg' }));

      const copy = document.createElement('span');
      copy.className = 'hub-setup-nav-copy';

      const stepLine = document.createElement('span');
      stepLine.className = 'hub-setup-nav-step-line';
      stepLine.textContent = `Step ${index + 1}`;

      const label = document.createElement('span');
      label.className = 'hub-setup-nav-label';
      label.textContent = meta?.optional ? `${meta?.label ?? stepId} · Optional` : (meta?.label ?? stepId);

      copy.append(stepLine, label);

      item.append(iconWrap, copy);

      if (isActive) {
        const doBadge = document.createElement('span');
        doBadge.className = 'hub-setup-nav-do';
        doBadge.textContent = 'To Do';
        item.append(doBadge);
      } else if (isComplete) {
        const doneBadge = document.createElement('span');
        doneBadge.className = 'hub-setup-nav-done';
        doneBadge.textContent = 'Done';
        doneBadge.setAttribute('aria-hidden', 'true');
        item.append(doneBadge);
      }

      if (isComplete) {
        item.addEventListener('click', () => {
          step = index;
          renderStep();
        });
      }

      navList.append(item);
    });
  }

  function renderStep() {
    setHubSetupWizardStep(step);
    renderNav();
    body.replaceChildren();
    backButton.hidden = step === 0;
    nextButton.textContent = isLastWizardStep()
      ? isHubSetupWizardRerunRequested()
        ? 'Done'
        : 'Finish setup'
      : 'Continue';

    const stepId = currentStepId();
    const meta = getHubSetupStepMeta(stepId);
    panelTitle.textContent = meta?.label ?? 'Hub setup';
    panelDescription.textContent = meta?.description ?? '';
    stepHelpHost.replaceChildren(createHubSetupStepHelpLink(stepId));

    if (stepId === 'hub') {
      body.append(
        createSetupIntro('Give your hub a name and choose how guests will use it. You can change these later in Settings.'),
        hubName.wrap,
        useCase.wrap
      );
    } else if (stepId === 'contacts') {
      body.append(
        createSetupIntro('Who should guests call? Names appear in the House Guide; phone and email are stored securely on your hub.'),
        primaryGroup,
        secondaryGroup
      );
    } else if (stepId === 'pets') {
      body.append(petFields.wrap);
    } else if (stepId === 'access') {
      body.append(guestFields.wrap);
    } else if (stepId === 'bins') {
      const selectedUseCase = useCase.select.value;
      const schedule = binFields.readBinSchedule();
      binFields = createBinScheduleFields(
        { ...getSiteProfileState()?.profile, binSchedule: schedule },
        selectedUseCase
      );
      body.append(binFields.wrap);
    } else if (stepId === 'calendar') {
      body.append(calendarFields.wrap);
    } else if (stepId === 'guide') {
      const selectedUseCase = useCase.select.value;
      const starterTemplate = getStarterGuideTemplate(selectedUseCase);
      const liveProfile = {
        ...profile,
        ...getSiteProfileState()?.profile,
        useCase: selectedUseCase,
        petCare: petFields.readPetCare()
      };

      const guideIntro = createSetupIntro(
        `Start with a ${starterTemplate.label.toLowerCase()} you can edit in the Guide Editor, or skip and add content later.`
      );
      const starterHelp = createSetupInfoHint(
        `${HUB_SETUP_FIELD_HELP.starterGuide.helpText} ${starterTemplate.hint}`,
        'What is the starter guide?'
      );
      const starterSummary = document.createElement('p');
      starterSummary.className = 'hub-setup-starter-summary subtle';
      starterSummary.textContent = `Includes: ${starterTemplate.summary}. Based on your choice in step 1 (${USE_CASE_OPTIONS.find((option) => option.value === selectedUseCase)?.label ?? 'Owner only'}).`;

      const starterRow = document.createElement('div');
      starterRow.className = 'hub-setup-action-row';

      const starterButton = document.createElement('button');
      starterButton.type = 'button';
      starterButton.className = 'settings-action-button hub-setup-action-button';
      starterButton.textContent = 'Import starter guide';
      starterButton.addEventListener('click', () => {
        starterButton.disabled = true;
        const catalog = buildStarterGuideCatalog(selectedUseCase, liveProfile);
        void importHouseGuideCatalog(catalog).then(async (result) => {
          starterButton.disabled = false;
          if (!result.ok) {
            showToast(context.toast, result.message || 'Could not import starter guide.');
            return;
          }
          await refreshGuideContent(fetch, { draft: true, force: true });
          showToast(
            context.toast,
            'Starter guide imported. Tap Finish setup when you are ready, or Back to keep editing.',
            4500
          );
        });
      });

      starterRow.append(starterButton, starterHelp.button);

      const skipNote = document.createElement('p');
      skipNote.className = 'subtle';
      skipNote.textContent =
        'You can skip import and add topics later in the Guide Editor. Until a guide is imported, the House Guide shows a neutral placeholder — not another home\'s content.';

      body.append(guideIntro, starterSummary, starterRow, starterHelp.panel, skipNote);
    }

    scrollWizardToTop();
  }

  backButton.addEventListener('click', () => {
    if (step > 0) {
      step -= 1;
      setHubSetupWizardStep(step);
      renderStep();
    }
  });

  /**
   * @param {{ ok?: boolean, message?: string }} result
   * @param {string} fallback
   * @returns {boolean}
   */
  function handleSaveResult(result, fallback) {
    if (!result.ok) {
      showToast(context.toast, result.message || fallback);
      if (!isSiteSetupAvailable()) {
        mountHubSetupUnavailable(viewport, context);
      }
      return false;
    }
    return true;
  }

  nextButton.addEventListener('click', () => {
    void (async () => {
      nextButton.disabled = true;
      try {
        const stepId = currentStepId();

        if (stepId === 'hub') {
          const name = hubName.input.value.trim();
          if (!name) {
            showToast(context.toast, 'Enter a hub name.');
            return;
          }
          const result = await saveSiteProfile({
            hubName: name,
            useCase: useCase.select.value
          });
          if (!handleSaveResult(result, 'Could not save.')) return;
          applyShellBranding({
            shellEyebrow: document.querySelector('#shell-eyebrow'),
            shellTagline: document.querySelector('#shell-tagline')
          });
        }

        if (stepId === 'contacts') {
          const primaryInputs = /** @type {HTMLInputElement[]} */ (
            primaryGroup.querySelectorAll('input')
          );
          const secondaryInputs = /** @type {HTMLInputElement[]} */ (
            secondaryGroup.querySelectorAll('input')
          );
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
          if (!contacts.primaryContact.name) {
            showToast(context.toast, 'Enter a primary contact name.');
            return;
          }
          const profileResult = await saveSiteProfile(contacts);
          if (!handleSaveResult(profileResult, 'Could not save contacts.')) return;
          const secretsResult = await saveHubSecrets(contactSecretsPatch(contacts));
          if (!handleSaveResult(secretsResult, 'Could not save contact details.')) return;
        }

        if (stepId === 'pets') {
          const petCare = petFields.readPetCare();
          if (petCare.hasPets && !petCare.name) {
            showToast(context.toast, 'Enter your pet\'s name, or choose No pets to look after.');
            return;
          }
          const result = await saveSiteProfile({ petCare });
          if (!handleSaveResult(result, 'Could not save pet details.')) return;
        }

        if (stepId === 'access') {
          const pin = guestFields.ownerPin.input.value.trim();
          if (pin && !/^\d{4}$/.test(pin)) {
            showToast(context.toast, 'Owner PIN must be exactly 4 digits.');
            return;
          }
          const secretsResult = await saveHubSecrets(readGuestAccessSecrets(guestFields));
          if (!handleSaveResult(secretsResult, 'Could not save guest access details.')) return;
          const addressPatch = readPropertyAddressProfilePatch(guestFields);
          const addressResult = await saveSiteProfile(addressPatch);
          if (!handleSaveResult(addressResult, 'Could not save property address.')) return;
          const weatherResult = await syncWeatherLocationFromPropertyAddress(
            addressPatch.propertyAddress
          );
          if (!weatherResult.ok && !weatherResult.skipped) {
            showToast(
              context.toast,
              weatherResult.message || 'Address saved, but weather location could not be updated.',
              5000
            );
          }
        }

        if (stepId === 'bins') {
          const binSchedule = binFields.readBinSchedule();
          const validation = validateBinSchedule(binSchedule);
          if (!validation.ok) {
            showToast(context.toast, validation.message || 'Could not save bin schedule.');
            return;
          }
          const result = await saveSiteProfile({ binSchedule });
          if (!handleSaveResult(result, 'Could not save bin schedule.')) return;
        }

        if (stepId === 'calendar') {
          const calendarPatch = calendarFields.readCalendarPatch();
          if (Object.keys(calendarPatch).length) {
            const secretsResult = await saveHubSecrets(calendarPatch);
            if (!handleSaveResult(secretsResult, 'Could not save calendar link.')) return;
          }
        }

        if (stepId === 'guide') {
          const wasRerun = isHubSetupWizardRerunRequested();
          const result = await saveSiteProfile({ onboardingComplete: true });
          if (!handleSaveResult(result, 'Could not finish setup.')) return;
          resetHubSetupWizardStep();
          clearHubSetupWizardRerunRequest();
          await syncSiteProfileFromServer();
          applyShellBranding({
            shellEyebrow: document.querySelector('#shell-eyebrow'),
            shellTagline: document.querySelector('#shell-tagline')
          });
          showToast(context.toast, wasRerun ? 'Hub setup updated.' : 'Hub setup complete.');
          context.navigate('home');
          return;
        }

        step += 1;
        setHubSetupWizardStep(step);
        renderStep();
      } finally {
        nextButton.disabled = false;
      }
    })();
  });

  renderStep();
}

/**
 * @param {HTMLElement} viewport
 * @param {import('../../types/app.js').ShellContext} context
 */
function mountHubSetup(viewport, context) {
  if (!isSiteSetupAvailable()) {
    mountHubSetupUnavailable(viewport, context);
    return;
  }
  if (isOnboardingComplete() && !isHubSetupWizardRerunRequested()) {
    context.navigate('home');
    return;
  }
  mountHubSetupWizard(viewport, context);
}

export const hubSetupApp = defineApp({
  id: 'hub-setup',
  title: 'Hub setup',
  iconId: 'settings',
  description: 'First-time setup wizard for your home hub',
  capabilities: ['setup'],
  accent: '#7b66ff',
  profiles: ['owner'],
  mount(viewport, context) {
    void syncSiteProfileFromServer().finally(() => mountHubSetup(viewport, context));
  }
});
