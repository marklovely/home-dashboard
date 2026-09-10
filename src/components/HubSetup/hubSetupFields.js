/**
 * Shared field builders for hub setup and onboarding forms.
 */

import { Eye, EyeOff, createElement } from 'lucide';
import { createFieldInfoHint, createFieldLabelBlock } from '../HelpGuide/fieldHelp.js';
import { HUB_SETUP_FIELD_HELP } from './hubSetupHelpContent.js';
import { createAddressAutocompleteField } from './addressAutocompleteField.js';
import { hubCountryLabel, normalizeHubCountryCode, supportsUkAddressAutocomplete } from '../../lib/hubCountries.js';
import { getPropertyAddressLabels } from '../../lib/propertyAddressLabels.js';
import { resolvePropertyUprn } from '../../api/addressApi.js';
import {
  formatPropertyAddress,
  hasPropertyAddress,
  normalizePropertyAddress,
  parsePropertyAddressFromString
} from '../../lib/propertyAddress.js';
import { getPrivateConfigValue } from '../../services/privateConfigService.js';

/**
 * @param {HTMLInputElement} input
 */
function attachRevealToggle(input) {
  const inputWrap = document.createElement('div');
  inputWrap.className = 'hub-setup-input-wrap';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'hub-setup-reveal-button';
  toggle.setAttribute('aria-label', 'Show value');
  toggle.setAttribute('aria-pressed', 'false');

  const showIcon = createElement(Eye, {
    width: 20,
    height: 20,
    'stroke-width': 1.75,
    class: 'hub-setup-reveal-icon hub-setup-reveal-icon--show',
    'aria-hidden': 'true'
  });
  const hideIcon = createElement(EyeOff, {
    width: 20,
    height: 20,
    'stroke-width': 1.75,
    class: 'hub-setup-reveal-icon hub-setup-reveal-icon--hide',
    'aria-hidden': 'true'
  });
  toggle.append(showIcon, hideIcon);

  toggle.addEventListener('click', () => {
    const revealing = input.type === 'password';
    input.type = revealing ? 'text' : 'password';
    toggle.setAttribute('aria-label', revealing ? 'Hide value' : 'Show value');
    toggle.setAttribute('aria-pressed', revealing ? 'true' : 'false');
  });

  inputWrap.append(input, toggle);
  return inputWrap;
}

/**
 * @param {string} label
 * @param {string} [value]
 * @param {Object} [options]
 * @param {string} [options.type]
 * @param {string} [options.placeholder]
 * @param {boolean} [options.required]
 * @param {string} [options.autocomplete]
 * @param {string} [options.inputMode]
 * @param {string} [options.pattern]
 * @param {boolean} [options.revealable]
 * @param {string} [options.hint]
 * @param {string} [options.helpText]
 * @param {string} [options.helpLabel]
 */
export function createSetupField(label, value = '', options = {}) {
  const wrap = document.createElement('label');
  wrap.className = 'settings-subsection hub-setup-field';

  const { fragment: labelBlock } = createFieldLabelBlock(label, options);
  wrap.append(labelBlock);

  const input = document.createElement('input');
  input.className = 'hub-setup-input';
  input.type = options.type ?? 'text';
  input.value = value;
  if (options.placeholder) input.placeholder = options.placeholder;
  if (options.required) input.required = true;
  if (options.autocomplete) input.autocomplete = options.autocomplete;
  if (options.inputMode) input.inputMode = options.inputMode;
  if (options.pattern) input.pattern = options.pattern;

  if (options.fieldKey) {
    wrap.dataset.addressField = options.fieldKey;
  }

  if (options.revealable) {
    wrap.append(attachRevealToggle(input));
  } else {
    wrap.append(input);
  }
  return { wrap, input };
}

/**
 * @param {string} label
 * @param {string} [value]
 * @param {Object} [options]
 * @param {string} [options.placeholder]
 * @param {number} [options.rows]
 * @param {string} [options.hint]
 * @param {string} [options.helpText]
 * @param {string} [options.helpLabel]
 */
export function createSetupTextarea(label, value = '', options = {}) {
  const wrap = document.createElement('label');
  wrap.className = 'settings-subsection hub-setup-field';

  const { fragment: labelBlock } = createFieldLabelBlock(label, options);
  wrap.append(labelBlock);

  const textarea = document.createElement('textarea');
  textarea.className = 'hub-setup-input hub-setup-textarea';
  textarea.value = value;
  textarea.rows = options.rows ?? 3;
  if (options.placeholder) textarea.placeholder = options.placeholder;

  wrap.append(textarea);
  return { wrap, textarea };
}

