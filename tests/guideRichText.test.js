import { describe, expect, it } from 'vitest';
import { renderGuideRichText, sanitizeGuideRichText } from '../src/widgets/HouseGuide/guideRichText.js';

describe('guideRichText', () => {
  it('renders bold, italic, links, and line breaks', () => {
    const node = renderGuideRichText('Hello **bold** and *italic*.\n\nSecond line with [site](https://example.com).');
    expect(node.querySelector('strong')?.textContent).toBe('bold');
    expect(node.querySelector('em')?.textContent).toBe('italic');
    const link = node.querySelector('a');
    expect(link?.getAttribute('href')).toBe('https://example.com');
    expect(link?.textContent).toBe('site');
    expect(node.querySelectorAll('p').length).toBeGreaterThanOrEqual(2);
  });

  it('preserves unicode emojis', () => {
    const node = renderGuideRichText('Scooter needs water 🐕');
    expect(node.textContent).toContain('🐕');
  });

  it('strips unsafe tags and javascript links', () => {
    const node = document.createElement('div');
    node.innerHTML =
      '<p>Safe</p><script>alert(1)</script><a href="javascript:alert(1)">bad</a><img src=x onerror=alert(1)>';
    sanitizeGuideRichText(node);
    expect(node.querySelector('script')).toBeNull();
    expect(node.querySelector('img')).toBeNull();
    expect(node.textContent).toContain('Safe');
    expect(node.textContent).toContain('bad');
    expect(node.querySelector('a')).toBeNull();
  });

  it('allows tel and mailto links', () => {
    const node = renderGuideRichText('[Call us](tel:0123456789) or [email](mailto:mark@example.com)');
    const links = [...node.querySelectorAll('a')].map((link) => link.getAttribute('href'));
    expect(links).toEqual(['tel:0123456789', 'mailto:mark@example.com']);
  });
});
