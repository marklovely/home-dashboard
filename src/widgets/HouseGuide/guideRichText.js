import DOMPurify from 'dompurify';
import { marked } from 'marked';

marked.use({ breaks: true, gfm: true, headerIds: false, mangle: false });

const ALLOWED_TAGS = ['p', 'strong', 'em', 'b', 'i', 'a', 'ul', 'ol', 'li', 'br'];
const ALLOWED_ATTR = ['href', 'target', 'rel'];
const HTML_LIKE = /<\s*\/?\s*(p|strong|em|b|i|a|ul|ol|li|br)\b/i;
const MARKDOWN_LIKE = /(\*\*.+\*\*|(^|[\s(])\*.+\*([\s.,!?)])|^\s*[-*]\s+|^\s*\d+\.\s+|^\[.+\]\([^)]+\))/m;

/**
 * @param {string} html
 * @returns {string}
 */
export function sanitizeGuideHtml(html) {
  const clean = DOMPurify.sanitize(html ?? '', {
    ALLOWED_TAGS,
    ALLOWED_ATTR
  });
  return normalizeGuideLinks(clean);
}

/**
 * @param {string} html
 * @returns {string}
 */
function normalizeGuideLinks(html) {
  if (!html || typeof document === 'undefined') {
    return html;
  }
  const root = document.createElement('div');
  root.innerHTML = html;
  for (const link of root.querySelectorAll('a[href]')) {
    const href = link.getAttribute('href') ?? '';
    if (/^https?:/i.test(href)) {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    }
  }
  return root.innerHTML;
}

/**
 * @param {string | undefined | null} stored
 * @returns {string}
 */
export function prepareContentForEditor(stored) {
  if (!stored?.trim()) {
    return '';
  }
  return sanitizeGuideHtml(storedToDisplayHtml(stored));
}

/**
 * @param {string | undefined | null} stored
 * @returns {HTMLElement}
 */
export function renderGuideRichText(stored) {
  const container = document.createElement('div');
  container.className = 'guide-markdown guide-rich-text';

  if (!stored?.trim()) {
    return container;
  }

  container.innerHTML = sanitizeGuideHtml(storedToDisplayHtml(stored));
  return container;
}

/**
 * @param {string} html
 * @returns {boolean}
 */
export function isEmptyGuideHtml(html) {
  const trimmed = html.replace(/\s/g, '');
  return !trimmed || trimmed === '<p></p>' || trimmed === '<p><br></p>' || trimmed === '<p><br/></p>';
}

/**
 * @param {string} stored
 * @returns {string}
 */
function storedToDisplayHtml(stored) {
  if (looksLikeHtml(stored)) {
    return stored;
  }
  if (looksLikeMarkdown(stored)) {
    const parsed = marked.parse(stored, { async: false });
    return typeof parsed === 'string' ? parsed : stored;
  }
  return plainTextToHtml(stored);
}

/**
 * @param {string} text
 */
function looksLikeHtml(text) {
  return HTML_LIKE.test(text);
}

/**
 * @param {string} text
 */
function looksLikeMarkdown(text) {
  return MARKDOWN_LIKE.test(text);
}

/**
 * @param {string} text
 */
function plainTextToHtml(text) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return '';
  }

  return paragraphs
    .map((part) => `<p>${escapeHtml(part).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/**
 * @param {string} text
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** @deprecated Use sanitizeGuideHtml — kept for tests that inspect DOM nodes. */
export function sanitizeGuideRichText(root) {
  root.innerHTML = sanitizeGuideHtml(root.innerHTML);
}
