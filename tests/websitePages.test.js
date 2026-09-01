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

  it('signup hub addresses cannot use underscores', () => {
    const html = readPage('signup.html');
    expect(html).toContain('pattern="[a-z][a-z0-9-]{0,31}"');
    expect(html).not.toContain('a-z0-9_-');
    const js = readFileSync(join(website, 'signup.js'), 'utf8');
    expect(js).toMatch(/replace\(\/_\/g, '-'\)/);
  });

  it('signup agrees to terms and says the hub address cannot change', () => {
    const html = readPage('signup.html');
    expect(html).toMatch(/agree to our <a href="terms\.html">terms<\/a>/);
    expect(html).toMatch(/cannot be changed later/);
    expect(html).toMatch(/does not charge you today/);
  });

  it('pricing explains cancel, archive, and backup exclusions', () => {
    const html = readPage('pricing.html');
    expect(html).toMatch(/account\.html/);
    expect(html).toMatch(/taken down and archived/);
    expect(html).toMatch(/Photos and appliance PDFs/);
  });

  it('account page signs in with an email code then Stripe billing', () => {
    const html = readPage('account.html');
    expect(html).toMatch(/Manage your hub/);
    expect(html).toMatch(/id="account-email"/);
    expect(html).toMatch(/id="account-code"/);
    const js = readFileSync(join(website, 'account.js'), 'utf8');
    expect(js).toMatch(/\/api\/public\/account\/otp/);
    expect(js).toMatch(/\/api\/public\/account\/portal/);
    expect(js).toMatch(/\/api\/public\/account\/session/);
    expect(js).toMatch(/localStorage\.setItem\(SESSION_KEY/);
    expect(js).toMatch(/You have been signed out/);
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

  it('setup page treats the hub as a URL, not hardware you must buy', () => {
    const html = readPage('setup.html');
    expect(html).toMatch(/No hardware required/);
    expect(html).toMatch(/Send it to a sitter/);
    expect(html).toMatch(/Optional: wall tablet/);
    expect(html).not.toMatch(/A wall mount/);
  });

  it('explains scheduled stays: guide early, secrets on the sit, access after checkout', () => {
    const home = readPage('index.html');
    expect(home).toMatch(/Book sits in advance/);
    expect(home).toMatch(/7 days before/);
    expect(home).toMatch(/House guide, no secrets/);
    expect(home).toMatch(/After checkout/);

    const setup = readPage('setup.html');
    expect(setup).toMatch(/Seven days before/);
    expect(setup).toMatch(/do not need <em>Sitter is here<\/em> for a booked remote stay/);
    expect(setup).not.toMatch(/Turn on <em>Sitter is here<\/em> so home-access details appear for that stay/);

    const included = readPage('included.html');
    expect(included).toMatch(/guide 7 days before/);

    const security = readPage('security.html');
    expect(security).toMatch(/from 7 days before/);
    expect(security).toMatch(/day after checkout/);

    const pricing = readPage('pricing.html');
    expect(pricing).toMatch(/book several sits in one list/);
    expect(pricing).toMatch(/Can I book sits in advance/);
  });

  it('does not claim prices include VAT', () => {
    for (const name of pages) {
      const html = readPage(name);
      expect(html, name).not.toMatch(/inc\. VAT/i);
      expect(html, name).not.toMatch(/include VAT/i);
    }
    const pricingJs = readFileSync(join(website, 'pricing.js'), 'utf8');
    expect(pricingJs).not.toMatch(/inc\. VAT/);
    expect(readPage('pricing.html')).toMatch(/VAT is not charged/);
    expect(readPage('terms.html')).toMatch(/VAT is not charged/);
  });

  it('every page has a footer nav that sits above the landing background', () => {
    for (const name of pages) {
      expect(readPage(name)).toContain('site-footer-nav');
    }
    const css = readFileSync(join(website, 'site.css'), 'utf8');
    expect(css).toMatch(/\.site-footer \{[\s\S]*?z-index:\s*1/);
  });

  it('every page shows the release version from version.json', () => {
    for (const name of pages) {
      const html = readPage(name);
      expect(html, name).toContain('data-site-version');
      expect(html, name).toContain('src="site.js"');
    }
    const siteJs = readFileSync(join(website, 'site.js'), 'utf8');
    expect(siteJs).toMatch(/fetch\('version\.json'/);
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    const versionFile = JSON.parse(readFileSync(join(website, 'version.json'), 'utf8'));
    expect(versionFile.version).toBe(pkg.version);
  });

  it('gallery includes a trial call to action', () => {
    const html = readPage('app.html');
    expect(html).toMatch(/href="signup\.html"/);
    expect(html).toMatch(/Start free trial/);
  });
});
