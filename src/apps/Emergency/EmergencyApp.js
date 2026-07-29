import { defineApp } from '../../components/App/defineApp.js';
import { renderIcon } from '../../components/icons/renderIcon.js';
import { openHouseGuideTopic } from '../../services/guideNavigation.js';
import { phoneHref, resolveContactPhone } from '../../services/emergencyContacts.js';

/** @typedef {{ id: string, label: string, subtitle?: string, iconId: string, kind: 'call', contactKey: string } | { id: string, label: string, subtitle?: string, iconId: string, kind: 'guide', topicId: string }} EmergencyCard */

/** @type {EmergencyCard[]} */
const EMERGENCY_CARDS = [
  {
    id: 'call-mark',
    kind: 'call',
    label: 'Call Mark',
    subtitle: 'Questions about the house or Scooter',
    iconId: 'phone',
    contactKey: 'contacts.mark.phone'
  },
  {
    id: 'call-donna',
    kind: 'call',
    label: 'Call Donna',
    subtitle: 'We would rather you asked than worried',
    iconId: 'phone',
    contactKey: 'contacts.donna.phone'
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
  },
  {
    id: 'owners-guide',
    kind: 'guide',
    label: 'Useful numbers',
    subtitle: 'Owners, email, and non-urgent help',
    iconId: 'notebook',
    topicId: 'contacting-mark-donna'
  }
];

/**
 * @param {EmergencyCard} card
 * @param {import('../../types/app.js').ShellContext} context
 */
function createEmergencyCardElement(card, context) {
  const iconWrap = document.createElement('span');
  iconWrap.className = 'emergency-card-icon';
  iconWrap.append(renderIcon(card.iconId, { size: 28, className: 'emergency-card-svg' }));

  const title = document.createElement('span');
  title.className = 'emergency-card-title';
  title.textContent = card.label;

  const subtitle = document.createElement('span');
  subtitle.className = 'emergency-card-subtitle';
  subtitle.textContent = card.subtitle ?? '';

  if (card.kind === 'guide') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'emergency-card';
    button.setAttribute('aria-label', card.label);
    button.append(iconWrap, title, subtitle);
    button.addEventListener('click', () => openHouseGuideTopic(context, card.topicId));
    return button;
  }

  const phone = resolveContactPhone(card.contactKey);
  const href = phone ? phoneHref(phone) : null;
  if (href) {
    const link = document.createElement('a');
    link.className = 'emergency-card';
    link.href = href;
    link.setAttribute('aria-label', card.label);
    link.append(iconWrap, title, subtitle);
    return link;
  }

  subtitle.textContent = 'Contact details will appear when you are online.';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'emergency-card';
  button.disabled = true;
  button.append(iconWrap, title, subtitle);
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
    '<strong>Immediate danger?</strong> Call <a href="tel:999">999</a> for fire, medical, or security emergencies.';

  const grid = document.createElement('div');
  grid.className = 'emergency-grid';
  grid.setAttribute('role', 'list');
  for (const card of EMERGENCY_CARDS) {
    const element = createEmergencyCardElement(card, context);
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
  summary: () => ({ title: 'Help is here', subtitle: 'Owners, vet, utilities' }),
  mount: mountEmergencyApp
});
