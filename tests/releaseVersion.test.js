import { mkdtempSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  changelogNotesForVersion,
  changelogUnreleasedNotes,
  promoteChangelogUnreleased
} from '../scripts/lib/changelog.mjs';
import { writeWebsiteVersion } from '../scripts/lib/website-version.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('changelog helpers', () => {
  const sample = `# Changelog

## Unreleased

Signup and backups.

## 2.2.0

Minor release: bins.

### Settings

- Sidebar
`;

  it('reads Unreleased and a version section', () => {
    expect(changelogUnreleasedNotes(sample)).toBe('Signup and backups.');
    expect(changelogNotesForVersion(sample, '2.2.0')).toContain('Minor release: bins.');
    expect(changelogNotesForVersion(sample, '2.2.0')).toContain('Sidebar');
  });

  it('promotes Unreleased into a numbered section', () => {
    const next = promoteChangelogUnreleased(sample, '2.3.0', 'Signup and backups.');
    expect(changelogUnreleasedNotes(next)).toBe('');
    expect(changelogNotesForVersion(next, '2.3.0')).toBe('Signup and backups.');
    expect(changelogNotesForVersion(next, '2.2.0')).toContain('Minor release: bins.');
  });

  it('refuses an empty Unreleased or a duplicate version', () => {
    expect(() => promoteChangelogUnreleased(sample, '2.3.0', '')).toThrow(/empty/i);
    expect(() => promoteChangelogUnreleased(sample, '2.2.0', 'Signup and backups.')).toThrow(/already has/);
  });
});

describe('website version file', () => {
  it('writes website/version.json', () => {
    const dir = mkdtempSync(join(tmpdir(), 'website-version-'));
    mkdirSync(join(dir, 'website'));
    writeWebsiteVersion(dir, '2.3.0');
    expect(JSON.parse(readFileSync(join(dir, 'website/version.json'), 'utf8'))).toEqual({
      version: '2.3.0'
    });
  });
});

describe('hub chrome version', () => {
  it('keeps the version label outside the controls-only footer', () => {
    const html = readFileSync(join(root, 'src/index.html'), 'utf8');
    const versionIndex = html.indexOf('id="shell-version-label"');
    const footerIndex = html.indexOf('id="shell-footer"');
    expect(versionIndex).toBeGreaterThan(0);
    expect(footerIndex).toBeGreaterThan(versionIndex);
    expect(html).toMatch(/id="shell-version-label"[^>]*class="shell-version-label"/);
    const footer = html.slice(footerIndex, html.indexOf('</footer>', footerIndex));
    expect(footer).not.toContain('shell-version-label');
  });

  it('fills the hub version from the Vite-injected package version', () => {
    const app = readFileSync(join(root, 'src/js/app.js'), 'utf8');
    expect(app).toContain('shell-version-label');
    expect(app).toContain('__APP_VERSION__');
    expect(app).toContain('versionLabel.hidden = false');
  });
});

describe('CHANGELOG.md', () => {
  it('has Unreleased notes ready for the next tagged release', () => {
    const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
    expect(changelogUnreleasedNotes(changelog).length).toBeGreaterThan(20);
  });
});

describe('release tooling', () => {
  it('deploy writes website/version.json from package.json', () => {
    const script = readFileSync(join(root, 'scripts/deploy-lovely-home-website.sh'), 'utf8');
    expect(script).toContain('write-website-version.mjs');
  });

  it('tags publish GitHub Releases from CHANGELOG.md', () => {
    const workflow = readFileSync(join(root, '.github/workflows/release.yml'), 'utf8');
    expect(workflow).toContain("tags:");
    expect(workflow).toContain('publish-github-release.mjs');
    const publisher = readFileSync(join(root, 'scripts/publish-github-release.mjs'), 'utf8');
    expect(publisher).toContain('gh');
    expect(publisher).toContain('release');
    expect(publisher).toContain('changelogNotesForVersion');
  });
});
