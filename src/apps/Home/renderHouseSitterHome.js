import { renderIcon } from '../../components/icons/renderIcon.js';
import { getAppDisplayTitle } from '../../modes/modeConfig.js';

/**
 * @param {import('../types/app.js').App} app
 * @param {() => void} onSelect
 * @param {{ large?: boolean }} [options]
 */
function createLauncherCard(app, onSelect, options = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'home-launcher-card';
  if (options.large) button.classList.add('home-launcher-card--large');
  button.style.setProperty('--accent', app.accent ?? '#8b7cff');
  const titleText = getAppDisplayTitle(app);
  button.setAttribute('aria-label', `${titleText}. ${app.description}`);

  const iconWrap = document.createElement('span');
  iconWrap.className = 'home-launcher-icon';
  const iconSize = options.large ? 36 : 30;
  iconWrap.append(renderIcon(app.iconId, { size: iconSize, className: 'home-launcher-svg' }));

  const title = document.createElement('span');
  title.className = 'home-launcher-title';
  title.textContent = titleText;

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
export async function renderHouseSitterHome(viewport, apps, context) {
  viewport.replaceChildren();

  const page = document.createElement('section');
  page.className = 'app-page home-screen home-screen--sitter';
  page.setAttribute('aria-label', 'Home');

  const welcome = document.createElement('header');
  welcome.className = 'sitter-welcome';
  welcome.innerHTML = `
    <p class="sitter-welcome-emoji" aria-hidden="true">🏡</p>
    <h2 class="sitter-welcome-title">Welcome to Lovely Home</h2>
    <p class="sitter-welcome-lead">We're delighted you're looking after our home and Scooter.</p>
    <p class="sitter-welcome-body">Everything you'll need during your stay is available below.</p>
    <p class="sitter-welcome-body">If you're unsure about anything, the House Guide contains step-by-step instructions with photos.</p>
  `;

  const grid = document.createElement('div');
  grid.className = 'home-launcher home-launcher--sitter';
  grid.setAttribute('role', 'list');

  const cards = apps.map((app) => {
    const card = createLauncherCard(app, () => context.navigate(app.id), { large: true });
    card.setAttribute('role', 'listitem');
    grid.append(card);
    return { app, card };
  });

  const help = document.createElement('button');
  help.type = 'button';
  help.className = 'sitter-help-card';
  help.innerHTML =
    '<span class="sitter-help-kicker">Need help?</span><span class="sitter-help-text">Open the House Guide for step-by-step instructions with photographs.</span>';
  help.addEventListener('click', () => context.navigate('house-guide'));

  page.append(welcome, grid, help);
  viewport.append(page);

  await Promise.all(
    cards.map(async ({ app, card }) => {
      if (!app.summary) return;
      try {
        const summary = await app.summary(context);
        applyCardSummary(card, summary);
      } catch {
        applyCardSummary(card, { title: 'Available offline', subtitle: '' });
      }
    })
  );
}

export { createLauncherCard, applyCardSummary };
