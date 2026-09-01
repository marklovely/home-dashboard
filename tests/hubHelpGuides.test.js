import { describe, expect, it } from 'vitest';
import { openHelpGuide } from '../src/components/HelpGuide/helpGuide.js';
import { OWNER_HELP_SECTIONS } from '../src/components/HelpGuide/ownerHelpContent.js';
import { buildSitterHelpSections } from '../src/components/HelpGuide/sitterHelpContent.js';
import { openGuideEditorHelp } from '../src/apps/HouseGuideEditor/guideEditorHelp.js';

describe('hub help guides', () => {
  it('defines owner, sitter, and writing guide sections', () => {
    expect(OWNER_HELP_SECTIONS[0]).toMatchObject({ id: 'setup', title: 'Set it up' });
    expect(OWNER_HELP_SECTIONS.length).toBeGreaterThanOrEqual(8);
    expect(buildSitterHelpSections().length).toBeGreaterThanOrEqual(7);
    const sitterSections = buildSitterHelpSections();
    expect(new Set(sitterSections.map((section) => section.id)).size).toBe(sitterSections.length);
  });

  it('opens shared help overlay for owner and sitter guides', () => {
    openHelpGuide({
      title: 'Owner guide',
      sections: OWNER_HELP_SECTIONS,
      dialogId: 'test-owner-help-setup-first'
    });
    expect(document.querySelector('.help-guide-content-title')?.textContent).toBe('Set it up');
    expect(document.querySelector('ol.help-guide-list')).toBeTruthy();
    document.querySelector('.help-guide-close')?.dispatchEvent(new Event('click'));

    openHelpGuide({
      title: 'Owner guide',
      sections: OWNER_HELP_SECTIONS,
      initialSectionId: 'house-sitter-mode',
      dialogId: 'test-owner-help'
    });
    expect(document.querySelector('.help-guide-overlay')).toBeTruthy();
    expect(document.querySelector('.help-guide-content-title')?.textContent).toContain('House Sitter Mode');
    document.querySelector('.help-guide-close')?.dispatchEvent(new Event('click'));
    expect(document.querySelector('.help-guide-overlay')).toBeNull();

    openHelpGuide({
      title: 'Tablet guide',
      sections: buildSitterHelpSections(),
      initialSectionId: 'house-guide',
      dialogId: 'test-sitter-help'
    });
    expect(document.querySelector('.help-guide-content-title')?.textContent).toBe('House Guide');
    document.querySelector('.help-guide-close')?.click();
  });

  it('still opens the guide editor writing guide', () => {
    openGuideEditorHelp({ initialSectionId: 'blocks' });
    expect(document.querySelector('.help-guide-title')?.textContent).toBe('Writing guide');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.querySelector('.help-guide-overlay')).toBeNull();
  });
});
