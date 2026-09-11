import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PLATFORM_ARCHIVE_R2_BUCKET_NAME, wranglerR2ObjectPutArgs } from '../scripts/lib/platform-archive-storage.mjs';
import { parsePlatformHealthServiceTokenFromState } from '../scripts/lib/platform-archive-github-secrets.mjs';
import { resolveHubArchiveUrl, resolveHubPlatformApiUrl } from '../scripts/lib/hub-archive-url.mjs';
import { hubPagesPlatformPathUnavailable } from '../functions/lib/hubPagesPlatformPath.js';

describe('platform archive bucket name', () => {
  it('matches the Terraform R2 bucket resource', () => {
    const tf = readFileSync(join(process.cwd(), 'terraform/modules/platform_admin/r2.tf'), 'utf8');
    expect(tf).toContain(`name       = "${PLATFORM_ARCHIVE_R2_BUCKET_NAME}"`);
  });
});

describe('wranglerR2ObjectPutArgs', () => {
  it('does not pass --account-id (Wrangler 4 r2 object put rejects it)', () => {
    const args = wranglerR2ObjectPutArgs(
      'lovely-home-hub-archives/kitchen-home/latest.json',
      '/tmp/latest.json'
    );
    expect(args).toEqual([
      'r2',
      'object',
      'put',
      'lovely-home-hub-archives/kitchen-home/latest.json',
      '--file',
      '/tmp/latest.json',
      '--remote'
    ]);
    expect(args.join(' ')).not.toMatch(/account-id|accountId/);
  });
});

describe('archive-hub-site-backup', () => {
  it('refuses to run without PLATFORM_SITE_ARCHIVE_SECRET', () => {
    const result = spawnSync(
      process.execPath,
      [join(process.cwd(), 'scripts/archive-hub-site-backup.mjs'), 'rosies'],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          PLATFORM_SITE_ARCHIVE_SECRET: '',
          PLATFORM_ARCHIVE_R2_BUCKET: PLATFORM_ARCHIVE_R2_BUCKET_NAME
        }
      }
    );
    expect(result.status).toBe(1);
    expect(`${result.stderr}${result.stdout}`).toMatch(/PLATFORM_SITE_ARCHIVE_SECRET/);
  });
});

describe('resolveHubArchiveUrl', () => {
  it('prefers the Worker origin over the Pages hostname', () => {
    expect(
      resolveHubArchiveUrl({
        worker_api_origin: 'https://lovely-home-hub-api-kitchen-home.example.workers.dev/',
        hostname: 'kitchen-home.lovely-hub.com'
      })
    ).toEqual({
      url: 'https://lovely-home-hub-api-kitchen-home.example.workers.dev/api/platform/site-archive',
      via: 'worker'
    });
  });

  it('falls back to the Pages hostname when Terraform has no worker origin', () => {
    expect(resolveHubArchiveUrl({ hostname: 'kitchen-home.lovely-hub.com' })).toEqual({
      url: 'https://kitchen-home.lovely-hub.com/api/platform/site-archive',
      via: 'pages'
    });
  });

  it('returns null when neither origin is present', () => {
    expect(resolveHubArchiveUrl({})).toEqual({ url: null, via: null });
  });

  it('builds site-restore URLs on the Worker origin', () => {
    expect(
      resolveHubPlatformApiUrl(
        {
          worker_api_origin: 'https://lovely-home-hub-api-kitchen-home.example.workers.dev/',
          hostname: 'kitchen-home.lovely-hub.com'
        },
        'site-restore'
      )
    ).toEqual({
      url: 'https://lovely-home-hub-api-kitchen-home.example.workers.dev/api/platform/site-restore',
      via: 'worker'
    });
  });
});

describe('hubPagesPlatformPathUnavailable', () => {
  it('lets site-archive proxy to the Worker on hub Pages', () => {
    expect(hubPagesPlatformPathUnavailable('platform/site-archive')).toBe(false);
  });

  it('lets site-restore proxy to the Worker on hub Pages', () => {
    expect(hubPagesPlatformPathUnavailable('platform/site-restore')).toBe(false);
  });

  it('still 503s other platform operator routes on hub Pages', () => {
    expect(hubPagesPlatformPathUnavailable('platform')).toBe(true);
    expect(hubPagesPlatformPathUnavailable('platform/sites')).toBe(true);
  });
});

