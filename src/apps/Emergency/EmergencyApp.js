import { defineApp } from '../../components/App/defineApp.js';
import { renderIcon } from '../../components/icons/renderIcon.js';
import { getProtectedDisplayValue } from '../../content/houseguide/privateContent.js';
import { openHouseGuideTopic } from '../../services/guideNavigation.js';
import { createGuidePanelOverlay } from '../../widgets/HouseGuide/guideActions.js';

/** @typedef {{ id: string, label: string, subtitle?: string, iconId: string, kind: 'contact', person: 'mark' | 'donna' } | { id: string, label: string, subtitle?: string, iconId: string, kind: 'guide', topicId: string }} EmergencyCard */

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
    kind: 'guide',
    label: 'Vet',
    subtitle: 'Vets 4 Pets — Waterlooville',
    iconId: 'heart-pulse',
    topicId: 'vet'
  },
  {
    id: 'water-stop',
    kind: 'guide',
    label: 'Water stop tap',
    subtitle: 'Turn off the water supply',
    iconId: 'droplets',
    topicId: 'water-stop-tap'
  },
  {
    id: 'fuse-box',
    kind: 'guide',
    label: 'Fuse box',
    subtitle: 'Consumer unit in the garage',
    iconId: 'zap',
    topicId: 'fuse-box'
  },
  {
    id: 'first-aid',
    kind: 'guide',
    label: 'First aid',
    subtitle: 'Safety notes and NHS guidance',
    iconId: 'cross',
    topicId: 'general-safety'
  }
];

/**
 * @param {'mark' | 'donna'} person
 */
function buildOwnerContactPanel(person) {
  const prefix = person === 'mark' ? 'contacts.mark' : 'contacts.donna';
  const firstName = person === 'mark' ? 'Mark' : 'Donna';
  return createGuidePanelOverlay({
    type: 'panel',
    label: `Contact ${firstName}`,
    heading: `Contact ${firstName}`,
    items: [
      { label: 'Phone', value: getProtectedDisplayValue(`${prefix}.phone`, 'contact') },
      { label: 'Email', value: getProtectedDisplayValue(`${prefix}.email`, 'contact') }
    ]
  });
}

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

  if (card.kind === 'contact') {
    button.addEventListener('click', () => {
      host.querySelector('.guide-panel-overlay')?.remove();
      host.append(buildOwnerContactPanel(card.person));
    });
  } else {
    button.addEventListener('click', () => openHouseGuideTopic(context, card.topicId));
  }

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
