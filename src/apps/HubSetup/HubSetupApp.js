import { defineApp } from '../../components/App/defineApp.js';
import { showToast } from '../../js/modules/toast.js';
import {
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
import { buildStarterGuideCatalog } from '../../content/houseguide/templates/buildStarterGuideCatalog.js';
import {
  getStarterGuideTemplate
} from '../../content/houseguide/templates/starterGuideTemplates.js';
import { importHouseGuideCatalog } from '../../api/houseGuideApi.js';
import {
  getSiteProfileState,
  getSiteSetupUnavailableMessage,
  isOnboardingComplete,
  isSiteSetupAvailable,
  saveHubSecrets,
  saveSiteProfile,
  syncSiteProfileFromServer
} from '../../services/siteProfileService.js';
import { refreshGuideContent } from '../../services/guideContentService.js';
import { applyShellBranding } from '../../shell/shellBranding.js';
import {
  getHubSetupWizardStep,
  resetHubSetupWizardStep,
  setHubSetupWizardStep
} from './hubSetupWizardState.js';

const USE_CASE_OPTIONS = [
  { value: 'owner', label: 'Owner only' },
  { value: 'housesitter', label: 'Trusted housesitters / long stays' },
  { value: 'airbnb', label: 'Airbnb / short lets' },
  { value: 'both', label: 'Both sitters and short lets' }
];

/** @typedef {'hub' | 'contacts' | 'pets' | 'access' | 'guide'} WizardStepId */

/**
 * @param {string} useCase
 * @returns {WizardStepId[]}
 */
function getWizardSteps(useCase) {
  /** @type {WizardStepId[]} */
  const steps = ['hub', 'contacts'];
  if (useCase === 'housesitter' || useCase === 'both') {
    steps.push('pets');
  }
  steps.push('access', 'guide');
  return steps;
}

/**
 * @param {HTMLElement} viewport
 * @param {import('../../types/app.js').ShellContext} context
 */
function mountHubSetupUnavailable(viewport, context) {
  const page = document.createElement('section');
  page.className = 'app-page settings-app hub-setup-app';
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
  const profile = profileState?.profile ?? {};

  let step = getHubSetupWizardStep();

  const header = document.createElement('header');
  header.className = 'hub-setup-header';
  const title = document.createElement('h1');
  title.className = 'hub-setup-title';
  title.textContent = 'Set up your hub';
  const progress = document.createElement('p');
  progress.className = 'hub-setup-progress subtle';
  header.append(title, progress);

  const body = document.createElement('div');
  body.className = 'hub-setup-body';

  const actions = document.createElement('div');
  actions.className = 'hub-setup-actions';

  const backButton = document.createElement('button');
  backButton.type = 'button';
  backButton.className = 'settings-action-button settings-action-button--secondary';
  backButton.textContent = 'Back';

  const nextButton = document.createElement('button');
  nextButton.type = 'button';
  nextButton.className = 'settings-action-button';
  nextButton.textContent = 'Continue';

  actions.append(backButton, nextButton);
  page.append(header, body, actions);
  viewport.replaceChildren(page);

  const hubName = createSetupField('Hub name', String(profile.hubName ?? ''), {
    placeholder: 'Rose Cottage Hub',
    required: true
  });
  const useCase = createSetupSelect(
    'How will guests use this hub?',
    String(profile.useCase ?? 'owner'),
    USE_CASE_OPTIONS
  );

  const primaryGroup = createContactGroup('Primary contact', profile.primaryContact ?? {});
  const secondaryGroup = createContactGroup('Secondary contact (optional)', profile.secondaryContact ?? {});

  const guestFields = createGuestAccessFields(profile);
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

  function renderStep() {
    setHubSetupWizardStep(step);
    progress.textContent = `Step ${step + 1} of ${wizardSteps().length}`;
    body.replaceChildren();
    backButton.hidden = step === 0;
    nextButton.textContent = isLastWizardStep() ? 'Finish setup' : 'Continue';

    const stepId = currentStepId();

    if (stepId === 'hub') {
      body.append(
        createSetupIntro('Give your hub a name and choose how guests will use it. You can change these later in Settings.'),
        hubName.wrap,
        useCase.wrap
      );
      return;
    }

    if (stepId === 'contacts') {
      body.append(
        createSetupIntro('Who should guests call? Names appear in the House Guide; phone and email are stored securely on your hub.'),
        primaryGroup,
        secondaryGroup
      );
      return;
    }

    if (stepId === 'pets') {
      body.append(petFields.wrap);
      return;
    }

    if (stepId === 'access') {
      body.append(guestFields.wrap);
      return;
    }

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
    const starterHelp = createSetupInfoHint(starterTemplate.hint, 'What is the starter guide?');
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
          const addressResult = await saveSiteProfile(readPropertyAddressProfilePatch(guestFields));
          if (!handleSaveResult(addressResult, 'Could not save property address.')) return;
        }

        if (stepId === 'guide') {
          const result = await saveSiteProfile({ onboardingComplete: true });
          if (!handleSaveResult(result, 'Could not finish setup.')) return;
          resetHubSetupWizardStep();
          await syncSiteProfileFromServer();
          applyShellBranding({
            shellEyebrow: document.querySelector('#shell-eyebrow'),
            shellTagline: document.querySelector('#shell-tagline')
          });
          showToast(context.toast, 'Hub setup complete.');
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
  if (isOnboardingComplete()) {
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
