import { defineApp } from '../../components/App/defineApp.js';
import { renderIcon } from '../../components/icons/renderIcon.js';
import { buildEmergencyCards } from './emergencyCards.js';
import {
  openEmergencyTopicOverlay,
  openOwnerContactOverlay
} from './emergencyDetailOverlay.js';

/** @typedef {import('./emergencyCards.js').EmergencyCard} EmergencyCard */

/**
 * @param {EmergencyCard} card
 * @param {import('../../types/app.js').ShellContext} context
 * @param {HTMLElement} host
 */
function createEmergencyCardElement(card, context, host) {
  const iconWrap = document.createElement('span');
  iconWrap.className = 'emergency-card-icon';
  iconWrap.append(renderIcon(card.iconId, { size: 28, className: 'emergency-card-svg' }));

  const title = document.createElement('span');
  title.className = 'emergency-card-title';
  title.textContent = card.label;

  const subtitle = document.createElement('span');
  subtitle.className = 'emergency-card-subtitle';
  subtitle.textContent = card.subtitle ?? '';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'emergency-card';
  button.setAttribute('aria-label', card.label);
  button.append(iconWrap, title, subtitle);

  button.addEventListener('click', () => {
    if (card.kind === 'contact') {
      openOwnerContactOverlay(host, card.person);
      return;
    }
    openEmergencyTopicOverlay(host, card.topicId, context);
  });

  return button;
}

/**
 * @param {HTMLElement} viewport
 * @param {import('../../types/app.js').ShellContext} context
 */
export function mountEmergencyApp(viewport, context) {
  viewport.replaceChildren();

  const page = document.createElement('section');
  page.className = 'app-page emergency-app';
  page.setAttribute('aria-label', 'Emergency');

  const banner = document.createElement('div');
  banner.className = 'emergency-banner';
  banner.innerHTML =
    '<strong>Immediate danger?</strong> Dial <strong>999</strong> for fire, medical, or security emergencies.';

  const grid = document.createElement('div');
  grid.className = 'emergency-grid';
  grid.setAttribute('role', 'list');
  for (const card of buildEmergencyCards()) {
    const element = createEmergencyCardElement(card, context, page);
    element.setAttribute('role', 'listitem');
    grid.append(element);
  }

  page.append(banner, grid);
  viewport.append(page);
}

export const emergencyApp = defineApp({
  id: 'emergency',
  title: 'Emergency',
  iconId: 'siren',
  description: 'Emergency contacts and essential house information',
  capabilities: ['contacts', 'offline', 'urgent'],
  accent: '#ff5f6d',
  profiles: ['housesitter'],
  summary: () => ({ title: 'Help is here', subtitle: 'Host contacts and essential house info' }),
  mount: mountEmergencyApp
});
