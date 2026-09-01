import { renderIcon } from '../../components/icons/renderIcon.js';
import { createOwnerHelpButton } from '../../components/HelpGuide/ownerHelp.js';
import { createSitterHelpButton } from '../../components/HelpGuide/sitterHelp.js';
import { mountBinAlertBannerHost } from '../../services/binAlertBannerSync.js';

/**
 * @param {import('../types/app.js').App} app
 * @param {() => void} onSelect
 */
function createLauncherCard(app, onSelect) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'home-launcher-card';
  button.style.setProperty('--accent', app.accent ?? '#7eab90');
  button.setAttribute('aria-label', `${app.title}. ${app.description}`);

  const iconWrap = document.createElement('span');
  iconWrap.className = 'home-launcher-icon';
  iconWrap.append(renderIcon(app.iconId, { size: 30, className: 'home-launcher-svg' }));

  const title = document.createElement('span');
  title.className = 'home-launcher-title';
  title.textContent = app.title;

  const liveTitle = document.createElement('span');
  liveTitle.className = 'home-launcher-live-title';
  liveTitle.textContent = '…';

  const liveSubtitle = document.createElement('span');
  liveSubtitle.className = 'home-launcher-live-subtitle';
  liveSubtitle.textContent = '';

  button.append(iconWrap, title, liveTitle, liveSubtitle);
  button.addEventListener('click', onSelect);
  return button;
}

/**
 * @param {HTMLElement} card
 * @param {import('../types/app.js').AppSummary} summary
 */
function applyCardSummary(card, summary) {
  const liveTitle = card.querySelector('.home-launcher-live-title');
  const liveSubtitle = card.querySelector('.home-launcher-live-subtitle');
  if (liveTitle) liveTitle.textContent = summary.title;
  if (liveSubtitle) {
    liveSubtitle.textContent = summary.subtitle ?? '';
    liveSubtitle.hidden = !summary.subtitle;
  }
}

/**
 * @param {HTMLElement} viewport
 * @param {import('../types/app.js').App[]} apps
 * @param {import('../types/app.js').ShellContext} context
 */
export async function renderHomeScreen(viewport, apps, context) {
  viewport.replaceChildren();

  const page = document.createElement('section');
  page.className = 'app-page home-screen';
  page.setAttribute('aria-label', 'Home');

  const grid = document.createElement('div');
  grid.className = 'home-launcher';
  grid.setAttribute('role', 'list');

  const cards = apps.map((app) => {
    const card = createLauncherCard(app, () => context.navigate(app.id));
    card.setAttribute('role', 'listitem');
    grid.append(card);
    return { app, card };
  });

  const binAlertHost = document.createElement('div');
  binAlertHost.className = 'home-bin-alert-host';
  mountBinAlertBannerHost(binAlertHost, (id) => context.navigate(id), { houseSitter: false });

  page.append(
    binAlertHost,
    grid
  );

  const helpSection = document.createElement('section');
  helpSection.className = 'owner-help-section';
  helpSection.setAttribute('aria-labelledby', 'owner-help-heading');

  const helpTitle = document.createElement('h2');
  helpTitle.id = 'owner-help-heading';
  helpTitle.className = 'owner-help-title';
  helpTitle.textContent = 'Need a hand?';

  const helpText = document.createElement('p');
  helpText.className = 'owner-help-text subtle';
  helpText.textContent = 'Owner guide covers the whole hub; Guest tablet guide shows what sitters see.';

  const helpActions = document.createElement('div');
  helpActions.className = 'owner-help-actions';
  helpActions.append(
    createOwnerHelpButton(),
    createSitterHelpButton({
      label: 'Guest tablet guide',
      buttonClassName: 'button-secondary owner-help-button'
    })
  );

  helpSection.append(helpTitle, helpText, helpActions);
  page.append(helpSection);
  viewport.append(page);

  await Promise.all(
    cards.map(async ({ app, card }) => {
      if (!app.summary) return;
      try {
        const summary = await app.summary(context);
        applyCardSummary(card, summary);
      } catch {
        applyCardSummary(card, { title: '—', subtitle: '' });
      }
    })
  );
}
