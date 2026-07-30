import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clockFormatLabel,
  getClockFormat,
  initDisplayPreferences,
  resetDisplayPreferencesForTests,
  setClockFormat
} from '../src/services/displayPreferencesService.js';

describe('displayPreferencesService', () => {
  beforeEach(() => {
    localStorage.clear();
    resetDisplayPreferencesForTests();
  });

  afterEach(() => {
    resetDisplayPreferencesForTests();
    localStorage.clear();
  });

  it('defaults to 24-hour clock', () => {
    expect(getClockFormat()).toBe('24');
    expect(clockFormatLabel()).toBe('24-hour');
  });

  it('persists 12-hour clock preference', () => {
    setClockFormat('12');
    expect(getClockFormat()).toBe('12');
    expect(localStorage.getItem('home-hub-clock-format')).toBe('12');
  });

  it('restores stored preference on init', () => {
    localStorage.setItem('home-hub-clock-format', '12');
    initDisplayPreferences();
    expect(getClockFormat()).toBe('12');
  });
});