/**
 * @param {string} label
 * @param {string} value
 * @param {{ value: string, label: string }[]} selectOptions
 * @param {{ hint?: string, helpText?: string, helpLabel?: string }} [fieldOptions]
 */
export function createSetupSelect(label, value, selectOptions, fieldOptions = {}) {
  const wrap = document.createElement('label');
  wrap.className = 'settings-subsection hub-setup-field';

  const { fragment: labelBlock } = createFieldLabelBlock(label, fieldOptions);
  wrap.append(labelBlock);

  const select = document.createElement('select');
  select.className = 'hub-setup-input';
  for (const option of selectOptions) {
    const el = document.createElement('option');
    el.value = option.value;
    el.textContent = option.label;
    el.selected = option.value === value;
    select.append(el);
  }

  wrap.append(select);
  return { wrap, select };
}

/**
 * @param {Record<string, unknown>} profile
 */
export function readContactFields(primaryWrap, secondaryWrap, _profile) {
  const primary = /** @type {HTMLInputElement[]} */ (
    primaryWrap.querySelectorAll('input')
  );
  const secondary = /** @type {HTMLInputElement[]} */ (
    secondaryWrap.querySelectorAll('input')
  );
  return {
    primaryContact: {
      name: primary[0]?.value.trim() ?? '',
      phone: primary[1]?.value.trim() ?? '',
      email: primary[2]?.value.trim() ?? ''
    },
    secondaryContact: {
      name: secondary[0]?.value.trim() ?? '',
      phone: secondary[1]?.value.trim() ?? '',
      email: secondary[2]?.value.trim() ?? ''
    }
  };
}

/**
 * @param {string} titleText
 * @param {Record<string, unknown>} contact
 * @param {{ variant?: 'primary' | 'secondary' }} [options]
 */
export function createContactGroup(titleText, contact, options = {}) {
  const group = document.createElement('div');
  group.className = 'settings-subsection';

  const title = document.createElement('h3');
  title.className = 'settings-subsection-title';
  title.textContent = titleText;

  const nameHelp =
    options.variant === 'secondary'
      ? HUB_SETUP_FIELD_HELP.secondaryContactName
      : HUB_SETUP_FIELD_HELP.primaryContactName;

  const name = createSetupField('Name', String(contact?.name ?? ''), {
    required: true,
    ...nameHelp
  });
  const phone = createSetupField('Phone', String(contact?.phone ?? ''), {
    type: 'tel',
    autocomplete: 'tel'
  });
  const email = createSetupField('Email', String(contact?.email ?? ''), {
    type: 'email',
    autocomplete: 'email'
  });

  group.append(title, name.wrap, phone.wrap, email.wrap);
  return group;
}

/**
 * @param {Record<string, unknown>} profile
 * @param {{ hubCountryCode?: string }} [options]
 */
