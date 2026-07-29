import { describe, expect, it } from 'vitest';
import { findBestGuideTopic, getGuideHomeSummary, searchGuideTopics } from '../src/services/guideService.js';
import { highlightGuideText } from '../src/widgets/HouseGuide/highlight.js';

describe('guide service', () => {
  it('returns a meaningful home summary without document counts', () => {
    const summary = getGuideHomeSummary();
    expect(summary.title.toLowerCase()).not.toContain('markdown');
    expect(summary.title).not.toMatch(/\d+\s+guide/i);
    expect(summary.subtitle).toBe('Appliances • Wi-Fi • Scooter');
  });

  it('finds TV when searching television or Netflix', () => {
    expect(searchGuideTopics('television')[0]?.id).toBe('streaming-services');
    expect(searchGuideTopics('Netflix')[0]?.id).toBe('streaming-services');
  });

  it('finds Wi-Fi connecting topic for wifi', () => {
    expect(searchGuideTopics('wifi')[0]?.id).toBe('connecting');
  });

  it('surfaces Nest heating immediately', () => {
    expect(findBestGuideTopic('heating')?.id).toBe('nest-heating');
  });

  it('highlights matched substrings in titles', () => {
    expect(highlightGuideText('Heating', 'heat')).toContain('<mark class="guide-search-mark">');
  });
});
