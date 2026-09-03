import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mainTf = readFileSync(join(root, 'terraform/main.tf'), 'utf8');

/** @type {string[]} */
const tempDirs = [];

/**
 * Run the generator against the real registry, writing tfvars to a temp file.
 *
 * @param {Record<string, string>} env
 */
function generate(env) {
  const dir = mkdtempSync(join(tmpdir(), 'hub-tfvars-'));
  tempDirs.push(dir);
  const outputPath = join(dir, 'hub.generated.tfvars');
  try {
    const stdout = execFileSync(
      process.execPath,
      ['scripts/generate-hub-tfvars.mjs', '--output', outputPath],
      {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          PATH: process.env.PATH,
          TERRAFORM_STACK: 'platform',
          CLOUDFLARE_ACCOUNT_ID: 'account',
          CLOUDFLARE_ZONE_ID: 'zone',
          WORKERS_SUBDOMAIN: 'workers-sub',
          ACCESS_TEAM_DOMAIN: 'lovely-home',
          CUSTOMER_CLOUDFLARE_ZONE_ID: 'customer-zone',
          ...env
        }
      }
    );
    return { ok: true, tfvars: readFileSync(outputPath, 'utf8'), stdout, stderr: '' };
  } catch (error) {
    const err = /** @type {{ status?: number, stderr?: Buffer | string }} */ (error);
    return {
      ok: false,
      tfvars: '',
      stdout: '',
      stderr: String(err.stderr ?? ''),
      status: err.status
    };
  }
}

afterEach(() => {
  while (tempDirs.length) {
    rmSync(/** @type {string} */ (tempDirs.pop()), { recursive: true, force: true });
  }
});

describe('terraform owner scoping', () => {
  it('gives customer hubs the support list instead of the platform owner list', () => {
    expect(mainTf).toMatch(/customer_hubs\s*=\s*{/);
    expect(mainTf).toMatch(
      /local\.customer_hubs\[site_id\]\s*\?\s*var\.support_owner_emails\s*:\s*var\.owner_emails/
    );
  });

  it('treats hubs outside the platform zone as customer hubs by default', () => {
    expect(mainTf).toMatch(/local\.site_zone_names\[site_id\]\s*!=\s*var\.zone_name/);
  });
});

describe('generate-hub-tfvars owner emails', () => {
  it('emits the support owner list for customer hubs', () => {
    const result = generate({
      OWNER_EMAILS: 'platform@lovely-home.co.uk',
      SUPPORT_OWNER_EMAILS: 'support@lovely-home.co.uk'
    });
    expect(result.ok).toBe(true);
    expect(result.tfvars).toContain('terraform_stack       = "platform"');
    expect(result.tfvars).toContain('support_owner_emails = [');
    expect(result.tfvars).toContain('"support@lovely-home.co.uk"');
  });

  it('injects the billing owner email for the site being provisioned', () => {
    const result = generate({
      OWNER_EMAILS: 'platform@lovely-home.co.uk',
      SUPPORT_OWNER_EMAILS: 'support@lovely-home.co.uk',
      SITE_OWNER_EMAILS_JSON: JSON.stringify({ wagtail: ['household@example.com'] })
    });
    expect(result.ok).toBe(true);
    const wagtailBlock = result.tfvars.slice(result.tfvars.indexOf('  wagtail = {'));
    expect(wagtailBlock).toContain('"household@example.com"');
  });

  it('refuses to apply when a customer hub would have no owners at all', () => {
    const result = generate({
      OWNER_EMAILS: 'platform@lovely-home.co.uk',
      SUPPORT_OWNER_EMAILS: ''
    });
    expect(result.ok).toBe(false);
    expect(result.stderr).toMatch(/customer hub with no owner emails/i);
  });

  it('refuses to generate tfvars without terraform_stack', () => {
    const result = generate({ TERRAFORM_STACK: '' });
    expect(result.ok).toBe(false);
    expect(result.stderr).toMatch(/TERRAFORM_STACK/);
  });

  it('emits provision_site_id for a customer hub apply', () => {
    const result = generate({
      TERRAFORM_STACK: 'customers',
      PROVISION_SITE_ID: 'wagtail',
      OWNER_EMAILS: 'platform@lovely-home.co.uk',
      SUPPORT_OWNER_EMAILS: 'support@lovely-home.co.uk'
    });
    expect(result.ok).toBe(true);
    expect(result.tfvars).toContain('terraform_stack       = "customers"');
    expect(result.tfvars).toContain('provision_site_id     = "wagtail"');
  });

  it('emits platform_cf_api_token from the GitHub secret env', () => {
    const result = generate({
      OWNER_EMAILS: 'platform@lovely-home.co.uk',
      SUPPORT_OWNER_EMAILS: 'support@lovely-home.co.uk',
      PLATFORM_CF_API_TOKEN: 'cf-platform-token'
    });
    expect(result.ok).toBe(true);
    expect(result.tfvars).toContain('platform_cf_api_token = "cf-platform-token"');
  });

  it('keeps the pre-launch marketing Access gate on unless explicitly disabled', () => {
    const onByDefault = generate({
      OWNER_EMAILS: 'platform@lovely-home.co.uk',
      SUPPORT_OWNER_EMAILS: 'support@lovely-home.co.uk'
    });
    expect(onByDefault.ok).toBe(true);
    expect(onByDefault.tfvars).toContain('marketing_site_access_protected = true');

    const off = generate({
      OWNER_EMAILS: 'platform@lovely-home.co.uk',
      SUPPORT_OWNER_EMAILS: 'support@lovely-home.co.uk',
      MARKETING_SITE_ACCESS_PROTECTED: 'false'
    });
    expect(off.ok).toBe(true);
    expect(off.tfvars).toContain('marketing_site_access_protected = false');
  });

  it('rejects a malformed billing owner payload', () => {
    const result = generate({
      OWNER_EMAILS: 'platform@lovely-home.co.uk',
      SUPPORT_OWNER_EMAILS: 'support@lovely-home.co.uk',
      SITE_OWNER_EMAILS_JSON: 'not-json'
    });
    expect(result.ok).toBe(false);
    expect(result.stderr).toMatch(/SITE_OWNER_EMAILS_JSON/);
  });
});