export function createPropertyAddressFields(profile, options = {}) {
  const address = normalizePropertyAddress(profile?.propertyAddress);
  let hubCountryCode = normalizeHubCountryCode(
    options.hubCountryCode ?? profile?.hubCountryCode ?? address.country
  );

  /** @param {ReturnType<typeof createSetupField>} field @param {string} text */
  function setFieldLabel(field, text) {
    const title = field.wrap.querySelector('.settings-subsection-title');
    if (title) title.textContent = text;
  }

  function applyAddressLabels(code) {
    const labels = getPropertyAddressLabels(code);
    setFieldLabel(city, labels.cityLabel);
    setFieldLabel(county, labels.countyLabel);
    setFieldLabel(postcode, labels.postcodeLabel);
  }
  const group = document.createElement('fieldset');
  group.className = 'hub-setup-property-address';

  const legend = document.createElement('legend');
  legend.className = 'settings-subsection-title';
  legend.textContent = 'Address of the property';

  const addressHelp = createFieldInfoHint(
    HUB_SETUP_FIELD_HELP.propertyAddress.helpText ?? '',
    'Help: property address'
  );

  group.append(legend);

  const addressHelpRow = document.createElement('div');
  addressHelpRow.className = 'hub-setup-fieldset-help-row';
  addressHelpRow.append(addressHelp.button);
  group.append(addressHelpRow, addressHelp.panel);

  const line1 = createSetupField('Address line 1', address.line1, {
    autocomplete: 'address-line1',
    placeholder: 'House name or number and street',
    fieldKey: 'line1'
  });
  const line2 = createSetupField('Address line 2 (optional)', address.line2, {
    autocomplete: 'address-line2',
    placeholder: 'Flat, building, or extra detail'
  });
  const line3 = createSetupField('Address line 3 (optional)', address.line3, {
    autocomplete: 'address-line3'
  });
  const city = createSetupField(getPropertyAddressLabels(hubCountryCode).cityLabel, address.city, {
    autocomplete: 'address-level2',
    fieldKey: 'city'
  });
  const county = createSetupField(getPropertyAddressLabels(hubCountryCode).countyLabel, address.county, {
    autocomplete: 'address-level1',
    fieldKey: 'county'
  });

  const countryNote = document.createElement('p');
  countryNote.className = 'subtle hub-setup-country-note';
  countryNote.textContent = `Country: ${hubCountryLabel(hubCountryCode) || 'Other country'}`;

  const countryField =
    hubCountryCode === 'OTHER'
      ? createSetupField('Country', address.country, {
          autocomplete: 'country-name',
          placeholder: 'Country name'
        })
      : null;

  const postcode = createSetupField(getPropertyAddressLabels(hubCountryCode).postcodeLabel, address.postcode, {
    autocomplete: 'postal-code',
    fieldKey: 'postcode'
  });

  let storedUprn = address.uprn ?? '';

  const addressSearch = createAddressAutocompleteField({
    countryCode: hubCountryCode,
    onSelect(selected) {
      line1.input.value = selected.line1 ?? '';
      line2.input.value = selected.line2 ?? '';
      line3.input.value = selected.line3 ?? '';
      city.input.value = selected.city ?? '';
      county.input.value = selected.county ?? '';
      postcode.input.value = selected.postcode ?? '';
      storedUprn = selected.uprn ?? '';
      if (countryField) {
        countryField.input.value = selected.country ?? '';
      }
      if (!storedUprn && supportsUkAddressAutocomplete(hubCountryCode)) {
        void resolvePropertyUprn(selected).then((result) => {
          if (result.ok && supportsUkAddressAutocomplete(hubCountryCode)) storedUprn = result.uprn;
        });
      }
    }
  });

  group.append(
    addressSearch.wrap,
    line1.wrap,
    line2.wrap,
    line3.wrap,
    city.wrap,
    county.wrap,
    countryNote
  );
  if (countryField) {
    group.append(countryField.wrap);
  }
  group.append(postcode.wrap);

  function clearStoredUprn() {
    storedUprn = '';
  }
  for (const field of [line1, line2, line3, city, county, postcode]) {
    field.input.addEventListener('input', clearStoredUprn);
  }

  function readPropertyAddress() {
    return normalizePropertyAddress({
      line1: line1.input.value,
      line2: line2.input.value,
      line3: line3.input.value,
      city: city.input.value,
      county: county.input.value,
      country:
        hubCountryCode === 'OTHER'
          ? countryField?.input.value ?? ''
          : hubCountryLabel(hubCountryCode),
      postcode: postcode.input.value,
      uprn: storedUprn
    });
  }

  return {
    group,
    readPropertyAddress,
    setHubCountryCode(code) {
      hubCountryCode = normalizeHubCountryCode(code);
      addressSearch.setCountryCode(hubCountryCode);
      countryNote.textContent = `Country: ${hubCountryLabel(hubCountryCode) || 'Other country'}`;
      applyAddressLabels(hubCountryCode);
    }
  };
}

/**
 * @param {Record<string, unknown>} profile
 * @param {{ hubCountryCode?: string }} [options]
 */
export function createGuestAccessFields(profile, options = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'settings-options settings-options--stacked';

  const wifiSsid = createSetupField('Wi-Fi network name', '', {
    autocomplete: 'off',
    ...HUB_SETUP_FIELD_HELP.wifiSsid
  });
  const wifiPassword = createSetupField('Wi-Fi password', '', {
    type: 'password',
    autocomplete: 'new-password',
    revealable: true,
    ...HUB_SETUP_FIELD_HELP.wifiPassword
  });
  const propertyAddress = createPropertyAddressFields(profile, {
    hubCountryCode: options.hubCountryCode ?? profile?.hubCountryCode
  });
  const lockbox = createSetupField('Lockbox / door code (optional)', '', {
    type: 'password',
    autocomplete: 'off',
    revealable: true,
    ...HUB_SETUP_FIELD_HELP.lockbox
  });
  const ownerPin = createSetupField('Owner PIN (4 digits)', '', {
    type: 'password',
    inputMode: 'numeric',
    pattern: '[0-9]{4}',
    placeholder: '••••',
    autocomplete: 'off',
    revealable: true,
    ...HUB_SETUP_FIELD_HELP.ownerPin
  });
  ownerPin.input.maxLength = 4;

  wrap.append(
    createSetupIntro(
      'Guest-facing details for this property. They stay on your hub and are only shown when you enable sharing in Settings. Changing the address updates weather for this tablet and clears saved bin collection dates for the previous property.'
    ),
    wifiSsid.wrap,
    wifiPassword.wrap,
    propertyAddress.group,
    lockbox.wrap,
    ownerPin.wrap
  );

  return {
    wrap,
    wifiSsid,
    wifiPassword,
    propertyAddress,
    lockbox,
    ownerPin,
    setHubCountryCode(code) {
      propertyAddress.setHubCountryCode(code);
    }
  };
}

