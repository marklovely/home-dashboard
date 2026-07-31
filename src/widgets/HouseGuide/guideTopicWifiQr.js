import { hasProtectedValue } from '../../content/houseguide/privateContent.js';
import { createWifiQrSection } from '../../components/WifiQr/createWifiQrSection.js';

const STALE_QR_PLACEHOLDER = /wi-fi qr code will appear here once secure house-sitter access is enabled/i;
const STALE_WIFI_ACCESS_TEXT =
  /wi-fi details are provided through secure house-sitter access/i;

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
 */
export function shouldSkipStaleGuideBlock(block) {
  if (block.type === 'wifiQr') {
    return false;
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
