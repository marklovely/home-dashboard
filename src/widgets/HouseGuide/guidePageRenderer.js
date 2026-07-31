import { resolveGuideMedia } from '../../content/houseguide/guideMedia.js';
import { getProtectedDisplayValue } from '../../content/houseguide/privateContent.js';
import { createWifiQrSection } from '../../components/WifiQr/createWifiQrSection.js';
import { renderIcon } from '../../components/icons/renderIcon.js';
import { createGuidePanelOverlay, runGuideAction } from './guideActions.js';
import { ensureRoutineButtonStatus } from '../Alexa/routineButtonFeedback.js';
import { renderGuideMediaFallback, wireGuideImageLightbox } from './guideImageUi.js';
import { highlightGuideText } from './highlight.js';
import { wireGuideTopicManualLinks } from './guideTopicManualLinks.js';
import {
  appendPrimaryContactSectionIfNeeded,
  appendWifiQrSectionIfNeeded,
  resolveGuideTopicHeader,
  shouldSkipStaleGuideBlock,
  wireGuideTopicHeaderRefresh
} from './guideTopicWifiQr.js';
import { renderGuideRichText } from './guideRichText.js';

/**
 * @param {string} url
 * @param {string} alt
 */
function createGuideImageElement(url, alt) {
  const img = document.createElement('img');
  img.src = url;
  img.alt = alt;
  img.loading = 'lazy';
  img.decoding = 'async';
  wireGuideImageLightbox(img);
  return img;
}

/**
 * @param {import('../../types/guideContent.js').GuideBlock} block
 * @returns {HTMLElement}
 */
