/**
 * @param {import('../../types/app.js').App} app
 * @param {() => void} onSelect
 */
function createLauncherCard(app, onSelect) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'home-launcher-card';
  button.style.setProperty('--accent', app.accent ?? '#8b7cff');
  button.setAttribute('aria-label', app.title);

  const icon = document.createElement('span');
  icon.className = 'home-launcher-icon';
  icon.textContent = app.icon;

  const title = document.createElement('span');
  title.className = 'home-launcher-title';
  title.textContent = app.title;

  button.append(icon, title);
  button.addEventListener('click', onSelect);
  return button;
}

/**
 * @param {HTMLElement} viewport
 * @param {import('../../types/app.js').App[]} apps
 * @param {(appId: string) => void} navigate
 */
export function renderHomeScreen(viewport, apps, navigate) {
  viewport.replaceChildren();

  const page = document.createElement('section');
  page.className = 'app-page home-screen';
  page.setAttribute('aria-label', 'Home');

  const grid = document.createElement('div');
  grid.className = 'home-launcher';
  grid.setAttribute('role', 'list');

  for (const app of apps) {
    const card = createLauncherCard(app, () => navigate(app.id));
    card.setAttribute('role', 'listitem');
    grid.append(card);
  }

  page.append(grid);
  viewport.append(page);
}
