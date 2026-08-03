import { defineApp } from '../../components/App/defineApp.js';
import { renderBinCollectionIcon } from '../../components/icons/renderBinCollectionIcon.js';
import {
  GARDEN_WASTE_ACCEPTED,
  GARDEN_WASTE_NOT_ACCEPTED
} from '../../data/binCollections/collectionTypes.js';
import { isHouseSitterMode } from '../../modes/modeConfig.js';
import {
  describeCollectionEvent,
  getBinCollectionHomeSummary,
  getNextGardenWasteCollection,
  getNextHouseholdCollection,
  getNextCollection,
  getScheduleMetadata,
  getUpcomingCollections,
  isScheduleExpired
} from '../../services/binCollectionService.js';
import {
  getCouncilRecyclingUrl,
  getBankHolidayNote,
  getCollectionInformationCopy,
  getMissedBinNote
} from './binCollectionCopy.js';

/**
 * @returns {HTMLElement}
 */
function createCollectionInformationPanel() {
  const copy = getCollectionInformationCopy();
  const panel = document.createElement('aside');
  panel.className = 'bins-collection-info';
  panel.setAttribute('aria-labelledby', 'bins-collection-info-title');

  const title = document.createElement('h2');
  title.id = 'bins-collection-info-title';
  title.className = 'bins-collection-info-title';
  title.textContent = copy.title;

  const begin = document.createElement('p');
  begin.className = 'bins-collection-info-line';
  begin.textContent = copy.beginLine;

  const location = document.createElement('p');
  location.className = 'bins-collection-info-line';
  location.textContent = copy.locationLine;

  panel.append(title, begin, location);
  return panel;
}

/**
 * @param {HTMLElement} host
 * @param {ReturnType<typeof describeCollectionEvent>} event
 * @param {boolean} houseSitter
 */
function renderEventRow(host, event, houseSitter) {
  const row = document.createElement('article');
  row.className = `bins-timeline-item bins-timeline-item--${event.cssModifier}`;
  if (event.type === 'gardenWaste') {
    row.classList.add('bins-timeline-item--secondary');
  }
  row.setAttribute('role', 'listitem');

  const iconWrap = document.createElement('span');
  iconWrap.className = 'bins-timeline-icon';
  iconWrap.append(renderBinCollectionIcon(event.iconId, { size: 26, className: 'bins-type-icon' }));

  const body = document.createElement('div');
  body.className = 'bins-timeline-body';

  const when = document.createElement('p');
  when.className = 'bins-timeline-when';
  when.textContent = event.timing.dateLabel;

  const title = document.createElement('p');
  title.className = 'bins-timeline-type';
  title.textContent = event.displayName;

  const bins = document.createElement('p');
  bins.className = 'bins-timeline-bins';
  bins.textContent = event.binDescription;

  body.append(when, title, bins);

  if (event.bankHolidayChange) {
    const badge = document.createElement('span');
    badge.className = 'bins-badge';
    badge.textContent = houseSitter ? 'Changed day' : 'Bank holiday change';
    body.append(badge);
  }

  row.append(iconWrap, body);
  host.append(row);
}

/**
 * @param {HTMLElement} card
 * @param {ReturnType<typeof describeCollectionEvent>} described
 * @param {string} label
 * @param {boolean} secondary
 */
function fillSummaryCard(card, described, label, secondary) {
  card.className = `bins-summary-card bins-summary-card--${described.cssModifier}`;
  if (secondary) card.classList.add('bins-summary-card--secondary');

  const heading = document.createElement('h3');
  heading.textContent = label;
  card.append(heading);

  const row = document.createElement('div');
  row.className = 'bins-summary-row';
  const iconWrap = document.createElement('span');
  iconWrap.className = 'bins-summary-icon';
  iconWrap.append(renderBinCollectionIcon(described.iconId, { size: 24, className: 'bins-type-icon' }));

  const text = document.createElement('div');
  text.className = 'bins-summary-text';
  const typeLine = document.createElement('p');
  typeLine.className = 'bins-summary-type';
  typeLine.textContent = described.displayName;
  const whenLine = document.createElement('p');
  whenLine.className = 'bins-summary-when';
  whenLine.textContent = `${described.timing.relative} · ${described.timing.weekdayLabel}`;
  text.append(typeLine, whenLine);
  row.append(iconWrap, text);
  card.append(row);
}

