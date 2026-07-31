import { describe, expect, it } from 'vitest';
import {
  GUIDE_EDITOR_HELP_SECTIONS,
  getGuideEditorHelpSection,
  searchGuideEditorHelpSections
} from '../src/apps/HouseGuideEditor/guideEditorHelpContent.js';
import { openGuideEditorHelp } from '../src/apps/HouseGuideEditor/guideEditorHelp.js';

describe('guideEditorHelpContent', () => {
  it('defines unique help section ids', () => {
    const ids = GUIDE_EDITOR_HELP_SECTIONS.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('draft-publish');
    expect(ids).toContain('blocks');
  });

  it('finds sections by id and search query', () => {
    expect(getGuideEditorHelpSection('photos')?.title).toBe('Photos');
    const results = searchGuideEditorHelpSections('alexa');
    expect(results.some((section) => section.id === 'quick-actions')).toBe(true);
  });
});

describe('openGuideEditorHelp', () => {
  it('opens the help overlay and closes on Escape', () => {
    openGuideEditorHelp({ initialSectionId: 'blocks' });
    const overlay = document.querySelector('.guide-editor-help-overlay');
    expect(overlay).toBeTruthy();
    expect(document.querySelector('.guide-editor-help-content-title')?.textContent).toBe('Block types');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.querySelector('.guide-editor-help-overlay')).toBeNull();
  });
});
