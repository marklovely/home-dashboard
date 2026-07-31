import { marked } from 'marked';

marked.use({
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false
});

const ALLOWED_TAGS = new Set(['P', 'STRONG', 'EM', 'A', 'UL', 'OL', 'LI', 'BR']);

const SAFE_LINK_PROTOCOLS = /^(https?:|mailto:|tel:)/i;

/**
 * @param {string | undefined | null} text
 * @returns {HTMLElement}
 */
export function renderGuideRichText(text) {
  const container = document.createElement('div');
  container.className = 'guide-markdown';

  if (!text?.trim()) {
    return container;
  }

  const parsed = marked.parse(text, { async: false });
  container.innerHTML = typeof parsed === 'string' ? parsed : '';
  sanitizeGuideRichText(container);
  return container;
}

/**
 * @param {HTMLElement} root
 */
export function sanitizeGuideRichText(root) {
  for (const node of [...root.querySelectorAll('*')]) {
    const tag = node.tagName;
    if (!ALLOWED_TAGS.has(tag)) {
      unwrapElement(node);
      continue;
    }

    for (const attr of [...node.attributes]) {
      if (tag === 'A' && attr.name === 'href') {
        continue;
      }
      node.removeAttribute(attr.name);
    }

    if (tag === 'A') {
      const href = node.getAttribute('href') ?? '';
      if (!SAFE_LINK_PROTOCOLS.test(href)) {
        unwrapElement(node);
        continue;
      }
      if (href.startsWith('http')) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    }
  }
}

/**
 * @param {Element} node
 */
function unwrapElement(node) {
  const parent = node.parentNode;
  if (!parent) {
    return;
  }
  while (node.firstChild) {
    parent.insertBefore(node.firstChild, node);
  }
  parent.removeChild(node);
}
