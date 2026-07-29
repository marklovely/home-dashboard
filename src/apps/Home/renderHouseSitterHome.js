import { renderIcon } from '../../components/icons/renderIcon.js';
import { getAppDisplayTitle, getModeConfig } from '../../modes/modeConfig.js';
import { getWeatherSnapshot } from '../../services/homeWeatherSnapshot.js';

/** @type {Record<string, { headline: string, teaser?: string, teaserFromSummary?: 'title' | 'subtitle' }>} */
const ESSENTIAL_CARD_COPY = {
  scooter: { headline: 'Care guide', teaser: 'Walks · meals · bedtime' },
  'house-guide': {
    headline: 'Everything you need to know',
    teaser: 'Appliances · Wi‑Fi · Scooter · More'
  },
  controls: { headline: 'Lighting, heating, and scenes', teaserFromSummary: 'title' },
  emergency: { headline: 'Help is here', teaser: 'Owners, vet, utilities and more' }
};

/**
 * @param {import('../types/app.js').App} app
 * @param {() => void} onSelect
 * @param {{ essential?: boolean, secondary?: boolean }} [options]
 */
function createLauncherCard(app, onSelect, options = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'home-launcher-card';
  if (options.essential) button.classList.add('home-launcher-card--essential');
  if (options.secondary) button.classList.add('sitter-info-card');
  button.style.setProperty('--accent', app.accent ?? '#8b7cff');
  const titleText = getAppDisplayTitle(app);
  button.setAttribute('aria-label', `${titleText}. ${app.description}`);

  const iconWrap = document.createElement('span');
  iconWrap.className = 'home-launcher-icon';
  const iconSize = options.essential ? 36 : options.secondary ? 28 : 30;
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

  const textWrap = document.createElement('span');
  textWrap.className = 'home-launcher-text';
  textWrap.append(title, liveTitle, liveSubtitle);

  if (options.secondary) {
    button.append(iconWrap, textWrap);
  } else {
    button.append(iconWrap, title, liveTitle, liveSubtitle);
  }
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
 * @param {HTMLElement} card
 * @param {string} appId
 * @param {import('../types/app.js').AppSummary} summary
 */
function applyEssentialCardSummary(card, appId, summary) {
  const preset = ESSENTIAL_CARD_COPY[appId];
  const liveTitle = card.querySelector('.home-launcher-live-title');
  const liveSubtitle = card.querySelector('.home-launcher-live-subtitle');
  if (!preset) {
    applyCardSummary(card, summary);
    return;
  }
  if (liveTitle) liveTitle.textContent = preset.headline;
  if (liveSubtitle) {
    const teaser =
      preset.teaser ??
      (preset.teaserFromSummary === 'title'
        ? summary.title
        : preset.teaserFromSummary === 'subtitle'
          ? summary.subtitle
          : '') ??
      '';
    liveSubtitle.textContent = teaser;
    liveSubtitle.hidden = !teaser;
  }
}

/**
 * @param {HTMLElement} card
 * @param {import('../types/app.js').AppSummary} summary
 */
function applySecondaryWeatherSummary(card, summary) {
  const liveTitle = card.querySelector('.home-launcher-live-title');
  const liveSubtitle = card.querySelector('.home-launcher-live-subtitle');
  const subtitle = summary.subtitle ?? '';
  const condition = getWeatherSnapshot().condition ?? '';
  const looksLikeAlert =
    subtitle.length > 0 && !subtitle.includes('High ') && !subtitle.includes('°');
  if (liveTitle) {
    liveTitle.textContent = looksLikeAlert ? subtitle : condition || subtitle || 'Tap for forecast';
  }
  if (liveSubtitle) {
    if (looksLikeAlert && condition) {
      liveSubtitle.textContent = condition;
      liveSubtitle.hidden = false;
    } else {
      liveSubtitle.textContent = '';
      liveSubtitle.hidden = true;
    }
  }
}

/**
 * @param {string} title
 * @param {string} [subtext]
 */
function createSectionHeading(title, subtext) {
  const head = document.createElement('header');
  head.className = 'sitter-section-head';
  const heading = document.createElement('h2');
  heading.className = 'sitter-section-title';
  heading.textContent = title;
  head.append(heading);
  if (subtext) {
    const detail = document.createElement('p');
    detail.className = 'sitter-section-subtext';
    detail.textContent = subtext;
    head.append(detail);
  }
  return head;
}

/**
 * @param {import('../types/app.js').App[]} apps
 * @param {string[]} ids
 */
function pickAppsInOrder(apps, ids) {
  const byId = new Map(apps.map((app) => [app.id, app]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

/**
 * @param {HTMLElement} viewport
 * @param {import('../types/app.js').App[]} apps
 * @param {import('../types/app.js').ShellContext} context
 */
export async function renderHouseSitterHome(viewport, apps, context) {
  viewport.replaceChildren();

  const mode = getModeConfig();
  const essentials = pickAppsInOrder(apps, mode.sitterEssentialAppIds);
  const secondaries = pickAppsInOrder(apps, mode.sitterSecondaryAppIds);

  const page = document.createElement('section');
  page.className = 'app-page home-screen home-screen--sitter';
  page.setAttribute('aria-label', 'Home');

  const welcome = document.createElement('article');
  welcome.className = 'sitter-welcome-card';
  welcome.innerHTML = `
    <p class="sitter-welcome-emoji" aria-hidden="true">🏡</p>
    <h2 class="sitter-welcome-title">Welcome to Lovely Home</h2>
    <p class="sitter-welcome-lead">We're delighted you're looking after our home and Scooter.</p>
    <p class="sitter-welcome-body">Everything you'll need during your stay is available below.</p>
  `;

  const essentialsSection = document.createElement('section');
  essentialsSection.className = 'sitter-section';
  essentialsSection.setAttribute('aria-labelledby', 'sitter-essentials-heading');
  essentialsSection.append(
    createSectionHeading('Essentials', "The most important things you'll need.")
  );
  essentialsSection.querySelector('.sitter-section-title')?.setAttribute('id', 'sitter-essentials-heading');

  const essentialsGrid = document.createElement('div');
  essentialsGrid.className = 'sitter-essentials-grid';
  essentialsGrid.setAttribute('role', 'list');

  const essentialCards = essentials.map((app) => {
    const card = createLauncherCard(app, () => context.navigate(app.id), { essential: true });
    card.setAttribute('role', 'listitem');
    essentialsGrid.append(card);
    return { app, card };
  });
  essentialsSection.append(essentialsGrid);

  const infoSection = document.createElement('section');
  infoSection.className = 'sitter-section';
  infoSection.setAttribute('aria-labelledby', 'sitter-info-heading');
  infoSection.append(
    createSectionHeading('Useful information', 'Useful information during your stay.')
  );
  infoSection.querySelector('.sitter-section-title')?.setAttribute('id', 'sitter-info-heading');

  const infoGrid = document.createElement('div');
  infoGrid.className = 'sitter-secondary-grid';
  infoGrid.setAttribute('role', 'list');

  const secondaryCards = secondaries.map((app) => {
    const card = createLauncherCard(app, () => context.navigate(app.id), { secondary: true });
    card.setAttribute('role', 'listitem');
    infoGrid.append(card);
    return { app, card };
  });
  infoSection.append(infoGrid);

  const helpSection = document.createElement('section');
  helpSection.className = 'sitter-help-section';
  helpSection.setAttribute('aria-labelledby', 'sitter-help-heading');
  const helpCopy = document.createElement('div');
  helpCopy.className = 'sitter-help-copy';
  const helpTitle = document.createElement('h2');
  helpTitle.id = 'sitter-help-heading';
  helpTitle.className = 'sitter-help-title';
  helpTitle.textContent = 'Need help?';
  const helpText = document.createElement('p');
  helpText.className = 'sitter-help-text';
  helpText.textContent =
    'Open the House Guide for step-by-step instructions with photographs.';
  helpCopy.append(helpTitle, helpText);

  const helpButton = document.createElement('button');
  helpButton.type = 'button';
  helpButton.className = 'sitter-help-button';
  helpButton.append(
    renderIcon('book-open', { size: 20, className: 'sitter-help-button-icon' }),
    document.createTextNode('Open House Guide')
  );
  helpButton.addEventListener('click', () => context.navigate('house-guide'));
  helpSection.append(helpCopy, helpButton);

  page.append(welcome, essentialsSection, infoSection, helpSection);
  viewport.append(page);

  await Promise.all([
    ...essentialCards.map(async ({ app, card }) => {
      if (!app.summary) return;
      try {
        const summary = await app.summary(context);
        applyEssentialCardSummary(card, app.id, summary);
      } catch {
        applyEssentialCardSummary(card, app.id, { title: '', subtitle: '' });
      }
    }),
    ...secondaryCards.map(async ({ app, card }) => {
      if (!app.summary) return;
      try {
        const summary = await app.summary(context);
        if (app.id === 'weather') {
          applySecondaryWeatherSummary(card, summary);
        } else {
          applyCardSummary(card, summary);
        }
      } catch {
        applyCardSummary(card, { title: 'Available offline', subtitle: '' });
      }
    })
  ]);
}

export { createLauncherCard, applyCardSummary };