/**
 * @param {string} text
 */
export function createSetupIntro(text) {
  const intro = document.createElement('p');
  intro.className = 'settings-help subtle';
  intro.textContent = text;
  return intro;
}

/**
 * @param {string} helpText
 * @param {string} [label]
 */
export function createSetupInfoHint(helpText, label = 'More information') {
  return createFieldInfoHint(helpText, label);
}

/**
 * @param {{
 *   wifiSsid: { input: HTMLInputElement },
 *   wifiPassword: { input: HTMLInputElement },
 *   propertyAddress: { readPropertyAddress: () => import('../../lib/propertyAddress.js').PropertyAddress },
 *   lockbox: { input: HTMLInputElement },
 *   ownerPin: { input: HTMLInputElement }
 * }} fields
 */
export function readGuestAccessSecrets(fields) {
  /** @type {Record<string, string>} */
  const patch = {};
  if (fields.wifiSsid.input.value.trim()) patch.wifi_ssid = fields.wifiSsid.input.value.trim();
  if (fields.wifiPassword.input.value.trim()) patch.wifi_password = fields.wifiPassword.input.value.trim();
  const formattedAddress = formatPropertyAddress(fields.propertyAddress.readPropertyAddress());
  if (formattedAddress) patch.home_address = formattedAddress;
  if (fields.lockbox.input.value.trim()) patch.lockbox_code = fields.lockbox.input.value.trim();
  if (fields.ownerPin.input.value.trim()) patch.owner_pin = fields.ownerPin.input.value.trim();
  return patch;
}

/**
 * @param {{
 *   propertyAddress: { readPropertyAddress: () => import('../../lib/propertyAddress.js').PropertyAddress }
 * }} fields
 */
export function readPropertyAddressProfilePatch(fields) {
  return { propertyAddress: fields.propertyAddress.readPropertyAddress() };
}

/**
 * @param {{ primaryContact: { phone?: string, email?: string }, secondaryContact: { phone?: string, email?: string } }} contacts
 */
export function contactSecretsPatch(contacts) {
  /** @type {Record<string, string>} */
  const patch = {};
  if (contacts.primaryContact.phone) patch.primary_phone = contacts.primaryContact.phone;
  if (contacts.primaryContact.email) patch.primary_email = contacts.primaryContact.email;
  if (contacts.secondaryContact.phone) patch.secondary_phone = contacts.secondaryContact.phone;
  if (contacts.secondaryContact.email) patch.secondary_email = contacts.secondaryContact.email;
  return patch;
}

/**
 * Merge profile contacts with owner-only private config when profile fields are empty.
 * @param {Record<string, unknown>} [profile]
 */
export function buildHomeDetailsFormProfile(profile = {}) {
  /** @type {{ name: string, phone: string, email: string }} */
  const primaryContact = {
    name: String(/** @type {{ name?: string }} */ (profile.primaryContact)?.name ?? ''),
    phone: String(/** @type {{ phone?: string }} */ (profile.primaryContact)?.phone ?? ''),
    email: String(/** @type {{ email?: string }} */ (profile.primaryContact)?.email ?? '')
  };
  /** @type {{ name: string, phone: string, email: string }} */
  const secondaryContact = {
    name: String(/** @type {{ name?: string }} */ (profile.secondaryContact)?.name ?? ''),
    phone: String(/** @type {{ phone?: string }} */ (profile.secondaryContact)?.phone ?? ''),
    email: String(/** @type {{ email?: string }} */ (profile.secondaryContact)?.email ?? '')
  };

  if (!primaryContact.phone.trim()) {
    primaryContact.phone = String(getPrivateConfigValue('contacts.mark.phone') ?? '');
  }
  if (!primaryContact.email.trim()) {
    primaryContact.email = String(getPrivateConfigValue('contacts.mark.email') ?? '');
  }
  if (!secondaryContact.phone.trim()) {
    secondaryContact.phone = String(getPrivateConfigValue('contacts.donna.phone') ?? '');
  }
  if (!secondaryContact.email.trim()) {
    secondaryContact.email = String(getPrivateConfigValue('contacts.donna.email') ?? '');
  }

  let propertyAddress = normalizePropertyAddress(profile.propertyAddress);
  if (!hasPropertyAddress(propertyAddress)) {
    const legacyAddress = getPrivateConfigValue('address.full');
    if (legacyAddress) {
      propertyAddress = parsePropertyAddressFromString(String(legacyAddress));
    }
  }

  return { ...profile, primaryContact, secondaryContact, propertyAddress };
}

