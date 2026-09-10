/**
 * Council hint banner + ukbinday import (hub setup bins step and Settings → Bin reminders).
 */

import { fetchBinsCouncilHint } from '../../api/binsCouncilHintApi.js';
import { fetchBinsImportSchedule } from '../../api/binsImportApi.js';
import { getBinScheduleLocale } from '../../lib/binScheduleLocale.js';
import {
  formatPropertyAddress,
  formatPropertyAddressShort,
  normalizePropertyAddress,
  propertyAddressLookupKey
} from '../../lib/propertyAddress.js';

/**
 * @param {string | null | undefined} postcode
 */
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

/**
 * @param {Object} options
 * @param {() => string} [options.getHubCountryCode]
 * @param {() => import('../../lib/propertyAddress.js').PropertyAddress} [options.getPropertyAddress]
 * @param {() => string} [options.getPropertyPostcode]
 * @param {(detail: { household: import('../../lib/binScheduleProfile.js').BinScheduleHouseholdEntry[], gardenWaste: import('../../lib/binScheduleProfile.js').BinScheduleGardenEntry[], count: number }) => void} options.onImportSuccess
 * @param {(message: string) => void} [options.onImportError]
 * @param {(hint: import('../../api/binsCouncilHintApi.js').BinsCouncilHint | null) => void} [options.onCouncilHintUpdated]
 * @param {() => void} [options.onRender]
 * @param {'hub' | 'settings'} [options.variant]
 */
