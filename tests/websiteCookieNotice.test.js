import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const siteJs = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../website/site.js'), 'utf8');

function loadSite() {
  document.documentElement.className = '';
  document.body.replaceChildren();
  eval(siteJs);
}

afterEach(() => {
  localStorage.clear();
  document.body.replaceChildren();
  document.documentElement.classList.remove('cookie-notice-open');
});

describe('marketing cookie notice', () => {
  it('shows the bar until Accept is stored', () => {
    localStorage.clear();
    loadSite();
    const notice = document.querySelector('.cookie-notice');
    expect(notice).toBeTruthy();
    expect(notice?.textContent).toMatch(/No analytics or ads/);
    expect(notice?.querySelector('a')?.getAttribute('href')).toBe('privacy.html#cookies');
    expect(document.documentElement.classList.contains('cookie-notice-open')).toBe(true);

    document.querySelector('.cookie-notice-accept')?.click();
    expect(document.querySelector('.cookie-notice')).toBeNull();
    expect(localStorage.getItem('lovely-home-cookie-notice')).toBe('accepted');
    expect(document.documentElement.classList.contains('cookie-notice-open')).toBe(false);
  });

  it('stays hidden after Accept', () => {
    localStorage.setItem('lovely-home-cookie-notice', 'accepted');
    loadSite();
    expect(document.querySelector('.cookie-notice')).toBeNull();
  });
});
