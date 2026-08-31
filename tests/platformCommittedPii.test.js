import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  findEmailAddresses,
  MANIFEST_EMAIL_KEYS,
  redactEmailFields
} from '../scripts/lib/platformManifestPrivacy.mjs';
import { loadSitesYaml } from '../scripts/lib/load-sites-yaml.mjs';
import { validateSiteMutation } from '../scripts/lib/site-registry.mjs';
import { buildSiteManagePayload } from '../functions/api/platform/platformSiteMutations.js';
import {
  ownerEmailsFromWranglerJson,
  parseSiteOwnerEmailsEnv,
  resolveSiteOwnerEmails,
  siteOwnerEmailsEnvValue
} from '../scripts/lib/site-owner-emails.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(root, 'platform-admin/public/platform-manifest.json');
const sitesYamlPath = join(root, 'platform/sites.yaml');

const CUSTOMER_HUB_ZONE = 'lovely-hub.com';

describe('committed platform files hold no personal data', () => {
  it('the platform manifest contains no email addresses', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    expect(findEmailAddresses(manifest)).toEqual([]);
  });

  it('customer hub registry entries carry no owner or sitter emails', () => {
    const registry = loadSitesYaml(sitesYamlPath);
    /** @type {string[]} */
    const offenders = [];
    for (const [siteId, meta] of Object.entries(registry)) {
      const hostname = String(meta.hostname ?? '');
      const isCustomerHub = hostname.endsWith(`.${CUSTOMER_HUB_ZONE}`);
      if (!isCustomerHub) continue;
      const emails = findEmailAddresses({
        owner_emails: meta.owner_emails,
        sitter_emails: meta.sitter_emails,
        tester_emails: meta.tester_emails
      });
      if (emails.length) offenders.push(`${siteId}: ${emails.length} address(es)`);
    }
    expect(offenders).toEqual([]);
  });
});

describe('registry refuses customer owner emails', () => {
  const existing = {
    smith: { hostname: 'smith.lovely-hub.com', hub_environment: 'smith', vanilla: false },
    demo: { hostname: 'demo.lovely-home.co.uk', hub_environment: 'demo', vanilla: true }
  };

  it('blocks a create that would write a household address', () => {
    const error = validateSiteMutation(
      'create',
      'rose',
      { hostname: 'rose.lovely-hub.com', owner_emails: ['owner@example.com'] },
      existing
    );
    expect(error).toMatch(/cannot be stored/i);
  });

  it('allows a customer hub create with no owner emails at all', () => {
    expect(
      validateSiteMutation('create', 'rose', { hostname: 'rose.lovely-hub.com' }, existing)
    ).toBeNull();
  });

  it('still requires owners on platform sites', () => {
    expect(
      validateSiteMutation('create', 'staging', { hostname: 'staging.lovely-home.co.uk' }, existing)
    ).toMatch(/owner/i);
  });

  it('blocks an update that would add a household address', () => {
    expect(
      validateSiteMutation('update', 'smith', { owner_emails: ['owner@example.com'] }, existing)
    ).toMatch(/cannot be stored/i);
  });

  it('applies the same rule to the platform admin API payload builder', () => {
    const manifest = {
      platform: { zoneName: 'lovely-home.co.uk', customerZoneName: CUSTOMER_HUB_ZONE },
      sites: {
        smith: { hostname: 'smith.lovely-hub.com', hubEnvironment: 'smith', vanilla: false }
      }
    };

    const blocked = buildSiteManagePayload(manifest, 'create', 'rose', {
      hostname: 'rose.lovely-hub.com',
      ownerEmails: ['owner@example.com']
    });
    expect(blocked.ok).toBe(false);
    expect(blocked.message).toMatch(/not stored/i);

    const allowed = buildSiteManagePayload(manifest, 'create', 'rose', {
      hostname: 'rose.lovely-hub.com'
    });
    expect(allowed.ok).toBe(true);
    expect(allowed.payload?.owner_emails).toBeUndefined();
  });
});

describe('manifest redaction', () => {
  it('drops every email-bearing key at any depth', () => {
    const redacted = redactEmailFields({
      siteId: 'smith',
      ownerEmails: ['owner@example.com'],
      contract: {
        hostname: 'smith.lovely-hub.com',
        owner_emails: ['owner@example.com'],
        sitter_emails: ['sitter@example.com'],
        nested: [{ ownerEmail: 'owner@example.com', keep: 'yes' }]
      }
    });

    expect(findEmailAddresses(redacted)).toEqual([]);
    expect(redacted.siteId).toBe('smith');
    expect(redacted.contract.hostname).toBe('smith.lovely-hub.com');
    expect(redacted.contract.nested[0]).toEqual({ keep: 'yes' });
  });

  it('covers both snake_case and camelCase spellings', () => {
    for (const key of ['owner_emails', 'ownerEmails', 'sitter_emails', 'sitterEmails']) {
      expect(MANIFEST_EMAIL_KEYS.has(key)).toBe(true);
    }
  });

  it('finds addresses hidden in unexpected fields', () => {
    expect(findEmailAddresses({ note: 'contact Owner@Example.com for keys' })).toEqual([
      'owner@example.com'
    ]);
  });
});

describe('provision-time owner email lookup', () => {
  it('reads the owner email from a wrangler d1 result', () => {
    const json = [{ results: [{ owner_email: 'owner@example.com' }], success: true }];
    expect(ownerEmailsFromWranglerJson(json)).toEqual(['owner@example.com']);
  });

  it('returns nothing when the site has no billing row', () => {
    expect(ownerEmailsFromWranglerJson([{ results: [], success: true }])).toEqual([]);
    expect(ownerEmailsFromWranglerJson(null)).toEqual([]);
  });

  it('round-trips through the environment variable', () => {
    const value = siteOwnerEmailsEnvValue('rose-cottage', ['Owner@Example.com']);
    expect(parseSiteOwnerEmailsEnv(value)).toEqual({ 'rose-cottage': ['owner@example.com'] });
  });

  it('produces an empty map when there is no email to pass on', () => {
    expect(parseSiteOwnerEmailsEnv(siteOwnerEmailsEnvValue('rose-cottage', []))).toEqual({});
    expect(parseSiteOwnerEmailsEnv(undefined)).toEqual({});
  });

  it('rejects malformed input rather than provisioning without owners', () => {
    expect(() => parseSiteOwnerEmailsEnv('not json')).toThrow(/valid JSON/i);
    expect(() => parseSiteOwnerEmailsEnv('[]')).toThrow(/site id/i);
  });

  it('merges registry and billing owners without duplicates', () => {
    expect(
      resolveSiteOwnerEmails('rose-cottage', ['mark@example.com'], {
        'rose-cottage': ['owner@example.com', 'mark@example.com']
      })
    ).toEqual(['mark@example.com', 'owner@example.com']);
  });

  it('leaves other sites untouched', () => {
    expect(resolveSiteOwnerEmails('smith', [], { 'rose-cottage': ['owner@example.com'] })).toEqual([]);
  });
});
