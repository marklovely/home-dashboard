/**
 * Shared field builders for hub setup and onboarding forms.
 */

import { Eye, EyeOff, createElement } from 'lucide';
import { createFieldInfoHint, createFieldLabelBlock } from '../HelpGuide/fieldHelp.js';
import { HUB_SETUP_FIELD_HELP } from './hubSetupHelpContent.js';
import {
  formatPropertyAddress,
  normalizePropertyAddress
} from '../../lib/propertyAddress.js';

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
 * @param {Record<string, unknown>} profile
 */
export function createPetDetailsFields(profile) {
  const petCare = /** @type {Record<string, string | boolean>} */ (profile?.petCare ?? {});
  const wrap = document.createElement('div');
  wrap.className = 'settings-options settings-options--stacked';

  const hasPets = createSetupSelect(
    'Will sitters need to care for pets?',
    petCare.hasPets === true ? 'yes' : 'no',
    [
      { value: 'no', label: 'No pets to look after' },
      { value: 'yes', label: 'Yes — add pet details' }
    ],
    HUB_SETUP_FIELD_HELP.hasPets
  );

  const details = document.createElement('div');
  details.className = 'hub-setup-pet-details';

  const name = createSetupField('Pet name', String(petCare.name ?? ''), {
    placeholder: 'e.g. Bailey',
    ...HUB_SETUP_FIELD_HELP.petName
  });
  const species = createSetupField('Species / breed', String(petCare.species ?? ''), {
    placeholder: 'e.g. Labrador'
  });
  const age = createSetupField('Age', String(petCare.age ?? ''), { placeholder: 'e.g. 5 years' });
  const temperament = createSetupTextarea('Personality & rules', String(petCare.temperament ?? ''), {
    placeholder: 'Friendly with people, allowed on sofa, nervous around bikes…',
    rows: 3
  });
  const feeding = createSetupTextarea('Feeding routine', String(petCare.feeding ?? ''), {
    placeholder: 'One line per meal or step, e.g.\nMorning: 1 scoop dry food\nEvening: 1/4 tin wet food',
    rows: 4
  });
  const walks = createSetupTextarea('Walks & exercise', String(petCare.walks ?? ''), {
    placeholder: 'How often, where the lead is, favourite routes…',
    rows: 3
  });
  const vet = createSetupField('Regular vet', String(petCare.vet ?? ''), { placeholder: 'Clinic name' });
  const vetPhone = createSetupField('Vet phone', String(petCare.vetPhone ?? ''), { type: 'tel' });
  const vetEmergency = createSetupField('Emergency vet (optional)', String(petCare.vetEmergency ?? ''), {
    type: 'tel'
  });

  details.append(
    name.wrap,
    species.wrap,
    age.wrap,
    temperament.wrap,
    feeding.wrap,
    walks.wrap,
    vet.wrap,
    vetPhone.wrap,
    vetEmergency.wrap
  );

  function syncDetailsVisibility() {
    const show = hasPets.select.value === 'yes';
    details.hidden = !show;
  }

  hasPets.select.addEventListener('change', syncDetailsVisibility);
  syncDetailsVisibility();

  wrap.append(
    createSetupIntro(
      'These details are written into the Pets section when you import the starter House Guide. Nothing from another home is copied.'
    ),
    hasPets.wrap,
    details
  );

  return {
    wrap,
    hasPets,
    name,
    species,
    age,
    temperament,
    feeding,
    walks,
    vet,
    vetPhone,
    vetEmergency,
    readPetCare() {
      const hasPetCare = hasPets.select.value === 'yes';
      return {
        hasPets: hasPetCare,
        name: name.input.value.trim(),
        species: species.input.value.trim(),
        age: age.input.value.trim(),
        temperament: temperament.textarea.value.trim(),
        feeding: feeding.textarea.value.trim(),
        walks: walks.textarea.value.trim(),
        vet: vet.input.value.trim(),
        vetPhone: vetPhone.input.value.trim(),
        vetEmergency: vetEmergency.input.value.trim()
      };
    }
  };
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
 */
export function createPropertyAddressFields(profile) {
  const address = normalizePropertyAddress(profile?.propertyAddress);
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
    placeholder: 'House name or number and street'
  });
  const line2 = createSetupField('Address line 2 (optional)', address.line2, {
    autocomplete: 'address-line2',
    placeholder: 'Flat, building, or extra detail'
  });
  const line3 = createSetupField('Address line 3 (optional)', address.line3, {
    autocomplete: 'address-line3'
  });
  const city = createSetupField('City / town', address.city, {
    autocomplete: 'address-level2'
  });
  const county = createSetupField('County (optional)', address.county, {
    autocomplete: 'address-level1'
  });
  const country = createSetupField('Country', address.country, {
    autocomplete: 'country-name',
    placeholder: 'United Kingdom'
  });
  const postcode = createSetupField('Postcode', address.postcode, {
    autocomplete: 'postal-code'
  });

  group.append(
    addressHelpRow,
    addressHelp.panel,
    line1.wrap,
    line2.wrap,
    line3.wrap,
    city.wrap,
    county.wrap,
    country.wrap,
    postcode.wrap
  );

  function readPropertyAddress() {
    return normalizePropertyAddress({
      line1: line1.input.value,
      line2: line2.input.value,
      line3: line3.input.value,
      city: city.input.value,
      county: county.input.value,
      country: country.input.value,
      postcode: postcode.input.value
    });
  }

  return { group, readPropertyAddress };
}

/**
 * @param {Record<string, unknown>} profile
 */
export function createGuestAccessFields(profile) {
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
  const propertyAddress = createPropertyAddressFields(profile);
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
      'Guest-facing details for this property. They stay on your hub and are only shown when you enable sharing in Settings. Your postcode sets the weather location for this tablet.'
    ),
    wifiSsid.wrap,
    wifiPassword.wrap,
    propertyAddress.group,
    lockbox.wrap,
    ownerPin.wrap
  );

  return { wrap, wifiSsid, wifiPassword, propertyAddress, lockbox, ownerPin };
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
