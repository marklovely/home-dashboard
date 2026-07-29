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
import { openHouseGuideTopic } from '../../services/guideNavigation.js';
import {
  getBankHolidayNote,
  getCollectionTimingIntro,
  getHouseSitterCollectionSentence,
  getMissedBinNote
} from './binCollectionCopy.js';

/**
 * @param {HTMLElement} host
 * @param {ReturnType<typeof describeCollectionEvent>} event
 * @param {boolean} houseSitter
 * @param {{ compact?: boolean }} [options]
 */
function renderEventRow(host, event, houseSitter, options = {}) {
  const { compact = false } = options;
  const row = document.createElement('article');
  row.className = `bins-timeline-item bins-timeline-item--${event.cssModifier}`;

  const iconWrap = document.createElement('span');
  iconWrap.className = 'bins-timeline-icon';
  iconWrap.append(renderBinCollectionIcon(event.iconId, { size: compact ? 22 : 26 }));

  const body = document.createElement('div');
  body.className = 'bins-timeline-body';

  const when = document.createElement('p');
  when.className = 'bins-timeline-when';
  when.textContent = event.timing.dateLabel;

  const title = document.createElement('p');
  title.className = 'bins-timeline-type';
  title.textContent = event.displayName;

  const bins = document.createElement('p');
  bins.className = 'bins-timeline-bins subtle';
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
 * @param {HTMLElement} viewport
 * @param {import('../../types/app.js').ShellContext} context
 */
function mountBinsApp(viewport, context) {
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

  const hero = document.createElement('header');
  hero.className = 'bins-hero';

  const heroLabel = document.createElement('p');
  heroLabel.className = 'bins-hero-eyebrow';
  heroLabel.textContent = 'Next collection';

  const heroIcon = document.createElement('span');
  heroIcon.className = `bins-hero-icon bins-hero-icon--${heroEvent.cssModifier}`;
  heroIcon.append(renderBinCollectionIcon(heroEvent.iconId, { size: 40 }));

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
  heroBins.className = 'bins-hero-bins subtle';
  heroBins.textContent = heroEvent.binDescription;

  if (heroEvent.bankHolidayChange) {
    const badge = document.createElement('span');
    badge.className = 'bins-badge bins-badge--hero';
    badge.textContent = houseSitter ? 'Changed collection day' : 'Bank holiday change';
    hero.append(badge);
  }

  hero.append(heroLabel, heroIcon, heroTitle, heroDate, heroRelative, heroBins);

  const sitterLine = getHouseSitterCollectionSentence(
    heroEvent.displayName,
    heroEvent.timing,
    heroEvent.binDescription,
    houseSitter
  );
  if (sitterLine) {
    const info = document.createElement('p');
    info.className = 'bins-info-line';
    info.textContent = sitterLine;
    hero.append(info);
  }

  const summaryGrid = document.createElement('div');
  summaryGrid.className = 'bins-summary-grid';

  const householdNext = getNextHouseholdCollection(asOf);
  const gardenNext = getNextGardenWasteCollection(asOf);

  for (const [label, event] of [
    ['Next household collection', householdNext],
    ['Next garden waste', gardenNext]
  ]) {
    if (!event) continue;
    const card = document.createElement('div');
    card.className = 'bins-summary-card';
    const described = describeCollectionEvent(event, asOf);
    card.innerHTML = `<h3>${label}</h3>`;
    const typeLine = document.createElement('p');
    typeLine.className = 'bins-summary-type';
    typeLine.textContent = described.displayName;
    const whenLine = document.createElement('p');
    whenLine.className = 'bins-summary-when';
    whenLine.textContent = `${described.timing.relative} · ${described.timing.weekdayLabel}`;
    card.append(typeLine, whenLine);
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
  practical.innerHTML = `<p>${getCollectionTimingIntro(houseSitter)}</p><p class="subtle">${getMissedBinNote(houseSitter)}</p>`;

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

  const accepted = document.createElement('ul');
  accepted.className = 'bins-garden-list';
  for (const item of GARDEN_WASTE_ACCEPTED) {
    const li = document.createElement('li');
    li.textContent = item;
    accepted.append(li);
  }
  const notHeading = document.createElement('p');
  notHeading.className = 'bins-garden-not-heading';
  notHeading.textContent = 'Not accepted';
  const notAccepted = document.createElement('ul');
  notAccepted.className = 'bins-garden-list bins-garden-list--not';
  for (const item of GARDEN_WASTE_NOT_ACCEPTED) {
    const li = document.createElement('li');
    li.textContent = item;
    notAccepted.append(li);
  }
  gardenDetails.append(accepted, notHeading, notAccepted);

  const guide = document.createElement('button');
  guide.type = 'button';
  guide.className = 'bins-guide-link';
  guide.textContent = 'More about bins and recycling';
  guide.addEventListener('click', () => openHouseGuideTopic(context, 'rubbish-recycling'));

  const footer = document.createElement('p');
  footer.className = 'bins-source subtle';
  footer.textContent = `Schedule: ${meta.household.source}, Calendar ${meta.household.calendar} & Round ${meta.gardenWaste.round} (${meta.household.validFrom}–${meta.validUntil}). Works offline.`;

  page.append(
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
