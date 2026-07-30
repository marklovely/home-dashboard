import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clockFormatLabel,
  getClockFormat,
  getHomeScreenScale,
  homeScreenScaleLabel,
  initDisplayPreferences,
  resetDisplayPreferencesForTests,
  setClockFormat,
  setHomeScreenScale
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

  it('defaults to 24-hour clock and default home scale', () => {
    setClockFormat('24');
    expect(getClockFormat()).toBe('24');
    expect(clockFormatLabel()).toBe('24-hour');
    expect(getHomeScreenScale()).toBe('1');
    expect(homeScreenScaleLabel()).toBe('Default');
    expect(document.documentElement.style.getPropertyValue('--home-ui-scale')).toBe('1');
  });

  it('persists 12-hour clock preference', () => {
    setClockFormat('12');
    expect(getClockFormat()).toBe('12');
    expect(localStorage.getItem('home-hub-clock-format')).toBe('12');
  });

  it('persists home screen scale preference', () => {
    setHomeScreenScale('1.2');
    expect(getHomeScreenScale()).toBe('1.2');
    expect(homeScreenScaleLabel()).toBe('Extra large');
    expect(localStorage.getItem('home-hub-home-scale')).toBe('1.2');
    expect(document.documentElement.style.getPropertyValue('--home-ui-scale')).toBe('1.2');
  });

  it('restores stored preferences on init', () => {
    localStorage.setItem('home-hub-clock-format', '12');
    localStorage.setItem('home-hub-home-scale', '1.1');
    initDisplayPreferences();
    expect(getClockFormat()).toBe('12');
    expect(getHomeScreenScale()).toBe('1.1');
  });
});
