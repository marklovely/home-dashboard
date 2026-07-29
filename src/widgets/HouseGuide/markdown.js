import { marked } from 'marked';

marked.setOptions({
  gfm: true,
  breaks: true
});

/**
 * @param {string} markdown
 * @returns {string}
 */
export function renderHouseGuideMarkdown(markdown) {
  return marked.parse(markdown);
}
