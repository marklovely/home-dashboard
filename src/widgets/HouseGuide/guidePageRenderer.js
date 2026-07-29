import { renderIcon } from '../../components/icons/renderIcon.js';
import { createGuidePanelOverlay, runGuideAction } from './guideActions.js';
import { highlightGuideText } from './highlight.js';

/**
 * @param {import('../../types/guideContent.js').GuideSection} section
 * @returns {HTMLElement}
 */
function renderSection(section) {
  const type = section.type ?? 'text';

  if (type === 'keyValues') {
    const block = document.createElement('section');
    block.className = 'guide-section guide-section-values';
    if (section.heading) {
      const heading = document.createElement('h3');
      heading.className = 'guide-section-heading';
      heading.textContent = section.heading;
      block.append(heading);
    }
    const list = document.createElement('dl');
    list.className = 'guide-value-list';
    for (const item of section.items ?? []) {
      const dt = document.createElement('dt');
      dt.textContent = item.label;
      const dd = document.createElement('dd');
      dd.textContent = item.value;
      list.append(dt, dd);
    }
    block.append(list);
    return block;
  }

  if (type === 'tip') {
    const block = document.createElement('aside');
    block.className = 'guide-callout guide-callout-tip';
    block.textContent = section.content ?? '';
    return block;
  }

  if (type === 'warning') {
    const block = document.createElement('aside');
    block.className = 'guide-callout guide-callout-warning';
    if (section.heading) {
      const strong = document.createElement('strong');
      strong.textContent = section.heading;
      block.append(strong, document.createTextNode(` ${section.content ?? ''}`));
    } else {
      block.textContent = section.content ?? '';
    }
    return block;
  }

  if (type === 'collapsible') {
    const details = document.createElement('details');
    details.className = 'guide-collapsible';
    const summary = document.createElement('summary');
    summary.textContent = section.heading ?? 'More';
    const body = document.createElement('p');
    body.textContent = section.content ?? '';
    details.append(summary, body);
    return details;
  }

  const block = document.createElement('section');
  block.className = 'guide-section';
  if (section.heading) {
    const heading = document.createElement('h3');
    heading.className = 'guide-section-heading';
    heading.textContent = section.heading;
    block.append(heading);
  }
  if (section.content) {
    const paragraph = document.createElement('p');
    paragraph.className = 'guide-section-body';
    paragraph.textContent = section.content;
    block.append(paragraph);
  }
  return block;
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

  button.addEventListener('click', () => {
    if (action.type === 'panel') {
      root.append(createGuidePanelOverlay(action));
      return;
    }
    runGuideAction(action, context, openTopic);
  });
  return button;
}

/**
 * @param {import('../../types/guideContent.js').GuidePage} page
 * @param {import('../../types/app.js').ShellContext} context
 * @param {() => void} onBack
 * @param {(topicId: string) => void} openTopic
 * @returns {HTMLElement}
 */
export function renderGuideTopicPage(page, context, onBack, openTopic) {
  const article = document.createElement('article');
  article.className = 'guide-topic-page';

  const backButton = document.createElement('button');
  backButton.type = 'button';
  backButton.className = 'guide-back-button';
  backButton.textContent = '← Back';

  const header = document.createElement('header');
  header.className = 'guide-topic-header';
  const title = document.createElement('h2');
  title.className = 'guide-topic-title';
  title.textContent = page.title;
  const subtitle = document.createElement('p');
  subtitle.className = 'guide-topic-subtitle';
  subtitle.textContent = page.subtitle;
  const summary = document.createElement('p');
  summary.className = 'guide-topic-summary';
  summary.textContent = page.summary;
  header.append(title, subtitle, summary);

  article.append(backButton, header);

  if (page.actions?.length) {
    const actionsWrap = document.createElement('section');
    actionsWrap.className = 'guide-quick-actions';
    actionsWrap.setAttribute('aria-label', 'Quick actions');
    const actionsTitle = document.createElement('h3');
    actionsTitle.className = 'guide-quick-actions-title';
    actionsTitle.textContent = 'Quick actions';
    const row = document.createElement('div');
    row.className = 'guide-quick-actions-row';
    for (const action of page.actions) {
      row.append(renderActionButton(action, context, openTopic, article));
    }
    actionsWrap.append(actionsTitle, row);
    article.append(actionsWrap);
  }

  const body = document.createElement('div');
  body.className = 'guide-topic-body';
  for (const section of page.sections) {
    body.append(renderSection(section));
  }
  article.append(body);

  backButton.addEventListener('click', onBack);
  return article;
}

/**
 * @param {import('../../types/guideContent.js').GuideTopicCard} topic
 * @param {() => void} onOpen
 * @param {string} [searchQuery]
 */
export function renderGuideCategoryCard(topic, onOpen, searchQuery = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'guide-category-card';
  button.style.setProperty('--accent', topic.accent);
  button.setAttribute('aria-label', `${topic.title}. ${topic.cardSubtitle}`);

  const iconWrap = document.createElement('span');
  iconWrap.className = 'guide-category-icon';
  iconWrap.append(renderIcon(topic.iconId, { size: 32, className: 'guide-category-svg' }));

  const title = document.createElement('span');
  title.className = 'guide-category-title';
  title.innerHTML = highlightGuideText(topic.title, searchQuery);

  const subtitle = document.createElement('span');
  subtitle.className = 'guide-category-subtitle';
  subtitle.textContent = topic.cardSubtitle;

  button.append(iconWrap, title, subtitle);
  button.addEventListener('click', onOpen);
  return button;
}
