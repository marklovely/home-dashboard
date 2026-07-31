import { describe, expect, it } from 'vitest';
import {
  isEmptyGuideHtml,
  prepareContentForEditor,
  renderGuideRichText,
  sanitizeGuideHtml
} from '../src/widgets/HouseGuide/guideRichText.js';

describe('guideRichText', () => {
  it('renders sanitized HTML from storage', () => {
    const node = renderGuideRichText('<p>Hello <strong>bold</strong> 🐕</p>');
    expect(node.querySelector('strong')?.textContent).toBe('bold');
    expect(node.textContent).toContain('🐕');
  });

  it('converts legacy plain text to paragraphs', () => {
    const node = renderGuideRichText('Line one\n\nLine two');
    expect(node.querySelectorAll('p').length).toBe(2);
    expect(node.textContent).toContain('Line one');
    expect(node.textContent).toContain('Line two');
  });

  it('converts legacy markdown to HTML for display', () => {
    const node = renderGuideRichText('Hello **bold** world');
    expect(node.querySelector('strong')?.textContent).toBe('bold');
  });

  it('strips unsafe HTML and javascript links', () => {
    const clean = sanitizeGuideHtml(
      '<p>Safe</p><script>alert(1)</script><a href="javascript:alert(1)">bad</a>'
    );
    expect(clean).not.toMatch(/script/i);
    expect(clean).not.toMatch(/javascript:/i);
    expect(clean).toContain('Safe');
  });

  it('adds safe external link attributes', () => {
    const node = renderGuideRichText('<p><a href="https://example.com">Site</a></p>');
    const link = node.querySelector('a');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('allows tel and mailto links', () => {
    const html = sanitizeGuideHtml(
      '<p><a href="tel:0123">Call</a> <a href="mailto:a@b.com">Email</a></p>'
    );
    expect(html).toContain('tel:0123');
    expect(html).toContain('mailto:a@b.com');
  });

  it('prepares editor content from plain text', () => {
    expect(prepareContentForEditor('Hello there')).toMatch(/<p>Hello there<\/p>/);
  });

  it('detects empty editor HTML', () => {
    expect(isEmptyGuideHtml('<p></p>')).toBe(true);
    expect(isEmptyGuideHtml('<p>Hello</p>')).toBe(false);
  });
});
