import { PUBLIC_HELP_CATALOG } from './help-data.js';
import {
  fetchMarketingPricingCopy,
  substituteHelpCatalogPricing,
  substituteMarketingPlaceholders
} from './marketingPricingCopy.js';

const FAQ_LINKS = [
  ['the public demo', 'https://demo.lovely-home.co.uk/sign-in'],
  ['your account page', '/account'],
  ['emailing support', 'mailto:support@lovely-home.co.uk']
];

/** @type {{ owner: unknown[] }} */
let activeCatalog = PUBLIC_HELP_CATALOG;

/**
 * @param {string} sectionId
 */
function faqSection(sectionId) {
  return activeCatalog.owner.find((section) => section.id === sectionId);
}

/**
 * @param {string} text
 * @param {Record<string, unknown> | null | undefined} pricing
 */
function linkedAnswer(text, pricing) {
  const resolved = substituteMarketingPlaceholders(text, pricing);
  const fragment = document.createDocumentFragment();
  let remaining = resolved;
  while (remaining) {
    let earliest = -1;
    let match = null;
    for (const [phrase, href] of FAQ_LINKS) {
      const index = remaining.indexOf(phrase);
      if (index !== -1 && (earliest === -1 || index < earliest)) {
        earliest = index;
        match = { phrase, href };
      }
    }
    if (!match || earliest === -1) {
      fragment.append(remaining);
      break;
    }
    if (earliest > 0) fragment.append(remaining.slice(0, earliest));
    const link = document.createElement('a');
    link.href = match.href;
    link.textContent = match.phrase;
    fragment.append(link);
    remaining = remaining.slice(earliest + match.phrase.length);
  }
  return fragment;
}

/**
 * @param {{ type: string, text?: string, question?: string, answer?: string }} block
 * @param {{ type: string, text?: string } | undefined} next
 */
function faqPair(block, next) {
  if (block.type === 'qa' && block.question && block.answer) {
    return { question: block.question, answer: block.answer, skip: 0 };
  }
  if (block.type === 'h4' && next?.type === 'p' && next.text) {
    return { question: block.text, answer: next.text, skip: 1 };
  }
  return null;
}

/**
 * @param {Record<string, unknown> | null | undefined} pricing
 */
function paintFaqLists(pricing) {
  const roots = document.querySelectorAll('[data-faq-section]');
  for (const root of roots) {
    const section = faqSection(root.getAttribute('data-faq-section') || '');
    if (!section) continue;
    root.replaceChildren();
    const blocks = section.blocks;
    for (let index = 0; index < blocks.length; index += 1) {
      const pair = faqPair(blocks[index], blocks[index + 1]);
      if (!pair) continue;
      index += pair.skip;
      const item = document.createElement('div');
      const dt = document.createElement('dt');
      dt.textContent = substituteMarketingPlaceholders(pair.question, pricing);
      const dd = document.createElement('dd');
      dd.append(linkedAnswer(pair.answer, pricing));
      item.append(dt, dd);
      root.append(item);
    }
  }
}

async function init() {
  const pricing = await fetchMarketingPricingCopy();
  activeCatalog = substituteHelpCatalogPricing(PUBLIC_HELP_CATALOG, pricing);
  paintFaqLists(pricing);
}

init();
