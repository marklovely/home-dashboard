import { describe, expect, it } from 'vitest';
import { resolveGuideMedia, listBundledMediaStems, listCatalogMediaIds } from '../src/content/houseguide/guideMedia.js';
import {
  assertGuideMediaCatalogValid,
  collectReferencedMediaIds,
  validateGuideMediaCatalog
} from '../src/content/houseguide/guideMediaValidate.js';
import { renderGuideMediaFallback } from '../src/widgets/HouseGuide/guideImageUi.js';
import { getGuideTopic } from '../src/services/guideService.js';
import { renderGuideTopicPage } from '../src/widgets/HouseGuide/guidePageRenderer.js';

const EXPECTED_IMAGES = [
  'fuse-box',
  'water-stop-tap',
  'tv-remote-source-button',
  'ev-charger-lockbox',
  'garden-hose-bins',
  'weber-bbq',
  'hot-water-machine-controls'
];

describe('guide media resolver', () => {
  it('bundles all seven expected image stems', () => {
    const stems = listBundledMediaStems();
    for (const id of EXPECTED_IMAGES) {
      expect(stems).toContain(id);
    }
  });

  it('resolves every catalog mediaId to a production-safe URL', () => {
    for (const mediaId of listCatalogMediaIds()) {
      const result = resolveGuideMedia(mediaId);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.alt.length).toBeGreaterThan(0);
        expect(result.url).toMatch(/\.jpg($|\?)/i);
        expect(result.url).not.toContain('undefined');
      }
    }
  });

  it('returns a safe failure for unknown media IDs', () => {
    const result = resolveGuideMedia('not-a-real-image');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('unknown-media-id');
      expect(result.availableMediaIds.length).toBeGreaterThan(0);
    }
  });

  it('renders a visible fallback for unresolved media', () => {
    const node = renderGuideMediaFallback({ mediaId: 'missing-example' });
    expect(node.textContent).toContain('Image unavailable: missing-example');
  });
});

describe('guide media catalog validation', () => {
  it('passes validation with no blocking issues', () => {
    expect(() => assertGuideMediaCatalogValid()).not.toThrow();
    const result = validateGuideMediaCatalog();
    expect(result.ok).toBe(true);
  });

  it('references all catalog media IDs from topic blocks', () => {
    const referenced = collectReferencedMediaIds();
    for (const mediaId of listCatalogMediaIds()) {
      expect(referenced.has(mediaId)).toBe(true);
    }
  });
});

describe('hero image rendering', () => {
  it('renders an img element for hot water machine topic', () => {
    const topic = getGuideTopic('hot-and-cold-water-machine');
    expect(topic).toBeTruthy();
    const context = {
      config: { buttons: [] },
      toast: document.createElement('div'),
      lastCommand: document.createElement('div')
    };
    const page = renderGuideTopicPage(topic, context, () => {}, () => {});
    const img = page.querySelector('.guide-hero-image img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('alt')).toContain('water machine');
    expect(img?.getAttribute('src')).toMatch(/\/assets\/|hot-water-machine-controls/);
  });
});
