/**
 * Hub setup bins step — chooser → sub-wizard → summary (dates + optional details).
 */

import {
  hasConfiguredBinSchedule,
  inferBinSchedulePeriod,
  normalizeBinSchedule,
  readBinScheduleFromProfile
} from '../../lib/binScheduleProfile.js';
import {
  binScheduleEntriesFromParsed,
  parseBinSchedulePaste
} from '../../lib/binSchedulePaste.js';
import { fetchBinsCouncilHint } from '../../api/binsCouncilHintApi.js';
import { binScheduleIntroForLocale, getBinScheduleLocale } from '../../lib/binScheduleLocale.js';
import { normalizeHubCountryCode } from '../../lib/hubCountries.js';
import { normalizePropertyAddress } from '../../lib/propertyAddress.js';
import { getBinScheduleFieldHelp } from './hubSetupHelpContent.js';
import { createSetupField, createSetupIntro } from './hubSetupFields.js';
import { createBinPatternWizard } from './binPatternWizard.js';
import {
  createBinScheduleReviewList,
  reviewEntriesFromSchedule,
  scheduleFromReviewEntries
} from './binScheduleReviewList.js';
import { createBinAlertHoursField } from './binScheduleFields.js';

/** @typedef {'chooser' | 'pattern' | 'paste' | 'summary'} BinHubPanelMode */

/**
 * @param {Record<string, unknown>} profile
 * @param {import('./hubSetupHelpContent.js').HubUseCase} useCase
 * @param {{
 *   onLayoutChange?: () => void,
 *   onDatesApplied?: (detail: { count: number, source: 'pattern' | 'paste' }) => void,
 *   getHubCountryCode?: () => string,
 *   getPropertyPostcode?: () => string
 * }} [options]
 */