function renderBlock(block) {
  if (block.type === 'heroImage') {
    const resolved = resolveGuideMedia(block.mediaId);
    if (!resolved.ok) {
      return renderGuideMediaFallback({
        mediaId: block.mediaId,
        expectedFilename: resolved.expectedFilename
      });
    }

    const figure = document.createElement('figure');
    figure.className = 'guide-hero-image';
    figure.append(createGuideImageElement(resolved.url, resolved.alt));
    if (block.caption) {
      const caption = document.createElement('figcaption');
      caption.className = 'guide-hero-caption';
      caption.textContent = block.caption;
      figure.append(caption);
    }
    return figure;
  }

  if (block.type === 'gallery') {
    const wrap = document.createElement('section');
    wrap.className = 'guide-gallery';
    if (block.heading) {
      const heading = document.createElement('h3');
      heading.className = 'guide-section-heading';
      heading.textContent = block.heading;
      wrap.append(heading);
    }
    const grid = document.createElement('div');
    grid.className = 'guide-gallery-grid';
    let rendered = 0;
    for (const mediaId of block.mediaIds ?? []) {
      const resolved = resolveGuideMedia(mediaId);
      if (!resolved.ok) {
        grid.append(
          renderGuideMediaFallback({
            mediaId,
            expectedFilename: resolved.expectedFilename
          })
        );
        continue;
      }
      rendered += 1;
      grid.append(createGuideImageElement(resolved.url, resolved.alt));
    }
    if (rendered === 0 && (block.mediaIds ?? []).length === 0) {
      return wrap;
    }
    wrap.append(grid);
    return wrap;
  }

  if (block.type === 'steps') {
    const section = document.createElement('section');
    section.className = 'guide-section guide-section-steps';
    if (block.heading) {
      const heading = document.createElement('h3');
      heading.className = 'guide-section-heading';
      heading.textContent = block.heading;
      section.append(heading);
    }
    const list = document.createElement('ol');
    list.className = 'guide-step-list';
    for (const step of block.steps ?? []) {
      const item = document.createElement('li');
      item.append(renderGuideRichText(step));
      list.append(item);
    }
    section.append(list);
    return section;
  }

  if (block.type === 'tip' || block.type === 'warning' || block.type === 'note') {
    const aside = document.createElement('aside');
    aside.className = `guide-callout guide-callout-${block.type}`;
    if (block.heading) {
      const strong = document.createElement('strong');
      strong.textContent = block.heading;
      aside.append(strong, document.createTextNode(' '));
    }
    aside.append(renderGuideRichText(block.content));
    return aside;
  }

  if (block.type === 'location') {
    const section = document.createElement('section');
    section.className = 'guide-section guide-section-location';
    const heading = document.createElement('h3');
    heading.className = 'guide-section-heading';
    heading.textContent = block.heading;
    const body = document.createElement('div');
    body.className = 'guide-section-body';
    body.append(renderGuideRichText(block.content));
    section.append(heading, body);
    return section;
  }

  if (block.type === 'place') {
    const card = document.createElement('article');
    card.className = 'guide-place-card';
    const name = document.createElement('h3');
    name.className = 'guide-place-name';
    name.textContent = block.name;
    const address = document.createElement('p');
    address.className = 'guide-place-address';
    address.textContent = block.address;
    card.append(name, address);
    if (block.description) {
      const description = document.createElement('div');
      description.className = 'guide-place-description';
      description.append(renderGuideRichText(block.description));
      card.append(description);
    }
    if (typeof block.dogFriendly === 'boolean') {
      const tag = document.createElement('p');
      tag.className = 'guide-place-tag';
      tag.textContent = block.dogFriendly ? 'Dog friendly' : 'Not dog friendly';
      card.append(tag);
    }
    if (block.website) {
      const link = document.createElement('a');
      link.className = 'guide-place-link';
      link.href = block.website;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Website';
      card.append(link);
    }
    return card;
  }

  if (block.type === 'protected') {
    const value = getProtectedDisplayValue(block.key, block.kind ?? 'generic');
    const section = document.createElement('section');
    section.className = 'guide-section guide-section-protected';
    const list = document.createElement('dl');
    list.className = 'guide-value-list';
    const dt = document.createElement('dt');
    dt.textContent = block.label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    if (value.includes('secure house-sitter')) {
      dd.classList.add('guide-protected-placeholder');
    }
    list.append(dt, dd);
    section.append(list);
    return section;
  }

  if (block.type === 'wifiQr') {
    return createWifiQrSection({
      heading: block.heading,
      caption: block.caption
    });
  }

  if (block.type === 'contact' || block.type === 'keyValues') {
    const section = document.createElement('section');
    section.className = 'guide-section guide-section-values';
    if (block.heading) {
      const heading = document.createElement('h3');
      heading.className = 'guide-section-heading';
      heading.textContent = block.heading;
      section.append(heading);
    }
    const list = document.createElement('dl');
    list.className = 'guide-value-list';
    for (const item of block.items ?? []) {
      const dt = document.createElement('dt');
      dt.textContent = item.label;
      const dd = document.createElement('dd');
      if (item.href) {
        const link = document.createElement('a');
        link.href = item.href;
        link.textContent = item.value;
        dd.append(link);
      } else {
        dd.textContent = item.value;
      }
      list.append(dt, dd);
    }
    section.append(list);
    return section;
  }

  if (block.type === 'collapsible') {
    const details = document.createElement('details');
    details.className = 'guide-collapsible';
    const summary = document.createElement('summary');
    summary.textContent = block.heading;
    const body = document.createElement('div');
    body.className = 'guide-collapsible-body';
    body.append(renderGuideRichText(block.content));
    details.append(summary, body);
    return details;
  }

  const section = document.createElement('section');
  section.className = 'guide-section';
  if (block.heading) {
    const heading = document.createElement('h3');
    heading.className = 'guide-section-heading';
    heading.textContent = block.heading;
    section.append(heading);
  }
  if (block.content) {
    const body = document.createElement('div');
    body.className = 'guide-section-body';
    body.append(renderGuideRichText(block.content));
    section.append(body);
  }
  return section;
}

/**
 * @param {import('../../types/guideContent.js').GuideAction} action
 * @param {import('../../types/app.js').ShellContext} context
 * @param {(topicId: string) => void} openTopic
 * @param {HTMLElement} root
 */
function renderActionButton(action, context, openTopic, root) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'guide-action-button routine-button';
  button.style.setProperty('--accent', '#8b7cff');
  button.textContent = action.label;
  ensureRoutineButtonStatus(button);

  button.addEventListener('click', () => {
    if (action.type === 'panel') {
      root.append(createGuidePanelOverlay(action));
      return;
    }
    runGuideAction(action, context, openTopic, button);
  });
  return button;
}

/**
 * @param {import('../../types/guideContent.js').GuideTopic} topic
 * @param {import('../../types/app.js').ShellContext} context
 * @param {() => void} onBack
 * @param {(topicId: string) => void} openTopic
 * @param {{ onViewManual?: (manual: import('../../api/applianceManualsApi.js').ApplianceManual) => void }} [options]
 * @returns {HTMLElement & { cleanup?: () => void }}
 */
