import { describe, expect, it } from 'vitest';
import { findBestGuideTopic, getGuideHomeSummary, searchGuideTopics } from '../src/services/guideService.js';
import { highlightGuideText } from '../src/widgets/HouseGuide/highlight.js';

describe('guide service', () => {
  it('returns a meaningful home summary without document counts', () => {
    const summary = getGuideHomeSummary();
    expect(summary.title.toLowerCase()).not.toContain('markdown');
    expect(summary.title).not.toMatch(/\d+\s+guide/i);
    expect(summary.subtitle.length).toBeGreaterThan(0);
  });

  it('finds TV when searching television', () => {
    const results = searchGuideTopics('television');
    expect(results[0]?.id).toBe('tv');
  });

  it('finds Wi-Fi for wifi and password concepts', () => {
    expect(searchGuideTopics('wifi')[0]?.id).toBe('wifi');
    expect(searchGuideTopics('password')[0]?.id).toBe('wifi');
  });

  it('surfaces heating immediately', () => {
    expect(findBestGuideTopic('heating')?.id).toBe('heating');
  });

  it('highlights matched substrings in titles', () => {
    expect(highlightGuideText('Heating', 'heat')).toContain('<mark class="guide-search-mark">');
  });
});