export function createBinScheduleHubPanel(profile = {}, useCase = 'owner', options = {}) {
  let draftSchedule = readBinScheduleFromProfile(profile);
  let mode = /** @type {BinHubPanelMode} */ (
    hasConfiguredBinSchedule(draftSchedule) ? 'summary' : 'chooser'
  );
  function readCountryCode() {
    return normalizeHubCountryCode(
      options.getHubCountryCode?.() ?? /** @type {{ hubCountryCode?: string }} */ (profile).hubCountryCode
    );
  }

  function readPostcode() {
    return String(
      options.getPropertyPostcode?.() ??
        normalizePropertyAddress(/** @type {Record<string, unknown>} */ (profile).propertyAddress).postcode ??
        ''
    ).trim();
  }

  function normalizePostcodeKey(postcode) {
    return String(postcode ?? '')
      .replace(/\s+/g, '')
      .toUpperCase();
  }

  /**
   * @param {import('../../api/binsCouncilHintApi.js').BinsCouncilHint | null} hint
   * @param {string} postcode
   */
  function isCouncilHintForPostcode(hint, postcode) {
    if (!hint?.postcode || !postcode) return false;
    return normalizePostcodeKey(hint.postcode) === normalizePostcodeKey(postcode);
  }

  function readLocale() {
    return getBinScheduleLocale(readCountryCode());
  }

  /** @type {import('../../api/binsCouncilHintApi.js').BinsCouncilHint | null} */
  let councilHint = null;
  let councilHintLoading = false;
  /** @type {string | null} */
  let councilHintLookupError = null;
  /** @type {Promise<void> | null} */
  let councilHintRequest = null;
  /** @type {string | null} */
  let councilHintFetchedForPostcode = null;
  /** @type {string | null} */
  let lastAutoFilledCouncilUrl = null;
  let councilUrlUserEdited = false;

  const wrap = document.createElement('div');
  wrap.className = 'hub-setup-bin-schedule hub-setup-bin-schedule--hub';

  const location = createSetupField('Where are bins collected from?', draftSchedule.collectionLocation, {
    placeholder: 'End of the close, left-hand side',
    ...getBinScheduleFieldHelp(useCase)
  });

  const councilUrl = createSetupField(
    getBinScheduleLocale(readCountryCode()).councilUrlLabel,
    draftSchedule.councilUrl,
    {
      placeholder: getBinScheduleLocale(readCountryCode()).councilUrlPlaceholder,
      type: 'url'
    }
  );

  /**
   * @param {string | null | undefined} url
   */
  function normalizeCouncilUrlForCompare(url) {
    return String(url ?? '')
      .trim()
      .replace(/\/$/, '')
      .toLowerCase();
  }

  councilUrl.input.addEventListener('input', () => {
    const current = councilUrl.input.value.trim();
    if (
      !current ||
      (lastAutoFilledCouncilUrl &&
        normalizeCouncilUrlForCompare(current) === normalizeCouncilUrlForCompare(lastAutoFilledCouncilUrl))
    ) {
      councilUrlUserEdited = false;
      return;
    }
    councilUrlUserEdited = true;
  });

  const alertHours = createBinAlertHoursField({ binSchedule: draftSchedule });

  /** @type {ReturnType<typeof createBinPatternWizard> | null} */
  let patternWizard = null;
  /** @type {ReturnType<typeof createBinScheduleReviewList> | null} */
  let entryReviewList = null;

  const pasteWrap = document.createElement('div');
  pasteWrap.className = 'field';
  const pasteLabel = document.createElement('span');
  pasteLabel.textContent = 'Paste collection dates';
  const pasteInput = document.createElement('textarea');
  pasteInput.className = 'hub-setup-bin-paste-input';
  pasteInput.rows = 8;
  pasteInput.placeholder = '2026-09-12 general\n2026-09-19 recycling\n2026-09-26 general';
  const pasteHint = document.createElement('span');
  pasteHint.className = 'settings-help subtle';
  pasteHint.textContent = 'One date per line — e.g. 2026-09-12 general or 19/09/2026 recycling';
  pasteWrap.append(pasteLabel, pasteInput, pasteHint);

  const pastePreview = document.createElement('p');
  pastePreview.className = 'hub-setup-bin-paste-preview subtle';
  pastePreview.hidden = true;

  function mergeDraft(partial) {
    draftSchedule = normalizeBinSchedule({ ...draftSchedule, ...partial });
  }

  function readLocationFields() {
    return {
      collectionLocation: location.input.value.trim(),
      councilUrl: councilUrl.input.value.trim(),
      alertHoursBefore: alertHours.readAlertHoursBefore()
    };
  }

  function dateCount() {
    return draftSchedule.household.length + draftSchedule.gardenWaste.length;
  }

  function applyCouncilHintToFields() {
    const locale = readLocale();
    const councilLabel = councilUrl.wrap.querySelector('.settings-subsection-title');
    if (councilLabel) councilLabel.textContent = locale.councilUrlLabel;
    councilUrl.input.placeholder = locale.councilUrlPlaceholder;

    const nextUrl = councilHint?.binsUrl?.trim();
    if (!nextUrl) return;

    const current = councilUrl.input.value.trim();
    const matchesLastAutoFill =
      lastAutoFilledCouncilUrl &&
      normalizeCouncilUrlForCompare(current) === normalizeCouncilUrlForCompare(lastAutoFilledCouncilUrl);
    const shouldApply = !current || matchesLastAutoFill || !councilUrlUserEdited;

    if (shouldApply) {
      councilUrl.input.value = nextUrl;
      lastAutoFilledCouncilUrl = nextUrl;
      councilUrlUserEdited = false;
    }
  }

  /**
   * @param {HTMLElement} container
   */
  function renderCouncilHintBanner(container) {
    container.replaceChildren();
    const locale = readLocale();
    if (!locale.isUnitedKingdom) return;

    const banner = document.createElement('div');
    banner.className = 'hub-setup-bin-council-hint';
    banner.setAttribute('role', 'status');

    const postcode = readPostcode();
    if (!postcode) {
      banner.classList.add('hub-setup-bin-council-hint--prompt');
      banner.textContent =
        'Add your postcode in Guest access to see which council area you are in and link your council bins website.';
      container.append(banner);
      return;
    }

    if (councilHintLoading) {
      banner.classList.add('hub-setup-bin-council-hint--loading');
      banner.textContent = 'Looking up your council area…';
      container.append(banner);
      return;
    }

    if (!isCouncilHintForPostcode(councilHint, postcode)) {
      banner.classList.add('hub-setup-bin-council-hint--loading');
      banner.textContent = 'Updating council area for your postcode…';
      container.append(banner);
      ensureCouncilHintLoaded();
      return;
    }

    const areaLabel = councilHint.councilName ?? councilHint.adminDistrict;
    if (!areaLabel) {
      banner.classList.add('hub-setup-bin-council-hint--prompt');
      banner.textContent =
        councilHintLookupError ??
        'We could not match a council area for this postcode — you can still add dates manually.';
      container.append(banner);
      return;
    }

    const title = document.createElement('p');
    title.className = 'hub-setup-bin-council-hint__title';
    const region = councilHint.region ? ` (${councilHint.region})` : '';
    title.textContent = `Looks like ${areaLabel}${region}`;

    const detail = document.createElement('p');
    detail.className = 'hub-setup-bin-council-hint__detail subtle';

    if (councilHint.binsUrl) {
      detail.textContent = councilHint.ukBinDaySupported
        ? `${councilHint.councilName ?? 'Your council'} supports automated bin lookups — open their site for your calendar.`
        : councilHint.councilName
          ? `${councilHint.councilName} — open the council website and find your bin collection calendar.`
          : 'Open your council website and find your bin collection calendar.';
      const link = document.createElement('a');
      link.href = councilHint.binsUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'hub-setup-bin-council-hint__link';
      link.textContent = councilHint.ukBinDaySupported
        ? 'View council bin calendar'
        : 'View council website';
      banner.append(title, detail, link);
    } else {
      detail.textContent =
        'Check your council website for collection dates — paste them below or use the pattern wizard.';
      banner.append(title, detail);
    }

    container.append(banner);
  }

  async function refreshCouncilHint(requestedPostcodeKey) {
    const locale = readLocale();
    if (!locale.isUnitedKingdom) {
      councilHint = null;
      councilHintLookupError = null;
      councilHintLoading = false;
      return;
    }

    const postcode = readPostcode();
    if (!postcode) {
      councilHint = null;
      councilHintLookupError = null;
      councilHintLoading = false;
      return;
    }

    councilHintLoading = true;
    councilHintLookupError = null;
    const result = await fetchBinsCouncilHint(postcode);
    if (normalizePostcodeKey(readPostcode()) !== requestedPostcodeKey) {
      councilHintLoading = false;
      return;
    }

    councilHintLoading = false;
    if (result.ok) {
      councilHint = result.hint;
      if (!result.hint.adminDistrict && !result.hint.councilName) {
        councilHintLookupError = 'That postcode was not found — check Guest access or add your council website below.';
      }
    } else {
      councilHint = null;
      councilHintLookupError =
        result.status === 404
          ? 'Council area lookup is not available on this hub yet — add your council website below, or paste dates from their calendar.'
          : result.message || 'Council lookup failed — you can still add dates manually.';
    }
    applyCouncilHintToFields();
  }

  function ensureCouncilHintLoaded() {
    const postcode = readPostcode();
    const postcodeKey = normalizePostcodeKey(postcode);
    if (!readLocale().isUnitedKingdom || !postcode) {
      councilHint = null;
      councilHintLookupError = null;
      councilHintFetchedForPostcode = null;
      return;
    }
    if (councilHintFetchedForPostcode === postcodeKey && isCouncilHintForPostcode(councilHint, postcode)) {
      return;
    }
    if (councilHint && !isCouncilHintForPostcode(councilHint, postcode)) {
      councilHint = null;
      councilHintLookupError = null;
    }
    if (councilHintRequest) return;
    councilHintLoading = true;
    councilHintRequest = refreshCouncilHint(postcodeKey).finally(() => {
      councilHintRequest = null;
      if (normalizePostcodeKey(readPostcode()) === postcodeKey) {
        councilHintFetchedForPostcode = postcodeKey;
      }
      if (mode === 'chooser' || mode === 'summary') render();
    });
  }

  function refreshWhenVisible() {
    const postcode = readPostcode();
    const postcodeKey = normalizePostcodeKey(postcode);
    if (councilHintFetchedForPostcode !== postcodeKey || !isCouncilHintForPostcode(councilHint, postcode)) {
      councilHint = null;
      councilHintLookupError = null;
      councilHintFetchedForPostcode = null;
    }
    ensureCouncilHintLoaded();
    render();
  }

  /**
   * @param {'pattern' | 'paste'} source
   */
  function completeSubWizard(source) {
    mode = 'summary';
    render();
    options.onDatesApplied?.({ count: dateCount(), source });
  }

  function renderChooser() {
    wrap.replaceChildren();
    const locale = readLocale();
    wrap.append(createSetupIntro(binScheduleIntroForLocale(locale, useCase)));

    const councilHintHost = document.createElement('div');
    councilHintHost.className = 'hub-setup-bin-council-hint-host';
    renderCouncilHintBanner(councilHintHost);
    ensureCouncilHintLoaded();

    const choicesHeading = document.createElement('h3');
    choicesHeading.className = 'settings-subsection-title';
    choicesHeading.textContent = 'How do you want to add dates?';

    const choicesHint = document.createElement('p');
    choicesHint.className = 'settings-help subtle';
    choicesHint.textContent =
      'Pick one option to open a short setup flow. Or tap Continue to skip — you can add dates later in Settings → Bin reminders.';

    const choices = document.createElement('div');
    choices.className = 'hub-setup-bin-choices';

    const choiceCards = [
      {
        title: locale.chooserPatternTitle,
        detail: locale.chooserPatternDetail,
        action: 'pattern',
        primary: !locale.emphasizePaste
      },
      {
        title: locale.chooserPasteTitle,
        detail: locale.chooserPasteDetail,
        action: 'paste',
        primary: locale.emphasizePaste
      }
    ];
    if (locale.emphasizePaste) choiceCards.reverse();

    for (const { title, detail, action, primary } of choiceCards) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `hub-setup-bin-choice${primary ? ' hub-setup-bin-choice--primary' : ''}`;
      card.innerHTML = `<strong>${title}</strong><span class="subtle">${detail}</span>`;
      card.addEventListener('click', () => {
        mode = /** @type {BinHubPanelMode} */ (action);
        render();
      });
      choices.append(card);
    }

    wrap.append(councilHintHost, choicesHeading, choicesHint, choices);
  }

  function renderSummary() {
    wrap.replaceChildren();

    const count = dateCount();
    const banner = document.createElement('div');
    banner.className = 'hub-setup-bin-summary-banner';
    banner.setAttribute('role', 'status');

    const bannerTitle = document.createElement('p');
    bannerTitle.className = 'hub-setup-bin-summary-banner__title';
    bannerTitle.textContent =
      count > 0
        ? `${count} collection date${count === 1 ? '' : 's'} ready`
        : 'No collection dates yet';

    const bannerDetail = document.createElement('p');
    bannerDetail.className = 'hub-setup-bin-summary-banner__detail subtle';
    bannerDetail.textContent =
      count > 0
        ? 'Check the list below, add where bins are collected from if you like, then tap Continue to save and move on.'
        : 'Add dates with the options below, or tap Continue to skip this step for now.';

    banner.append(bannerTitle, bannerDetail);

    const changeMethod = document.createElement('button');
    changeMethod.type = 'button';
    changeMethod.className = 'hub-setup-bin-change-method';
    changeMethod.textContent = count > 0 ? 'Change how dates were added' : 'Add collection dates';
    changeMethod.addEventListener('click', () => {
      mode = 'chooser';
      render();
    });

    entryReviewList = createBinScheduleReviewList({
      entries: reviewEntriesFromSchedule(draftSchedule),
      onChange: (entries) => {
        mergeDraft(scheduleFromReviewEntries(entries));
        entryReviewList?.setEntries(entries);
        renderSummaryStatus(banner, bannerTitle, bannerDetail);
      },
      emptyMessage: 'No dates yet — tap “Add collection dates” above.'
    });

    const detailsHeading = document.createElement('h3');
    detailsHeading.className = 'settings-subsection-title';
    detailsHeading.textContent = 'Collection day details (optional)';

    const councilHintHost = document.createElement('div');
    councilHintHost.className = 'hub-setup-bin-council-hint-host';
    renderCouncilHintBanner(councilHintHost);
    ensureCouncilHintLoaded();
    applyCouncilHintToFields();

    renderSummaryStatus(banner, bannerTitle, bannerDetail);
    wrap.append(
      banner,
      councilHintHost,
      changeMethod,
      entryReviewList.wrap,
      detailsHeading,
      location.wrap,
      councilUrl.wrap,
      alertHours.wrap
    );
  }

  /**
   * @param {HTMLElement} banner
   * @param {HTMLElement} title
   * @param {HTMLElement} detail
   */
  function renderSummaryStatus(banner, title, detail) {
    const count = dateCount();
    title.textContent =
      count > 0
        ? `${count} collection date${count === 1 ? '' : 's'} ready`
        : 'No collection dates yet';
    detail.textContent =
      count > 0
        ? 'Check the list below, add where bins are collected from if you like, then tap Continue to save and move on.'
        : 'Add dates with the options below, or tap Continue to skip this step for now.';
    banner.classList.toggle('hub-setup-bin-summary-banner--empty', count === 0);
  }

  function renderPattern() {
    wrap.replaceChildren();
    patternWizard = createBinPatternWizard(
      draftSchedule,
      (nextDraft) => {
        mergeDraft(nextDraft);
      },
      {
        hubCountryCode: readCountryCode(),
        suggestedPattern: councilHint?.suggestedPattern
      }
    );
    wrap.append(patternWizard.wrap);
  }

  function renderPaste() {
    wrap.replaceChildren();
    const intro = document.createElement('p');
    intro.className = 'settings-help subtle';
    intro.textContent = readLocale().pasteIntro;

    const previewButton = document.createElement('button');
    previewButton.type = 'button';
    previewButton.className = 'settings-action-button hub-setup-bin-add-button';
    previewButton.textContent = 'Parse & preview';

    previewButton.addEventListener('click', () => {
      const parsed = parseBinSchedulePaste(pasteInput.value);
      if (!parsed.validCount) {
        pastePreview.hidden = false;
        pastePreview.textContent = `Could not parse any complete lines (${parsed.unknownCount} need attention).`;
        return;
      }
      const { household, gardenWaste } = binScheduleEntriesFromParsed(parsed.entries);
      mergeDraft({ household, gardenWaste });
      completeSubWizard('paste');
    });

    wrap.append(intro, pasteWrap, previewButton, pastePreview);
  }

  function render() {
    if (mode === 'pattern') renderPattern();
    else if (mode === 'paste') renderPaste();
    else if (mode === 'summary') renderSummary();
    else renderChooser();
    options.onLayoutChange?.();
  }

  render();

  return {
    wrap,
    refreshWhenVisible,
    getUseCase: () => useCase,
    readBinSchedule() {
      return inferBinSchedulePeriod(
        normalizeBinSchedule({
          ...draftSchedule,
          ...readLocationFields()
        })
      );
    },
    isInSubWizard() {
      return mode === 'pattern' || mode === 'paste';
    },
    getFooterState() {
      if (mode === 'pattern' && patternWizard) {
        const onReview = patternWizard.progressLabel().includes('Step 4');
        return {
          backConsumes: true,
          nextLabel: onReview ? 'Use these dates' : 'Next'
        };
      }
      if (mode === 'paste') {
        return { backConsumes: true, nextLabel: 'Back to summary' };
      }
      return { backConsumes: false, nextLabel: '' };
    },
    /** @returns {true | 'toast'} */
    handleBack() {
      if (mode === 'pattern' && patternWizard?.handleBack()) {
        patternWizard.render();
        return true;
      }
      if (mode === 'pattern' || mode === 'paste') {
        mode = hasConfiguredBinSchedule(draftSchedule) ? 'summary' : 'chooser';
        render();
        return true;
      }
      return false;
    },
    /**
     * @returns {true | 'pick-stream' | 'pick-pattern' | 'missing-start' | 'no-dates' | false}
     */
    handleContinue() {
      if (mode === 'pattern' && patternWizard) {
        const result = patternWizard.handleContinue();
        if (result === true) {
          patternWizard.render();
          return true;
        }
        if (typeof result === 'string') return result;
        mergeDraft(patternWizard.finish());
        completeSubWizard('pattern');
        return true;
      }
      if (mode === 'paste') {
        mode = hasConfiguredBinSchedule(draftSchedule) ? 'summary' : 'chooser';
        render();
        return true;
      }
      return false;
    }
  };
}
