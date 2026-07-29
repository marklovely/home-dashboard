import { renderIcon } from '../../components/icons/renderIcon.js';

/**
 * @param {import('../types/app.js').App} app
 * @param {() => void} onSelect
 */
function createLauncherCard(app, onSelect) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'home-launcher-card';
  button.style.setProperty('--accent', app.accent ?? '#8b7cff');
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

  page.append(grid);
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
