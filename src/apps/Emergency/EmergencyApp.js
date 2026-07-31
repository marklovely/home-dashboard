import { defineApp } from '../../components/App/defineApp.js';
import { renderIcon } from '../../components/icons/renderIcon.js';
import {
  openEmergencyTopicOverlay,
  openOwnerContactOverlay
} from './emergencyDetailOverlay.js';

/** @typedef {{ id: string, label: string, subtitle?: string, iconId: string, kind: 'contact', person: 'mark' | 'donna' } | { id: string, label: string, subtitle?: string, iconId: string, kind: 'topic', topicId: string }} EmergencyCard */

/** @type {EmergencyCard[]} */
const EMERGENCY_CARDS = [
  {
    id: 'contact-mark',
    kind: 'contact',
    label: 'Mark — contact details',
    subtitle: 'Questions about the house or Scooter',
    iconId: 'notebook',
    person: 'mark'
  },
  {
    id: 'contact-donna',
    kind: 'contact',
    label: 'Donna — contact details',
    subtitle: 'We would rather you asked than worried',
    iconId: 'notebook',
    person: 'donna'
  },
  {
    id: 'vet',
    kind: 'topic',
    label: 'Vet',
    subtitle: 'Vets 4 Pets — Waterlooville',
    iconId: 'heart-pulse',
    topicId: 'vet'
  },
  {
    id: 'water-stop',
    kind: 'topic',
    label: 'Water stop tap',
    subtitle: 'Turn off the water supply',
    iconId: 'droplets',
    topicId: 'water-stop-tap'
  },
  {
    id: 'fuse-box',
    kind: 'topic',
    label: 'Fuse box',
    subtitle: 'Consumer unit in the garage',
    iconId: 'zap',
    topicId: 'fuse-box'
  },
  {
    id: 'first-aid',
    kind: 'topic',
    label: 'First aid',
    subtitle: 'Safety notes and NHS guidance',
    iconId: 'cross',
    topicId: 'general-safety'
  }
];

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
  for (const card of EMERGENCY_CARDS) {
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
  summary: () => ({ title: 'Help is here', subtitle: 'Owner contacts, vet, utilities' }),
  mount: mountEmergencyApp
});
