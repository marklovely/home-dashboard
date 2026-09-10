import { describe, expect, it } from 'vitest';
import { binScheduleIntroForLocale, getBinScheduleLocale } from '../src/lib/binScheduleLocale.js';

describe('getBinScheduleLocale', () => {
  it('keeps UK alternating pattern and council terminology', () => {
    const locale = getBinScheduleLocale('GB');
    expect(locale.isUnitedKingdom).toBe(true);
    expect(locale.patternOptions.some((option) => option.value === 'alternating')).toBe(true);
    expect(locale.defaultHouseholdPattern).toBe('alternating');
    expect(locale.councilUrlLabel).toContain('Council');
  });

  it('uses generic patterns for non-UK countries', () => {
    const locale = getBinScheduleLocale('US');
    expect(locale.isUnitedKingdom).toBe(false);
    expect(locale.patternOptions.some((option) => option.value === 'alternating')).toBe(false);
    expect(locale.defaultHouseholdPattern).toBe('weekly');
    expect(locale.councilUrlLabel).toContain('Local');
    expect(locale.showCouncilPdfUpload).toBe(false);
    expect(locale.chooserPdfTitle).not.toContain('council');
  });

  it('emphasizes paste for OTHER country', () => {
    const locale = getBinScheduleLocale('OTHER');
    expect(locale.emphasizePaste).toBe(true);
    expect(locale.introUsesCouncilCalendar).toBe(false);
  });

  it('adjusts intro copy away from council calendar outside GB', () => {
    const gbIntro = binScheduleIntroForLocale(getBinScheduleLocale('GB'));
    const usIntro = binScheduleIntroForLocale(getBinScheduleLocale('US'));
    expect(gbIntro).toContain('council calendar');
    expect(usIntro).not.toContain('council calendar');
    expect(usIntro).toContain('local collection schedule');
  });
});
