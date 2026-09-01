import { PUBLIC_HELP_CATALOG } from './help-data.js';

const FAQ_LINKS = [
  ['the public demo', 'https://demo.lovely-home.co.uk/sign-in'],
  ['your account page', 'account.html'],
  ['emailing support', 'mailto:support@lovely-home.co.uk']
];

/**
 * @param {string} sectionId
 */
function faqSection(sectionId) {
  return PUBLIC_HELP_CATALOG.owner.find((section) => section.id === sectionId);
}

/**
 * @param {string} text
 */
function linkedAnswer(text) {
  const fragment = document.createDocumentFragment();
  let remaining = text;
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

function paintFaqLists() {
  const roots = document.querySelectorAll('[data-faq-section]');
  for (const root of roots) {
    const section = faqSection(root.getAttribute('data-faq-section') || '');
    if (!section) continue;
    root.replaceChildren();
    for (const block of section.blocks) {
      if (block.type !== 'qa') continue;
      const item = document.createElement('div');
      const dt = document.createElement('dt');
      dt.textContent = block.question;
      const dd = document.createElement('dd');
      dd.append(linkedAnswer(block.answer));
      item.append(dt, dd);
      root.append(item);
    }
  }
}

paintFaqLists();