describe('deploy-hub-pages-from-artifact', () => {
  const deployScript = () =>
    readFileSync(join(process.cwd(), 'scripts/deploy-hub-pages-from-artifact.sh'), 'utf8');

  const buildScript = () =>
    readFileSync(join(process.cwd(), 'scripts/build-hub-pages-artifact.sh'), 'utf8');

  const pagesDeployFn = (script) => script.match(/pages_deploy\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';

  it('does not pass --functions-directory (Wrangler 4 pages deploy rejects it)', () => {
    const script = deployScript();
    const deployFn = pagesDeployFn(script);
    expect(deployFn).toMatch(/cd "\$ROOT\/dist-hub-functions"/);
    expect(deployFn).toMatch(/pages deploy "\$ROOT\/dist"/);
    expect(deployFn).not.toMatch(/functions-directory|functionsDirectory/);
    expect(buildScript()).toContain('prune-hub-pages-functions.mjs');
    expect(buildScript()).toContain('--out dist-hub-functions/functions');
  });

  it('only passes flags wrangler pages deploy still accepts', () => {
    const deployFn = pagesDeployFn(deployScript());
    const help = spawnSync('npx', ['wrangler', 'pages', 'deploy', '--help'], {
      encoding: 'utf8',
      timeout: 90_000
    });
    expect(help.status, help.stderr || help.stdout).toBe(0);
    const helpText = `${help.stdout}\n${help.stderr}`;
    const flags = [...deployFn.matchAll(/--([a-z][a-z0-9-]*)/g)].map((match) => match[1]);
    expect(flags).toEqual(['project-name', 'branch', 'commit-dirty']);
    for (const flag of flags) {
      expect(helpText, `unknown wrangler pages deploy flag --${flag}`).toMatch(
        new RegExp(`--${flag}\\b`)
      );
    }
    expect(helpText).not.toMatch(/--functions-directory/);
  });

  it('maps production to the legacy home-dashboard Pages project name', () => {
    const script = deployScript();
    expect(script).toContain('hub-site-resource-names.sh');
    expect(script).toContain('PAGES_PROJECT="$PAGES_NAME"');
    expect(script).not.toContain('PAGES_PROJECT="home-dashboard-${SITE_ID}"');
    expect(script).toContain('write-hub-runtime-config.mjs');
  });
});

describe('prune-hub-pages-functions', () => {
  it('copies hub Functions without platform, stripe, or public routes', () => {
    const dest = mkdtempSync(join(tmpdir(), 'hub-functions-'));
    try {
      const result = spawnSync(
        process.execPath,
        [join(process.cwd(), 'scripts/prune-hub-pages-functions.mjs'), '--out', dest],
        { encoding: 'utf8' }
      );
      expect(result.status).toBe(0);
      expect(existsSync(join(dest, 'api/[[path]].js'))).toBe(true);
      expect(existsSync(join(dest, 'api/platform'))).toBe(false);
      expect(existsSync(join(dest, 'api/stripe'))).toBe(false);
      expect(existsSync(join(dest, 'api/public'))).toBe(false);
    } finally {
      rmSync(dest, { recursive: true, force: true });
    }
  });
});

describe('restore-hub-site-from-archive', () => {
  it('refuses to run without PLATFORM_SITE_ARCHIVE_SECRET', () => {
    const result = spawnSync(
      process.execPath,
      [join(process.cwd(), 'scripts/restore-hub-site-from-archive.mjs'), 'rosies'],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          PLATFORM_SITE_ARCHIVE_SECRET: ''
        }
      }
    );
    expect(result.status).toBe(1);
    expect(`${result.stderr}${result.stdout}`).toMatch(/PLATFORM_SITE_ARCHIVE_SECRET/);
  });
});

describe('platform site provision restore hook', () => {
  it('runs archive restore after provision', () => {
    const yml = readFileSync(
      join(process.cwd(), '.github/workflows/platform-site-provision-reusable.yml'),
      'utf8'
    );
    expect(yml).toMatch(/Restore hub from platform archive/);
    expect(yml).toMatch(/node scripts\/restore-hub-site-from-archive\.mjs "\$SITE_ID"/);
    const provisionAt = yml.indexOf('node scripts/provision-hub-site.mjs');
    const restoreAt = yml.indexOf('restore-hub-site-from-archive.mjs');
    expect(provisionAt).toBeGreaterThan(-1);
    expect(restoreAt).toBeGreaterThan(provisionAt);
  });
});

describe('billing deprovision archive gate', () => {
  it('fails the job when archive-hub-site-backup exits non-zero', () => {
    const yml = readFileSync(
      join(process.cwd(), '.github/workflows/platform-site-billing-deprovision.yml'),
      'utf8'
    );
    expect(yml).not.toMatch(/if node scripts\/archive-hub-site-backup/);
    expect(yml).toMatch(/node scripts\/archive-hub-site-backup\.mjs "\$SITE_ID" \| tee \/tmp\/archive\.log/);
    expect(yml).toMatch(/refusing to remove the site from the registry/);
  });
});

describe('parsePlatformHealthServiceTokenFromState', () => {
  it('reads client id and secret from platform_admin state JSON', () => {
    const parsed = parsePlatformHealthServiceTokenFromState(
      JSON.stringify({
        resources: [
          {
            module: 'module.platform_admin[0]',
            type: 'cloudflare_zero_trust_access_service_token',
            name: 'platform_health',
            instances: [{ attributes: { client_id: 'cid', client_secret: 'sec' } }]
          }
        ]
      })
    );
    expect(parsed).toEqual({ clientId: 'cid', clientSecret: 'sec' });
  });

  it('returns null when the token is missing', () => {
    expect(parsePlatformHealthServiceTokenFromState('{}')).toBeNull();
    expect(parsePlatformHealthServiceTokenFromState('not-json')).toBeNull();
  });
});
