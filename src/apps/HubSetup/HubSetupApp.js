import { defineApp } from '../../components/App/defineApp.js';
import { showToast } from '../../js/modules/toast.js';
import {
  createContactGroup,
  createGuestAccessFields,
  createSetupField,
  createSetupIntro,
  createSetupSelect,
  contactSecretsPatch,
  readGuestAccessSecrets
} from '../../components/HubSetup/hubSetupFields.js';
import starterGuide from '../../content/houseguide/templates/starter-guide.json';
import { importHouseGuideCatalog } from '../../api/houseGuideApi.js';
import {
  getSiteProfileState,
  saveHubSecrets,
  saveSiteProfile,
  syncSiteProfileFromServer
} from '../../services/siteProfileService.js';
import { refreshGuideContent } from '../../services/guideContentService.js';

const USE_CASE_OPTIONS = [
  { value: 'owner', label: 'Owner only' },
  { value: 'housesitter', label: 'Trusted housesitters / long stays' },
  { value: 'airbnb', label: 'Airbnb / short lets' },
  { value: 'both', label: 'Both sitters and short lets' }
];

/**
 * @param {import('../../types/app.js').ShellContext} context
 */
function mountHubSetupApp(viewport, context) {
  const page = document.createElement('section');
  page.className = 'app-page settings-app hub-setup-app';
  page.setAttribute('aria-label', 'Hub setup');

  const profileState = getSiteProfileState();
  const profile = profileState?.profile ?? {};

  let step = 0;

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

  function renderStep() {
    progress.textContent = `Step ${step + 1} of 4`;
    body.replaceChildren();
    backButton.hidden = step === 0;
    nextButton.textContent = step === 3 ? 'Finish setup' : 'Continue';

    if (step === 0) {
      body.append(
        createSetupIntro('Give your hub a name and choose how guests will use it. You can change these later in Settings.'),
        hubName.wrap,
        useCase.wrap
      );
      return;
    }

    if (step === 1) {
      body.append(
        createSetupIntro('Who should guests call? Names appear in the House Guide; phone and email are stored securely on your hub.'),
        primaryGroup,
        secondaryGroup
      );
      return;
    }

    if (step === 2) {
      body.append(guestFields.wrap);
      return;
    }

    const guideIntro = createSetupIntro(
      'Start with a starter House Guide you can edit in the Guide Editor, or skip and add content later.'
    );
    const starterButton = document.createElement('button');
    starterButton.type = 'button';
    starterButton.className = 'settings-action-button';
    starterButton.textContent = 'Import starter guide';
    starterButton.addEventListener('click', () => {
      starterButton.disabled = true;
      void importHouseGuideCatalog(starterGuide).then(async (result) => {
        starterButton.disabled = false;
        if (!result.ok) {
          showToast(context.toast, result.message || 'Could not import starter guide.');
          return;
        }
        await refreshGuideContent(fetch, { draft: true, force: true });
        showToast(context.toast, 'Starter guide imported.');
      });
    });

    const skipNote = document.createElement('p');
    skipNote.className = 'subtle';
    skipNote.textContent = 'You can also copy your bundled guide or import JSON from Settings or the Guide Editor later.';

    body.append(guideIntro, starterButton, skipNote);
  }

  backButton.addEventListener('click', () => {
    if (step > 0) {
      step -= 1;
      renderStep();
    }
  });

  nextButton.addEventListener('click', () => {
    void (async () => {
      nextButton.disabled = true;
      try {
        if (step === 0) {
          const name = hubName.input.value.trim();
          if (!name) {
            showToast(context.toast, 'Enter a hub name.');
            return;
          }
          const result = await saveSiteProfile({
            hubName: name,
            useCase: useCase.select.value
          });
          if (!result.ok) {
            showToast(context.toast, result.message || 'Could not save.');
            return;
          }
          context.refreshShell?.();
        }

        if (step === 1) {
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
          if (!profileResult.ok) {
            showToast(context.toast, profileResult.message || 'Could not save contacts.');
            return;
          }
          const secretsResult = await saveHubSecrets(contactSecretsPatch(contacts));
          if (!secretsResult.ok) {
            showToast(context.toast, secretsResult.message || 'Could not save contact details.');
            return;
          }
        }

        if (step === 2) {
          const pin = guestFields.ownerPin.input.value.trim();
          if (pin && !/^\d{4}$/.test(pin)) {
            showToast(context.toast, 'Owner PIN must be exactly 4 digits.');
            return;
          }
          const secretsResult = await saveHubSecrets(readGuestAccessSecrets(guestFields));
          if (!secretsResult.ok) {
            showToast(context.toast, secretsResult.message || 'Could not save guest access details.');
            return;
          }
        }

        if (step === 3) {
          const result = await saveSiteProfile({ onboardingComplete: true });
          if (!result.ok) {
            showToast(context.toast, result.message || 'Could not finish setup.');
            return;
          }
          await syncSiteProfileFromServer();
          context.refreshShell?.();
          showToast(context.toast, 'Hub setup complete.');
          context.navigate('home');
          return;
        }

        step += 1;
        renderStep();
      } finally {
        nextButton.disabled = false;
      }
    })();
  });

  renderStep();
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
    void syncSiteProfileFromServer().finally(() => mountHubSetupApp(viewport, context));
  }
});
