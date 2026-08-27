import { fetchAddressById, fetchAddressSuggestions } from '../../api/addressApi.js';
import { supportsUkAddressAutocomplete } from '../../lib/hubCountries.js';

/**
 * @param {Object} options
 * @param {string} [options.countryCode]
 * @param {(address: import('../../lib/propertyAddress.js').PropertyAddress) => void} options.onSelect
 */
export function createAddressAutocompleteField(options) {
  const countryCode = options.countryCode ?? 'GB';
  const wrap = document.createElement('div');
  wrap.className = 'hub-setup-address-search';

  const label = document.createElement('label');
  label.className = 'settings-subsection hub-setup-field';

  const labelText = document.createElement('span');
  labelText.className = 'settings-field-label';
  labelText.textContent = 'Find address';

  const hint = document.createElement('span');
  hint.className = 'settings-field-hint subtle';
  hint.textContent = 'Start typing a postcode or street name, then pick your address from the list.';

  const inputWrap = document.createElement('div');
  inputWrap.className = 'hub-setup-address-search-input-wrap';

  const input = document.createElement('input');
  input.className = 'hub-setup-input';
  input.type = 'search';
  input.autocomplete = 'off';
  input.placeholder = 'e.g. SW1A 1AA or 10 Downing Street';
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-autocomplete', 'list');

  const status = document.createElement('p');
  status.className = 'subtle hub-setup-address-search-status';
  status.hidden = true;

  const list = document.createElement('ul');
  list.className = 'hub-setup-address-search-results';
  list.hidden = true;
  list.setAttribute('role', 'listbox');

  inputWrap.append(input);
  label.append(labelText, hint, inputWrap, status);
  wrap.append(label, list);

  /** @type {ReturnType<typeof setTimeout> | null} */
  let debounceTimer = null;
  /** @type {AbortController | null} */
  let activeRequest = null;

  function hideResults() {
    list.hidden = true;
    list.replaceChildren();
    input.setAttribute('aria-expanded', 'false');
  }

  function setStatus(message, visible = true) {
    status.textContent = message;
    status.hidden = !visible;
  }

  async function runSearch(term) {
    activeRequest?.abort();
    activeRequest = new AbortController();
    setStatus('Searching…');
    const result = await fetchAddressSuggestions(term, countryCode, (url, init) =>
      fetch(url, { ...init, signal: activeRequest?.signal })
    );
    if (!result.ok) {
      hideResults();
      setStatus(
        result.configured === false
          ? 'Address lookup is not configured on this hub yet — enter the address manually below.'
          : result.message || 'Could not search addresses right now.',
        true
      );
      return;
    }
    if (!result.suggestions.length) {
      hideResults();
      setStatus('No matches — try a postcode or the first line of your address.');
      return;
    }

    setStatus('', false);
    list.replaceChildren();
    for (const suggestion of result.suggestions) {
      const item = document.createElement('li');
      item.setAttribute('role', 'option');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'hub-setup-address-search-option';
      button.textContent = suggestion.label;
      button.addEventListener('click', () => {
        void selectSuggestion(suggestion.id, suggestion.label);
      });
      item.append(button);
      list.append(item);
    }
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  async function selectSuggestion(id, labelText) {
    hideResults();
    input.value = labelText;
    setStatus('Loading address…');
    input.disabled = true;
    const result = await fetchAddressById(id);
    input.disabled = false;
    if (!result.ok || !result.address) {
      setStatus('Could not load that address — enter it manually below.');
      return;
    }
    setStatus('Address filled — check the details below.', true);
    options.onSelect(result.address);
    input.value = '';
    setStatus('', false);
  }

  input.addEventListener('input', () => {
    const term = input.value.trim();
    hideResults();
    if (debounceTimer) clearTimeout(debounceTimer);
    if (term.length < 3) {
      setStatus('', false);
      return;
    }
    debounceTimer = setTimeout(() => {
      void runSearch(term);
    }, 280);
  });

  input.addEventListener('blur', () => {
    setTimeout(() => hideResults(), 180);
  });

  wrap.hidden = !supportsUkAddressAutocomplete(countryCode);

  return {
    wrap,
    input,
    setCountryCode(code) {
      wrap.hidden = !supportsUkAddressAutocomplete(code);
      hideResults();
      input.value = '';
      setStatus('', false);
    }
  };
}