/**
 * @param {HTMLElement} list
 * @param {string[]} items
 * @param {'accepted' | 'rejected'} kind
 */
function appendGardenMaterialList(list, items, kind) {
  const iconId = kind === 'accepted' ? 'check' : 'x';
  for (const item of items) {
    const li = document.createElement('li');
    li.className = `bins-garden-list-item bins-garden-list-item--${kind}`;
    const icon = document.createElement('span');
    icon.className = 'bins-garden-list-icon';
    icon.append(renderBinCollectionIcon(iconId, { size: 16 }));
    const label = document.createElement('span');
    label.textContent = item;
    li.append(icon, label);
    list.append(li);
  }
}

/**
 * @param {HTMLElement} viewport
 * @param {import('../../types/app.js').ShellContext} context
 */
function mountBinsApp(viewport, _context) {
  viewport.replaceChildren();
  const houseSitter = isHouseSitterMode();
  const asOf = new Date();

  const page = document.createElement('section');
  page.className = 'app-page bins-app';
  page.setAttribute('aria-label', 'Bin Collection');

  const meta = getScheduleMetadata();

  if (isScheduleExpired(asOf)) {
    const expiry = document.createElement('div');
    expiry.className = 'bins-expiry-panel';
    expiry.innerHTML =
      '<h2>A newer collection calendar is needed</h2><p>The stored schedule ends after October 2026. Replace the calendar data to show upcoming collections again.</p>';
    const hint = document.createElement('p');
    hint.className = 'subtle';
    hint.textContent = `Last known period: ${meta.household.validFrom} to ${meta.validUntil} (Calendar ${meta.household.calendar}, Round ${meta.gardenWaste.round}). See docs/bin-collection-maintenance.md.`;
    expiry.append(hint);
    page.append(expiry);
    viewport.append(page);
    return;
  }

  const next = getNextCollection(asOf);
  if (!next) {
    page.innerHTML = '<p class="subtle">No upcoming collections in the current schedule.</p>';
    viewport.append(page);
    return;
  }

  const heroEvent = describeCollectionEvent(next, asOf);
  const infoPanel = createCollectionInformationPanel();

  const hero = document.createElement('header');
  hero.className = `bins-hero bins-hero--${heroEvent.cssModifier}`;

  const heroLabel = document.createElement('p');
  heroLabel.className = 'bins-hero-eyebrow';
  heroLabel.textContent = 'Next collection';

  const heroIcon = document.createElement('span');
  heroIcon.className = `bins-hero-icon bins-hero-icon--${heroEvent.cssModifier}`;
  heroIcon.append(renderBinCollectionIcon(heroEvent.iconId, { size: 40, className: 'bins-type-icon' }));

  const heroTitle = document.createElement('h2');
  heroTitle.className = 'bins-hero-title';
  heroTitle.textContent = heroEvent.displayName;

  const heroDate = document.createElement('p');
  heroDate.className = 'bins-hero-date';
  heroDate.textContent = heroEvent.timing.dateLabel;

  const heroRelative = document.createElement('p');
  heroRelative.className = 'bins-hero-relative';
  heroRelative.textContent = heroEvent.bankHolidayChange
    ? houseSitter
      ? `${heroEvent.timing.weekdayLabel} · changed collection day`
      : `${heroEvent.timing.relative} · changed from normal schedule`
    : heroEvent.timing.relative;

  const heroBins = document.createElement('p');
  heroBins.className = 'bins-hero-bins';
  heroBins.textContent = heroEvent.binDescription;

  if (heroEvent.bankHolidayChange) {
    const badge = document.createElement('span');
    badge.className = 'bins-badge bins-badge--hero';
    badge.textContent = houseSitter ? 'Changed collection day' : 'Bank holiday change';
    hero.append(badge);
  }

  hero.append(heroLabel, heroIcon, heroTitle, heroDate, heroRelative, heroBins);

  const summaryGrid = document.createElement('div');
  summaryGrid.className = 'bins-summary-grid';

  const householdNext = getNextHouseholdCollection(asOf);
  const gardenNext = getNextGardenWasteCollection(asOf);

  if (householdNext) {
    const card = document.createElement('div');
    fillSummaryCard(card, describeCollectionEvent(householdNext, asOf), 'Next household collection', false);
    summaryGrid.append(card);
  }
  if (gardenNext) {
    const card = document.createElement('div');
    fillSummaryCard(card, describeCollectionEvent(gardenNext, asOf), 'Next garden waste', true);
    summaryGrid.append(card);
  }

  const upcomingHeading = document.createElement('h3');
  upcomingHeading.className = 'bins-section-title';
  upcomingHeading.textContent = 'Upcoming collections';

  const timeline = document.createElement('div');
  timeline.className = 'bins-timeline';
  timeline.setAttribute('role', 'list');
  for (const event of getUpcomingCollections(asOf, 6)) {
    renderEventRow(timeline, describeCollectionEvent(event, asOf), houseSitter);
  }

  const practical = document.createElement('div');
  practical.className = 'bins-practical';
  const missed = document.createElement('p');
  missed.className = 'subtle';
  missed.textContent = getMissedBinNote(houseSitter);
  practical.append(missed);

  const bankNote = getBankHolidayNote(next, houseSitter, heroEvent.timing);
  if (bankNote && next.bankHolidayChange) {
    const note = document.createElement('p');
    note.className = 'bins-bank-note subtle';
    note.textContent = bankNote;
    practical.prepend(note);
  }

  const gardenDetails = document.createElement('details');
  gardenDetails.className = 'bins-garden-details';
  const gardenSummary = document.createElement('summary');
  gardenSummary.textContent = 'What goes in the brown bin?';
  gardenDetails.append(gardenSummary);

  const acceptedGroup = document.createElement('div');
  acceptedGroup.className = 'bins-garden-group';
  const acceptedHeading = document.createElement('p');
  acceptedHeading.className = 'bins-garden-group-title';
  acceptedHeading.textContent = 'Accepted';
  const accepted = document.createElement('ul');
  accepted.className = 'bins-garden-list';
  appendGardenMaterialList(accepted, GARDEN_WASTE_ACCEPTED, 'accepted');
  acceptedGroup.append(acceptedHeading, accepted);

  const notGroup = document.createElement('div');
  notGroup.className = 'bins-garden-group';
  const notHeading = document.createElement('p');
  notHeading.className = 'bins-garden-group-title';
  notHeading.textContent = 'Not accepted';
  const notAccepted = document.createElement('ul');
  notAccepted.className = 'bins-garden-list bins-garden-list--not';
  appendGardenMaterialList(notAccepted, GARDEN_WASTE_NOT_ACCEPTED, 'rejected');
  notGroup.append(notHeading, notAccepted);

  gardenDetails.append(acceptedGroup, notGroup);

  const guide = document.createElement('a');
  guide.className = 'bins-guide-link';
  guide.href = getCouncilRecyclingUrl();
  guide.target = '_blank';
  guide.rel = 'noopener noreferrer';
  guide.textContent = 'Council recycling guidance ↗';

  const footer = document.createElement('p');
  footer.className = 'bins-source subtle';
  footer.textContent = `Schedule: ${meta.household.source}, Calendar ${meta.household.calendar} & Round ${meta.gardenWaste.round} (${meta.household.validFrom}–${meta.validUntil}). Works offline.`;

  page.append(
    infoPanel,
    hero,
    summaryGrid,
    upcomingHeading,
    timeline,
    practical,
    gardenDetails,
    guide,
    footer
  );
  viewport.append(page);
}

export const binsApp = defineApp({
  id: 'bins',
  title: 'Bin Collection',
  iconId: 'trash-2',
  description: 'Recycling and rubbish collection days',
  capabilities: ['schedule', 'offline'],
  accent: '#28d17c',
  profiles: ['owner', 'housesitter'],
  summary: () =>
    getBinCollectionHomeSummary(new Date(), { houseSitter: isHouseSitterMode() }),
  mount: mountBinsApp
});
