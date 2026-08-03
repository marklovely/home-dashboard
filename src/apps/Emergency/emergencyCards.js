import { isTestHubEnvironment } from '../../auth/hubEnvironment.js';
import { getGuideCategory, getGuideTopic } from '../../services/guideService.js';
import { getSiteProfileState } from '../../services/siteProfileService.js';

/** @typedef {{ id: string, label: string, subtitle?: string, iconId: string, kind: 'contact', person: 'primary' | 'secondary' } | { id: string, label: string, subtitle?: string, iconId: string, kind: 'topic', topicId: string }} EmergencyCard */

const EMERGENCY_TOPIC_ICON_IDS = {
  vet: 'heart-pulse',
  'water-stop-tap': 'droplets',
  'water-emergency': 'droplets',
  'fuse-box': 'zap',
  'electrical-emergency': 'zap',
  'general-safety': 'cross',
  'utility-emergencies': 'droplets',
  'emergency-services': 'cross',
  'lock-key-issues': 'key-round'
};

const DEFAULT_TOPIC_ICON = 'circle-alert';

/** Topic ids that duplicate the dedicated contact cards. */
const SKIP_EMERGENCY_TOPIC_IDS = new Set(['contacting-mark-donna']);

/** Legacy topic ids used before emergency categories were normalised. */
const LEGACY_EMERGENCY_TOPIC_IDS = ['vet', 'water-stop-tap', 'fuse-box', 'general-safety'];

function isVanillaEmergencyHub() {
  if (isTestHubEnvironment()) return true;
  const profile = getSiteProfileState()?.profile ?? {};
  return profile.onboardingComplete !== true;
}

/**
 * @param {string} name
 * @param {string} fallback
 */
function contactLabel(name, fallback) {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return fallback;
  return `${trimmed} — contact details`;
}

/**
 * @param {string} topicId
 */
function topicIconId(topicId) {
  return EMERGENCY_TOPIC_ICON_IDS[topicId] ?? DEFAULT_TOPIC_ICON;
}

/**
 * @param {import('../../types/guideContent.js').GuideTopic} topic
 * @returns {EmergencyCard}
 */
function topicToCard(topic) {
  return {
    id: `topic-${topic.id}`,
    kind: 'topic',
    label: topic.title ?? topic.id,
    subtitle: topic.subtitle ?? '',
    iconId: topicIconId(topic.id),
    topicId: topic.id
  };
}

/**
 * @returns {EmergencyCard[]}
 */
export function buildEmergencyCards() {
  const profile = getSiteProfileState()?.profile ?? {};
  const primary = profile.primaryContact ?? {};
  const secondary = profile.secondaryContact ?? {};
  const vanilla = isVanillaEmergencyHub();
  const primaryName = String(primary.name ?? '').trim();
  const secondaryName = String(secondary.name ?? '').trim();

  /** @type {EmergencyCard[]} */
  const cards = [
    {
      id: 'contact-primary',
      kind: 'contact',
      person: 'primary',
      label: contactLabel(primaryName, 'Primary contact'),
      subtitle: vanilla ? 'Add details in hub setup' : 'Questions about the house',
      iconId: 'notebook'
    }
  ];

  if (secondaryName) {
    cards.push({
      id: 'contact-secondary',
      kind: 'contact',
      person: 'secondary',
      label: contactLabel(secondaryName, 'Secondary contact'),
      subtitle: vanilla ? 'Optional backup contact' : 'We would rather you asked than worried',
      iconId: 'notebook'
    });
  }

  const emergencyCategory = getGuideCategory('emergency');
  if (emergencyCategory?.topics?.length) {
    for (const topic of emergencyCategory.topics) {
      if (!topic?.id || SKIP_EMERGENCY_TOPIC_IDS.has(topic.id)) continue;
      cards.push(topicToCard(topic));
    }
    return cards;
  }

  if (vanilla) {
    return cards;
  }

  for (const topicId of LEGACY_EMERGENCY_TOPIC_IDS) {
    const topic = getGuideTopic(topicId);
    if (!topic) continue;
    cards.push(topicToCard(topic));
  }

  return cards;
}
