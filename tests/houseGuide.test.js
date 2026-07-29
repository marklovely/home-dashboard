import { describe, expect, it } from 'vitest';
import { searchHouseGuidePages, highlightSearchText } from '../src/widgets/HouseGuide/search.js';
import { HOUSE_GUIDE_PAGES } from '../src/content/houseguide/pages.js';

describe('house guide search', () => {
  const markdownBySlug = new Map([
    ['kitchen', '# Kitchen\n\nContent coming soon.'],
    ['wifi', '# Wi-Fi\n\nNetwork name and password will go here.']
  ]);

  it('returns all pages when query is empty', () => {
    const matches = searchHouseGuidePages('', HOUSE_GUIDE_PAGES, markdownBySlug);
    expect(matches.size).toBe(HOUSE_GUIDE_PAGES.length);
  });

  it('matches page titles and markdown text', () => {
    expect(searchHouseGuidePages('kitchen', HOUSE_GUIDE_PAGES, markdownBySlug).has('kitchen')).toBe(true);
    expect(searchHouseGuidePages('password', HOUSE_GUIDE_PAGES, markdownBySlug).has('wifi')).toBe(true);
    expect(searchHouseGuidePages('garage', HOUSE_GUIDE_PAGES, markdownBySlug).size).toBe(0);
  });

  it('highlights matched substrings in titles', () => {
    expect(highlightSearchText('Kitchen', 'kit')).toContain('<mark class="guide-search-mark">Kit</mark>');
  });
});
