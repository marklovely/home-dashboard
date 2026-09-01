import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getActiveTheme,
  getEffectiveTheme,
  initTheme,
  resetThemeForTests,
  setActiveTheme,
  toggleEffectiveTheme
} from '../src/services/themeService.js';

describe('themeService', () => {
  beforeEach(() => {
    if (!document.querySelector('meta[name="theme-color"]')) {
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      meta.setAttribute('content', '#10131a');
      document.head.append(meta);
    }
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }))
    );
  });

  afterEach(() => {
    resetThemeForTests();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('defaults to dark theme', () => {
    setActiveTheme('dark');
    expect(getActiveTheme()).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('persists light theme choice', () => {
    setActiveTheme('light');
    expect(getActiveTheme()).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#f4f1ea');
    expect(localStorage.getItem('home-hub-theme')).toBe('light');
  });

  it('supports auto theme and reports effective theme', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }))
    );
    setActiveTheme('auto');
    expect(getActiveTheme()).toBe('auto');
    expect(getEffectiveTheme()).toBe('light');
  });

  it('restores stored theme on init', () => {
    localStorage.setItem('home-hub-theme', 'light');
    initTheme();
    expect(getActiveTheme()).toBe('light');
  });

  it('toggles the effective appearance and pins an explicit theme', () => {
    setActiveTheme('dark');
    toggleEffectiveTheme();
    expect(getActiveTheme()).toBe('light');
    expect(getEffectiveTheme()).toBe('light');

    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }))
    );
    setActiveTheme('auto');
    expect(getEffectiveTheme()).toBe('light');
    toggleEffectiveTheme();
    expect(getActiveTheme()).toBe('dark');
    expect(getEffectiveTheme()).toBe('dark');
  });
});
