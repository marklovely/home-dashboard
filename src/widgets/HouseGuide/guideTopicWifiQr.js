import { hasProtectedValue } from '../../content/houseguide/privateContent.js';
import { createWifiQrSection } from '../../components/WifiQr/createWifiQrSection.js';
import { createPrimaryContactSection } from '../../components/PrimaryContact/createPrimaryContactSection.js';
import { subscribeToPrivateConfig } from '../../services/privateConfigService.js';

const STALE_QR_PLACEHOLDER = /wi-fi qr code will appear here once secure house-sitter access is enabled/i;
const STALE_WIFI_ACCESS_TEXT =
  /wi-fi details are provided through secure house-sitter access/i;
const COMING_SOON_SUFFIX = /\s*\(coming\s*soon\)\s*$/i;

const QR_TOPIC_HEADER = {
  subtitle: 'Scan to join Wi‑Fi',
  summary: 'Quick join'
};

/** @param {import('../../types/guideContent.js').GuideTopic} topic */
export function topicShouldIncludePrimaryContact(topic) {
  return topic.id === 'qr-code-placeholder' || topic.id === 'troubleshooting';
}

/** @param {import('../../types/guideContent.js').GuideTopic} topic */
export function topicShouldIncludeWifiQr(topic) {
  if (topic.id === 'connecting' || topic.id === 'qr-code-placeholder') {
    return true;
  }

  return (topic.blocks ?? []).some(
    (block) =>
      block.type === 'wifiQr' ||
      (block.type === 'protected' && block.kind === 'wifi')
  );
}

/**
 * @param {import('../../types/guideContent.js').GuideBlock} block
 * @param {import('../../types/guideContent.js').GuideTopic} topic
 */
export function shouldSkipStaleGuideBlock(block, topic) {
  if (block.type === 'wifiQr') {
    return false;
  }

  if (
    block.type === 'protected' &&
    block.kind === 'contact' &&
    topicShouldIncludePrimaryContact(topic)
  ) {
    return true;
  }

  if (block.type === 'note' || block.type === 'text' || block.type === 'tip') {
    const text = `${block.heading ?? ''} ${block.content ?? ''}`;
    if (STALE_QR_PLACEHOLDER.test(text)) {
      return true;
    }
    if (STALE_WIFI_ACCESS_TEXT.test(text) && hasWifiCredentials()) {
      return true;
    }
  }

  return false;
}

function hasWifiCredentials() {
  return hasProtectedValue('wifi.ssid') && hasProtectedValue('wifi.password');
}

/**
 * Cloud CMS may still serve pre-QR placeholder copy in topic headers.
 * @param {import('../../types/guideContent.js').GuideTopic} topic
 */
export function resolveGuideTopicHeader(topic) {
  if (!hasWifiCredentials() || !topicShouldIncludeWifiQr(topic)) {
    return {
      title: topic.title,
      subtitle: topic.subtitle,
      summary: topic.summary
    };
  }

  if (topic.id === 'qr-code-placeholder') {
    return {
      title: topic.title,
      subtitle: QR_TOPIC_HEADER.subtitle,
      summary: QR_TOPIC_HEADER.summary
    };
  }

  return {
    title: topic.title,
    subtitle: stripComingSoonSuffix(topic.subtitle),
    summary: stripComingSoonSuffix(topic.summary)
  };
}

/** @param {string | undefined} text */
function stripComingSoonSuffix(text) {
  if (!text) {
    return text ?? '';
  }
  return text.replace(COMING_SOON_SUFFIX, '').trim();
}

/**
 * @param {import('../../types/guideContent.js').GuideTopic} topic
 * @param {HTMLElement} subtitleEl
 * @param {HTMLElement} summaryEl
 * @returns {(() => void) | undefined}
 */
export function wireGuideTopicHeaderRefresh(topic, subtitleEl, summaryEl) {
  if (!topicShouldIncludeWifiQr(topic)) {
    return undefined;
  }

  function refresh() {
    const headerText = resolveGuideTopicHeader(topic);
    subtitleEl.textContent = headerText.subtitle;
    summaryEl.textContent = headerText.summary;
  }

  refresh();
  return subscribeToPrivateConfig(refresh);
}

/**
 * @param {HTMLElement} body
 * @param {import('../../types/guideContent.js').GuideTopic} topic
 */
export function appendWifiQrSectionIfNeeded(body, topic) {
  if (!topicShouldIncludeWifiQr(topic)) {
    return;
  }

  if (body.querySelector('.guide-section-wifi-qr')) {
    return;
  }

  body.append(
    createWifiQrSection({
      heading: topic.id === 'qr-code-placeholder' ? undefined : 'Quick join',
      caption: 'Scan with your phone camera to join Wi‑Fi'
    })
  );
}

/**
 * @param {HTMLElement} body
 * @param {import('../../types/guideContent.js').GuideTopic} topic
 */
export function appendPrimaryContactSectionIfNeeded(body, topic) {
  if (!topicShouldIncludePrimaryContact(topic)) {
    return;
  }

  if (body.querySelector('.guide-section-primary-contact')) {
    return;
  }

  body.append(
    createPrimaryContactSection({
      intro:
        topic.id === 'qr-code-placeholder'
          ? 'If you have trouble connecting, contact Mark — we’re happy to help.'
          : undefined
    })
  );
}