export const HUB_SETUP_STORED_SECRET_HINT =
  'A value is saved on your hub. Enter a new one to replace it, or leave blank to keep the current value.';

export const HUB_SETUP_DEPLOYMENT_SECRET_HINT =
  'This hub still has deployment defaults (not shown here). Enter your own values to save them on the hub, or leave blank to keep the defaults.';

export const HUB_SETUP_STORED_WIFI_SSID_HINT =
  'Wi‑Fi network name is saved on your hub but could not be loaded here. Enter it again to update the saved value.';

export const HUB_SETUP_DEPLOYMENT_WIFI_SSID_HINT =
  'Wi‑Fi network name is set as a deployment default (not shown here). Enter it to save on your hub, or leave blank to keep the default.';

/**
 * @param {HTMLElement} fieldWrap
 * @param {boolean | undefined} isConfigured
 * @param {string} [message]
 */
function appendConfiguredSecretHint(fieldWrap, isConfigured, message) {
  if (!isConfigured || fieldWrap.querySelector('.hub-setup-configured-hint')) return;
  const hint = document.createElement('p');
  hint.className = 'subtle hub-setup-configured-hint';
  hint.textContent = message ?? HUB_SETUP_STORED_SECRET_HINT;
  fieldWrap.append(hint);
}

/**
 * @param {boolean | undefined} stored
 * @param {boolean | undefined} configured
 * @param {string} storedHint
 * @param {string} deploymentHint
 */
function secretHintFor(stored, configured, storedHint, deploymentHint) {
  if (stored) return storedHint;
  if (configured) return deploymentHint;
  return null;
}

/**
 * @param {ReturnType<typeof createGuestAccessFields>} fields
 * @param {Partial<Record<string, boolean>>} [configured]
 * @param {Partial<Record<string, boolean>>} [stored]
 */
export function applyGuestAccessDisplayValues(fields, configured = {}, stored = configured) {
  const wifiSsid = getPrivateConfigValue('wifi.ssid');
  if (wifiSsid && !fields.wifiSsid.input.value.trim()) {
    fields.wifiSsid.input.value = String(wifiSsid);
  }

  const wifiPasswordHint = secretHintFor(
    stored.wifi_password,
    configured.wifi_password,
    HUB_SETUP_STORED_SECRET_HINT,
    HUB_SETUP_DEPLOYMENT_SECRET_HINT
  );
  if (wifiPasswordHint) {
    appendConfiguredSecretHint(fields.wifiPassword.wrap, true, wifiPasswordHint);
  }

  if (!fields.wifiSsid.input.value.trim()) {
    const wifiSsidHint = secretHintFor(
      stored.wifi_ssid,
      configured.wifi_ssid,
      HUB_SETUP_STORED_WIFI_SSID_HINT,
      HUB_SETUP_DEPLOYMENT_WIFI_SSID_HINT
    );
    if (wifiSsidHint) {
      appendConfiguredSecretHint(fields.wifiSsid.wrap, true, wifiSsidHint);
    }
  }

  const lockboxHint = secretHintFor(
    stored.lockbox_code,
    configured.lockbox_code,
    HUB_SETUP_STORED_SECRET_HINT,
    HUB_SETUP_DEPLOYMENT_SECRET_HINT
  );
  if (lockboxHint) {
    appendConfiguredSecretHint(fields.lockbox.wrap, true, lockboxHint);
  }

  const ownerPinHint = secretHintFor(
    stored.owner_pin,
    configured.owner_pin,
    HUB_SETUP_STORED_SECRET_HINT,
    HUB_SETUP_DEPLOYMENT_SECRET_HINT
  );
  if (ownerPinHint) {
    appendConfiguredSecretHint(fields.ownerPin.wrap, true, ownerPinHint);
  }
}

export { createPetCareFields, createPetCareFields as createPetDetailsFields } from './createPetCareFields.js';