export function renderGuideTopicPage(topic, context, onBack, openTopic, options = {}) {
  const article = document.createElement('article');
  article.className = 'guide-topic-page';

  const backButton = document.createElement('button');
  backButton.type = 'button';
  backButton.className = 'guide-back-button';
  backButton.textContent = '← Back';

  const header = document.createElement('header');
  header.className = 'guide-topic-header';
  const headerText = resolveGuideTopicHeader(topic);
  const title = document.createElement('h2');
  title.className = 'guide-topic-title';
  title.textContent = headerText.title;
  const subtitle = document.createElement('p');
  subtitle.className = 'guide-topic-subtitle';
  subtitle.textContent = headerText.subtitle;
  const summary = document.createElement('p');
  summary.className = 'guide-topic-summary';
  summary.textContent = headerText.summary;
  header.append(title, subtitle, summary);

  article.append(backButton, header);

  let cleanupHeaderRefresh = wireGuideTopicHeaderRefresh(topic, subtitle, summary);

  const manualLinksHost = document.createElement('div');
  manualLinksHost.className = 'guide-topic-manual-links-host';
  article.append(manualLinksHost);

  if (options.onViewManual) {
    const cleanupManualLinks = wireGuideTopicManualLinks(manualLinksHost, topic, options.onViewManual);
    article.cleanup = () => {
      cleanupHeaderRefresh?.();
      cleanupManualLinks?.();
    };
  } else if (cleanupHeaderRefresh) {
    article.cleanup = cleanupHeaderRefresh;
  }

  if (topic.actions?.length) {
    const actionsWrap = document.createElement('section');
    actionsWrap.className = 'guide-quick-actions';
    actionsWrap.setAttribute('aria-label', 'Quick actions');
    const actionsTitle = document.createElement('h3');
    actionsTitle.className = 'guide-quick-actions-title';
    actionsTitle.textContent = 'Quick actions';
    const row = document.createElement('div');
    row.className = 'guide-quick-actions-row';
    for (const action of topic.actions) {
      row.append(renderActionButton(action, context, openTopic, article));
    }
    actionsWrap.append(actionsTitle, row);
    article.append(actionsWrap);
  }

  const body = document.createElement('div');
  body.className = 'guide-topic-body';
  for (const block of topic.blocks ?? []) {
    if (shouldSkipStaleGuideBlock(block, topic)) {
      continue;
    }
    const node = renderBlock(block);
    if (node) body.append(node);
  }
  appendWifiQrSectionIfNeeded(body, topic);
  appendPrimaryContactSectionIfNeeded(body, topic);
  article.append(body);

  backButton.addEventListener('click', onBack);
  return article;
}

/**
 * @param {{ title: string, cardSubtitle: string, iconId: string, accent: string, categoryTitle?: string }} card
 * @param {() => void} onOpen
 * @param {string} [searchQuery]
 */
export function renderGuideCategoryCard(card, onOpen, searchQuery = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'guide-category-card';
  button.style.setProperty('--accent', card.accent);
  button.setAttribute('aria-label', `${card.title}. ${card.cardSubtitle}`);

  const iconWrap = document.createElement('span');
  iconWrap.className = 'guide-category-icon';
  iconWrap.append(renderIcon(card.iconId, { size: 32, className: 'guide-category-svg' }));

  const title = document.createElement('span');
  title.className = 'guide-category-title';
  title.innerHTML = highlightGuideText(card.title, searchQuery);

  const subtitle = document.createElement('span');
  subtitle.className = 'guide-category-subtitle';
  subtitle.textContent = card.categoryTitle
    ? `${card.categoryTitle} · ${card.cardSubtitle}`
    : card.cardSubtitle;

  button.append(iconWrap, title, subtitle);
  button.addEventListener('click', onOpen);
  return button;
}

/**
 * @param {import('../../types/guideContent.js').GuideCategory} category
 * @param {(topicId: string) => void} openTopic
 */
export function renderGuideTopicList(category, openTopic) {
  const panel = document.createElement('div');
  panel.className = 'guide-topic-list';

  const backButton = document.createElement('button');
  backButton.type = 'button';
  backButton.className = 'guide-back-button';
  backButton.textContent = '← All areas';

  const header = document.createElement('header');
  header.className = 'guide-category-header';
  const title = document.createElement('h2');
  title.className = 'house-guide-intro-title';
  title.textContent = category.title;
  const subtitle = document.createElement('p');
  subtitle.className = 'house-guide-intro-text';
  subtitle.textContent = category.cardSubtitle;
  header.append(title, subtitle);

  const grid = document.createElement('div');
  grid.className = 'guide-category-grid guide-topic-grid';
  grid.setAttribute('role', 'list');

  for (const topic of category.topics) {
    const card = renderGuideCategoryCard(
      {
        title: topic.title,
        cardSubtitle: topic.subtitle,
        iconId: category.iconId,
        accent: category.accent
      },
      () => openTopic(topic.id)
    );
    card.setAttribute('role', 'listitem');
    grid.append(card);
  }

  panel.append(backButton, header, grid);
  return { panel, backButton };
}
