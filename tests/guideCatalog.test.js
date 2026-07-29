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

const FORBIDDEN = [
  'Content coming soon',
  'REDACTED_WIFI_PASSWORD',
  'REDACTED_WIFI_SSID',
  'mark.lovely67@gmail.com',
  'REDACTED_CUSTOMER_EMAIL',
  'REDACTED_PHONE',
  'REDACTED_POSTCODE'
];

describe('guide catalog fixture', () => {
  it('does not contain placeholder or sensitive committed strings', () => {
    for (const needle of FORBIDDEN) {
      expect(catalogRaw).not.toContain(needle);
    }
  });

  it('every category has at least one topic with blocks', () => {
    const catalog = getJsonCatalog();
    for (const category of catalog.categories) {
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
      config: { accessCode: 'test', buttons: [] },
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
