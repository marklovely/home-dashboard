import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ACCESS_LOGIN_FOOTER_TEXT,
  ACCESS_LOGIN_LOGO_URL,
  ACCESS_UNAUTHORISED_URL,
  accessAppLoginFields,
  accessLoginAppName,
  hubAccessAppFromLegacyName,
  mergeAccessLoginDesign
} from '../scripts/sync-access-login-design.mjs';

const root = process.cwd();

describe('Access login naming and deny page', () => {
  it('Terraform Access apps use the household login title, not site_id Pages', () => {
    const tf = readFileSync(join(root, 'terraform/modules/hub_environment/access.tf'), 'utf8');
    expect(tf).toMatch(/name\s+=\s+local\.access_home_name/);
    expect(tf).toContain('https://lovely-home.co.uk/access-unauthorised');
    expect(tf).not.toContain('https://lovely-home.co.uk/access-unauthorised.html');
    expect(tf).not.toMatch(/Lovely Home — \$\{var\.site_id\} Pages/);
  });

  it('marketing Access bypasses the unauthorised page so denied users can load it', () => {
    const tf = readFileSync(join(root, 'terraform/modules/marketing_site/access.tf'), 'utf8');
    expect(tf).toContain('access-unauthorised');
    expect(tf).toMatch(/decision\s*=\s*"bypass"/);
  });

  it('merges login design without dropping existing organisation fields', () => {
    const merged = mergeAccessLoginDesign({
      name: 'lovely-home',
      auth_domain: 'lovely-home.cloudflareaccess.com',
      login_design: { background_color: '#123456', footer_text: 'old' }
    });
    expect(merged.name).toBe('lovely-home');
    expect(merged.login_design.background_color).toBe('#123456');
    expect(merged.login_design.logo_path).toBe(ACCESS_LOGIN_LOGO_URL);
    expect(merged.login_design.footer_text).toBe(ACCESS_LOGIN_FOOTER_TEXT);
  });

  it('renames legacy hub Access apps to the household title', () => {
    expect(accessLoginAppName('wagtail')).toBe('Wagtail Home');
    expect(hubAccessAppFromLegacyName('Lovely Home — wagtail Pages')).toEqual({
      siteId: 'wagtail',
      kind: 'pages',
      name: 'Wagtail Home'
    });
    expect(hubAccessAppFromLegacyName('Lovely Home — wagtail Worker')?.name).toBe('Wagtail Home API');
    expect(hubAccessAppFromLegacyName('Lovely Home — Marketing site')).toBeNull();
    expect(accessAppLoginFields('Wagtail Home').custom_deny_url).toBe(ACCESS_UNAUTHORISED_URL);
    expect(accessAppLoginFields('Wagtail Home').custom_deny_message.length).toBeLessThanOrEqual(75);
  });

  it('explains that a missing login code means the email is not authorised', () => {
    const html = readFileSync(join(root, 'website/access-unauthorised.html'), 'utf8');
    expect(html).toMatch(/not authorised to access this home/i);
    expect(html).toMatch(/does not send a code/i);
    expect(html).toContain('noindex');
    expect(html).not.toMatch(/href="site\.css"/);
    expect(html).not.toMatch(/src="site\.js"/);
    expect(html).not.toMatch(/src="lovely-home-mark\.svg"/);
  });
});