export function createBinScheduleCouncilTools(options) {
  const variant = options.variant ?? 'hub';

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
  let councilHintFetchedForAddressKey = null;
  let importInProgress = false;

  const host = document.createElement('div');
  host.className = 'hub-setup-bin-council-hint-host';

  function readPropertyAddress() {
    return normalizePropertyAddress(options.getPropertyAddress?.() ?? {});
  }

  function readPostcode() {
    return String(options.getPropertyPostcode?.() ?? readPropertyAddress().postcode ?? '').trim();
  }

  function readLocale() {
    return getBinScheduleLocale(options.getHubCountryCode?.() ?? 'GB');
  }

  function readAddressKey() {
    return propertyAddressLookupKey(readPropertyAddress());
  }

  function notifyRender() {
    options.onRender?.();
  }

  function renderAddressSummary(banner) {
    if (variant !== 'settings') return;

    const summary = formatPropertyAddressShort(readPropertyAddress());
    const addressLine = document.createElement('p');
    addressLine.className = 'hub-setup-bin-address-summary subtle';
    addressLine.textContent = summary
      ? `Property address (from Home details): ${summary}`
      : 'Add your property address in Home details to enable automatic import.';

    const refreshButton = document.createElement('button');
    refreshButton.type = 'button';
    refreshButton.className = 'settings-action-button settings-action-button--secondary hub-setup-bin-refresh-address-button';
    refreshButton.textContent = 'Refresh address lookup';
    refreshButton.addEventListener('click', () => {
      councilHint = null;
      councilHintLookupError = null;
      councilHintFetchedForPostcode = null;
      councilHintFetchedForAddressKey = null;
      councilHintRequest = null;
      refreshWhenVisible();
    });

    const addressBlock = document.createElement('div');
    addressBlock.className = 'hub-setup-bin-address-block';
    addressBlock.append(addressLine, refreshButton);
    banner.prepend(addressBlock);
  }

  function render() {
    host.replaceChildren();
    const locale = readLocale();
    if (!locale.isUnitedKingdom) return;

    const banner = document.createElement('div');
    banner.className = 'hub-setup-bin-council-hint';
    banner.setAttribute('role', 'status');

    renderAddressSummary(banner);

    const postcode = readPostcode();
    const guestAccessLabel = variant === 'settings' ? 'Home details' : 'Guest access';
    if (!postcode) {
      banner.classList.add('hub-setup-bin-council-hint--prompt');
      banner.append(
        Object.assign(document.createElement('p'), {
          textContent: `Add your postcode in ${guestAccessLabel} to see which council area you are in and import collection dates.`
        })
      );
      host.append(banner);
      return;
    }

    const addressKey = readAddressKey();
    const addressChanged =
      councilHintFetchedForAddressKey && councilHintFetchedForAddressKey !== addressKey;

    if (councilHintLoading || importInProgress) {
      banner.classList.add('hub-setup-bin-council-hint--loading');
      banner.append(
        Object.assign(document.createElement('p'), {
          textContent: importInProgress
            ? 'Fetching collection dates from your council…'
            : addressChanged
              ? 'Updating council lookup for your new address…'
              : 'Looking up your council area…'
        })
      );
      host.append(banner);
      return;
    }

    if (
      addressChanged ||
      !isCouncilHintForPostcode(councilHint, postcode) ||
      councilHintFetchedForAddressKey !== addressKey
    ) {
      banner.classList.add('hub-setup-bin-council-hint--loading');
      banner.append(
        Object.assign(document.createElement('p'), {
          textContent: addressChanged
            ? 'Your address changed — refreshing council lookup…'
            : 'Updating council area for your postcode…'
        })
      );
      host.append(banner);
      ensureCouncilHintLoaded();
      return;
    }

    const areaLabel = councilHint?.councilName ?? councilHint?.adminDistrict;
    if (!areaLabel) {
      banner.classList.add('hub-setup-bin-council-hint--prompt');
      banner.append(
        Object.assign(document.createElement('p'), {
          textContent:
            councilHintLookupError ??
            'We could not match a council area for this postcode — you can still add dates manually.'
        })
      );
      host.append(banner);
      return;
    }

    const title = document.createElement('p');
    title.className = 'hub-setup-bin-council-hint__title';
    const region = councilHint?.region ? ` (${councilHint.region})` : '';
    title.textContent = `Looks like ${areaLabel}${region}`;

    const detail = document.createElement('p');
    detail.className = 'hub-setup-bin-council-hint__detail subtle';

    if (councilHint?.binsUrl) {
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

    if (councilHint?.ukBinDaySupported) {
      const importButton = document.createElement('button');
      importButton.type = 'button';
      importButton.className = 'settings-action-button hub-setup-bin-import-button';
      importButton.textContent = 'Import dates automatically';
      importButton.addEventListener('click', () => {
        void runUkBinDayImport();
      });
      banner.append(importButton);
    }

    host.append(banner);
  }

  async function runUkBinDayImport() {
    if (importInProgress || !councilHint?.ukBinDaySupported) return;

    const address = readPropertyAddress();
    const postcode = address.postcode || readPostcode();
    if (!postcode) {
      options.onImportError?.(`Add your postcode in ${variant === 'settings' ? 'Home details' : 'Guest access'} before importing dates.`);
      return;
    }

    importInProgress = true;
    councilHintLookupError = null;
    render();
    notifyRender();

    const result = await fetchBinsImportSchedule({
      postcode,
      councilId: councilHint.ukBinDayCouncilId,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      address: formatPropertyAddress(address)
    });

    importInProgress = false;
    if (!result.ok) {
      councilHintLookupError = result.message;
      options.onImportError?.(result.message);
      render();
      notifyRender();
      return;
    }

    const household = result.data.household ?? [];
    const gardenWaste = result.data.gardenWaste ?? [];
    options.onImportSuccess?.({
      household,
      gardenWaste,
      count: household.length + gardenWaste.length
    });
    render();
    notifyRender();
  }

  async function refreshCouncilHint(requestedPostcodeKey, requestedAddressKey) {
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
    render();
    notifyRender();

    const result = await fetchBinsCouncilHint(postcode);
    if (
      normalizePostcodeKey(readPostcode()) !== requestedPostcodeKey ||
      readAddressKey() !== requestedAddressKey
    ) {
      councilHintLoading = false;
      return;
    }

    councilHintLoading = false;
    if (result.ok) {
      councilHint = result.hint;
      if (!result.hint.adminDistrict && !result.hint.councilName) {
        councilHintLookupError = `That postcode was not found — check ${variant === 'settings' ? 'Home details' : 'Guest access'} or add your council website below.`;
      }
    } else {
      councilHint = null;
      councilHintLookupError =
        result.status === 404
          ? 'Council area lookup is not available on this hub yet — add your council website below, or paste dates from their calendar.'
          : result.message || 'Council lookup failed — you can still add dates manually.';
    }
    options.onCouncilHintUpdated?.(councilHint);
    render();
    notifyRender();
  }

  function ensureCouncilHintLoaded() {
    const postcode = readPostcode();
    const postcodeKey = normalizePostcodeKey(postcode);
    const addressKey = readAddressKey();

    if (!readLocale().isUnitedKingdom || !postcode) {
      councilHint = null;
      councilHintLookupError = null;
      councilHintFetchedForPostcode = null;
      councilHintFetchedForAddressKey = null;
      return;
    }

    if (
      councilHintFetchedForPostcode === postcodeKey &&
      councilHintFetchedForAddressKey === addressKey &&
      isCouncilHintForPostcode(councilHint, postcode)
    ) {
      return;
    }

    if (
      councilHint &&
      (councilHintFetchedForAddressKey !== addressKey ||
        !isCouncilHintForPostcode(councilHint, postcode))
    ) {
      councilHint = null;
      councilHintLookupError = null;
    }

    if (councilHintRequest) return;

    councilHintLoading = true;
    councilHintRequest = refreshCouncilHint(postcodeKey, addressKey).finally(() => {
      councilHintRequest = null;
      if (normalizePostcodeKey(readPostcode()) === postcodeKey && readAddressKey() === addressKey) {
        councilHintFetchedForPostcode = postcodeKey;
        councilHintFetchedForAddressKey = addressKey;
      }
      render();
      notifyRender();
    });
  }

  function refreshWhenVisible() {
    const postcode = readPostcode();
    const postcodeKey = normalizePostcodeKey(postcode);
    const addressKey = readAddressKey();

    if (
      councilHintFetchedForPostcode !== postcodeKey ||
      councilHintFetchedForAddressKey !== addressKey ||
      !isCouncilHintForPostcode(councilHint, postcode)
    ) {
      councilHint = null;
      councilHintLookupError = null;
      councilHintFetchedForPostcode = null;
      councilHintFetchedForAddressKey = null;
    }

    ensureCouncilHintLoaded();
    render();
  }

  return {
    host,
    render,
    refreshWhenVisible,
    isImportInProgress: () => importInProgress,
    getCouncilHint: () => councilHint
  };
}
