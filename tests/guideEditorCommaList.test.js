import { describe, expect, it } from 'vitest';
import {
  formatGuideCommaList,
  parseGuideCommaList
} from '../src/apps/HouseGuideEditor/guideEditorUi.js';

describe('guideEditor comma lists', () => {
  it('parses comma and semicolon separated values', () => {
    expect(parseGuideCommaList('netflix, wifi, kettle')).toEqual(['netflix', 'wifi', 'kettle']);
    expect(parseGuideCommaList('one; two, three')).toEqual(['one', 'two', 'three']);
  });

  it('trims empty segments', () => {
    expect(parseGuideCommaList('finding, , address,')).toEqual(['finding', 'address']);
  });

  it('formats lists for display', () => {
    expect(formatGuideCommaList(['netflix', 'wifi'])).toBe('netflix, wifi');
  });
});
