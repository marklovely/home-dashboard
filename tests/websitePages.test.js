import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const website = join(root, 'website');
const pages = readdirSync(website).filter((name) => name.endsWith('.html'));

/**
 * @param {string} name
 */
function readPage(name) {
  return readFileSync(join(website, name), 'utf8');
}

describe('marketing site pages', () => {
  it('ships the buying pages from the trial review', () => {
    expect(pages).toEqual(expect.arrayContaining([
      'included.html',
      'security.html',
      'setup.html',
      'terms.html'
    ]));
  });

  it.each(pages)('%s has canonical, Open Graph, and a terms link', (name) => {
    const html = readPage(name);
    const expectedPath = name === 'index.html' ? '/' : `/${name}`;
    expect(html).toMatch(/<link rel="canonical" href="https:\/\/lovely-home\.co\.uk/);
    expect(html).toContain(`https://lovely-home.co.uk${expectedPath === '/' ? '/' : expectedPath}`);
    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:description"');
    expect(html).toContain('property="og:image"');
    expect(html).toContain('name="twitter:card"');
    expect(html).toContain('href="terms.html"');
    expect(html).toContain('href="security.html"');
    expect(html).toContain("What's included");
  });

  it('does not claim hub secrets are encrypted inside D1', () => {
    const privacy = readPage('privacy.html');
    const security = readPage('security.html');
    expect(privacy).not.toMatch(/stored encrypted server-side/i);
    expect(security).not.toMatch(/stored encrypted server-side/i);
    expect(security).toMatch(/encrypts the database and file storage/i);
    expect(security).toMatch(/operator-proof secrecy/i);
  });

  it('signup agrees to terms and says the hub address cannot change', () => {
    const html = readPage('signup.html');
    expect(html).toMatch(/agree to our <a href="terms\.html">terms<\/a>/);
    expect(html).toMatch(/cannot be changed later/);
    expect(html).toMatch(/does not charge you today/);
  });

  it('pricing explains cancel, archive, and backup exclusions', () => {
    const html = readPage('pricing.html');
    expect(html).toMatch(/Stripe receipt email/);
    expect(html).toMatch(/taken down and archived/);
    expect(html).toMatch(/Photos and appliance PDFs/);
  });

  it('included page lists ready features and customer-owned extras', () => {
    const html = readPage('included.html');
    expect(html).toMatch(/House guide and editor/);
    expect(html).toMatch(/Scheduled sitter stays/);
    expect(html).toMatch(/Password-encrypted backup/);
    expect(html).toMatch(/Alexa routine buttons/);
    expect(html).toMatch(/Virtual Buttons/);
    expect(html).toMatch(/go2rtc/);
    expect(html).toMatch(/Wall tablet, mount, or kiosk hardware/);
  });

  it('gallery includes a trial call to action', () => {
    const html = readPage('app.html');
    expect(html).toMatch(/href="signup\.html"/);
    expect(html).toMatch(/Start free trial/);
  });
});
