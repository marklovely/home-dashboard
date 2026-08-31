import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getJsonCatalog } from '../src/content/houseguide/providers/jsonGuideProvider.js';
import { getProtectedDisplayValue } from '../src/content/houseguide/privateContent.js';
import { findBestGuideTopic, searchGuideTopics } from '../src/services/guideService.js';
import { houseGuideWidget } from '../src/widgets/HouseGuide/HouseGuideWidget.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const catalogRaw = readFileSync(join(__dirname, '../src/content/houseguide/guide-catalog.json'), 'utf8');

const FORBIDDEN_PLACEHOLDERS = ['Content coming soon'];

/**
 * Classes of personal data that must never reach a committed fixture. Patterns
 * rather than examples, so this file cannot leak what it is guarding against.
 */
const FORBIDDEN_PATTERNS = [
  { label: 'email address', pattern: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i },
  { label: 'UK mobile number', pattern: /\b07\d{9}\b/ }
];

const POSTCODE_RE = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/g;

/**
 * Known household secrets (Wi-Fi name, Wi-Fi password, home postcode) held as
 * SHA-256 digests so this file cannot leak the values it guards against.
 * Public venue postcodes in the local-area guide are expected and allowed.
 */
const FORBIDDEN_TOKEN_HASHES = new Set([
  '569aec22ee70c4b310b9b3d33090d350941742b8b936671ef351595f05382184',
  'e16fb790ce2520cedac8a5c32a9c8d748ca956c2f053fe524bcd0ae1d9841859',
  '1cce73b769492b5272a5ff918c29d0a2774c3195155e1e0d266492f5fec0e489'
]);

/**
 * @param {string} value
 */
function sha256Hex(value) {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * @param {string} text
 * @param {Set<string>} hashes
 * @returns {string[]} matched tokens
 */
function leakedTokens(text, hashes) {
  const tokens = new Set(text.split(/[^A-Za-z0-9]+/).filter(Boolean));
  for (const match of text.matchAll(POSTCODE_RE)) {
    tokens.add(match[0].replace(/\s+/g, '').toUpperCase());
  }
  return [...tokens].filter((token) => hashes.has(sha256Hex(token)));
}

describe('guide catalog fixture', () => {
  it('does not contain placeholder strings', () => {
    for (const needle of FORBIDDEN_PLACEHOLDERS) {
      expect(catalogRaw).not.toContain(needle);
    }
  });

  it('does not contain personal data', () => {
    for (const { label, pattern } of FORBIDDEN_PATTERNS) {
      expect(pattern.test(catalogRaw), `catalog contains a ${label}`).toBe(false);
    }
  });

  it('does not contain known household secrets', () => {
    expect(leakedTokens(catalogRaw, FORBIDDEN_TOKEN_HASHES)).toEqual([]);
  });

  it('detects a planted secret so the hashed guard cannot silently pass', () => {
    const planted = new Set([sha256Hex('SW1A1AA'), sha256Hex('SecretWifiValue')]);
    expect(leakedTokens('ssid SecretWifiValue at SW1A 1AA', planted).sort()).toEqual([
      'SW1A1AA',
      'SecretWifiValue'
    ]);
  });

  it('every category has at least one topic with blocks', () => {
    const catalog = getJsonCatalog();
    for (const category of catalog.categories) {
      if (category.id === 'appliance-manuals') continue;
      expect(category.topics.length).toBeGreaterThan(0);
      for (const topic of category.topics) {
        expect(topic.blocks?.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('protected content', () => {
  it('renders safe placeholders when private values are absent', () => {
    const value = getProtectedDisplayValue('wifi.password', 'wifi');
    expect(value).toContain('secure house-sitter access');
    expect(value).not.toBe('undefined');
  });
});

describe('house guide search aliases', () => {
  it('maps kettle and tea to hot water machine topic', () => {
    expect(findBestGuideTopic('kettle')?.id).toBe('hot-and-cold-water-machine');
    expect(findBestGuideTopic('tea')?.id).toBe('hot-and-cold-water-machine');
  });

  it('maps Netflix to streaming services', () => {
    expect(searchGuideTopics('Netflix')[0]?.id).toBe('streaming-services');
  });

  it('maps bins to rubbish topic', () => {
    expect(findBestGuideTopic('bins')?.id).toBe('rubbish-recycling');
  });
});

describe('house guide landing layout', () => {
  it('places search above category grid', () => {
    const context = {
      config: { buttons: [] },
      toast: document.createElement('div'),
      lastCommand: document.createElement('div')
    };
    const root = houseGuideWidget.mount(context);
    const explore = root.querySelector('.house-guide-explore');
    const children = [...explore.children].map((node) => node.className);
    const searchIndex = children.findIndex((name) => name.includes('guide-search'));
    const gridIndex = children.findIndex((name) => name.includes('guide-category-grid'));
    expect(searchIndex).toBeGreaterThan(-1);
    expect(gridIndex).toBeGreaterThan(-1);
    expect(searchIndex).toBeLessThan(gridIndex);
  });
});
