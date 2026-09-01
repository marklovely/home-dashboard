import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildPublicHelpCatalog, serializePublicHelpCatalog } from '../src/help/publicCatalog.js';
import { OWNER_HELP_SECTIONS } from '../src/help/ownerSections.js';
import { buildSitterHelpSections, PUBLIC_SITTER_HELP_OPTIONS } from '../src/help/sitterSections.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('public help catalog', () => {
  it('keeps website/help-data.js in sync with hub help modules', () => {
    const expected = serializePublicHelpCatalog(buildPublicHelpCatalog());
    const actual = readFileSync(join(root, 'website/help-data.js'), 'utf8');
    expect(actual).toBe(expected);
  });

  it('covers scheduled stays, weather from the home address, and the header theme toggle', () => {
    const ownerText = JSON.stringify(OWNER_HELP_SECTIONS);
    expect(ownerText).toMatch(/Scheduled remote stays/);
    expect(ownerText).toMatch(/home postcode/);
    expect(ownerText).toMatch(/Sun\/moon in the header/);
    expect(OWNER_HELP_SECTIONS.some((section) => section.id === 'house-sitter-mode')).toBe(true);
  });

  it('builds a generic guest guide for the marketing site', () => {
    const sections = buildSitterHelpSections(PUBLIC_SITTER_HELP_OPTIONS);
    const text = JSON.stringify(sections);
    expect(text).toContain('your hosts');
    expect(text).toContain('this home');
    expect(text).toMatch(/one-time email code/);
    expect(sections.some((section) => section.id === 'pet-care')).toBe(true);
    expect(sections.some((section) => section.id === 'home-controls')).toBe(true);
  });
});
