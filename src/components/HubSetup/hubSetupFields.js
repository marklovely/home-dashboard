/**
 * Shared field builders for hub setup and onboarding forms.
 */

import { CircleHelp, Eye, EyeOff, createElement } from 'lucide';

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
 */
export function createSetupField(label, value = '', options = {}) {
  const wrap = document.createElement('label');
  wrap.className = 'settings-subsection hub-setup-field';

  const title = document.createElement('span');
  title.className = 'settings-subsection-title';
  title.textContent = label;

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
    wrap.append(title, attachRevealToggle(input));
  } else {
    wrap.append(title, input);
  }
  return { wrap, input };
}

/**
 * @param {string} label
 * @param {string} [value]
 * @param {Object} [options]
 * @param {string} [options.placeholder]
 * @param {number} [options.rows]
 */
export function createSetupTextarea(label, value = '', options = {}) {
  const wrap = document.createElement('label');
  wrap.className = 'settings-subsection hub-setup-field';

  const title = document.createElement('span');
  title.className = 'settings-subsection-title';
  title.textContent = label;

  const textarea = document.createElement('textarea');
  textarea.className = 'hub-setup-input hub-setup-textarea';
  textarea.value = value;
  textarea.rows = options.rows ?? 3;
  if (options.placeholder) textarea.placeholder = options.placeholder;

  wrap.append(title, textarea);
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
    ]
  );

  const details = document.createElement('div');
  details.className = 'hub-setup-pet-details';

  const name = createSetupField('Pet name', String(petCare.name ?? ''), { placeholder: 'e.g. Bailey' });
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
 * @param {{ value: string, label: string }[]} options
 */
export function createSetupSelect(label, value, options) {
  const wrap = document.createElement('label');
  wrap.className = 'settings-subsection hub-setup-field';

  const title = document.createElement('span');
  title.className = 'settings-subsection-title';
  title.textContent = label;

  const select = document.createElement('select');
  select.className = 'hub-setup-input';
  for (const option of options) {
    const el = document.createElement('option');
    el.value = option.value;
    el.textContent = option.label;
    el.selected = option.value === value;
    select.append(el);
  }

  wrap.append(title, select);
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
 * @param {Record<string, unknown>} profile
 */
export function createContactGroup(titleText, contact) {
  const group = document.createElement('div');
  group.className = 'settings-subsection';

  const title = document.createElement('h3');
  title.className = 'settings-subsection-title';
  title.textContent = titleText;

  const name = createSetupField('Name', String(contact?.name ?? ''), { required: true });
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
export function createGuestAccessFields(_profile) {
  const wrap = document.createElement('div');
  wrap.className = 'settings-options settings-options--stacked';

  const wifiSsid = createSetupField('Wi-Fi network name', '', { autocomplete: 'off' });
  const wifiPassword = createSetupField('Wi-Fi password', '', {
    type: 'password',
    autocomplete: 'new-password',
    revealable: true
  });
  const homeAddress = createSetupField('Home address', '', { autocomplete: 'street-address' });
  const lockbox = createSetupField('Lockbox / door code (optional)', '', {
    type: 'password',
    autocomplete: 'off',
    revealable: true
  });
  const ownerPin = createSetupField('Owner PIN (4 digits)', '', {
    type: 'password',
    inputMode: 'numeric',
    pattern: '[0-9]{4}',
    placeholder: '••••',
    autocomplete: 'off',
    revealable: true
  });
  ownerPin.input.maxLength = 4;

  wrap.append(
    createSetupIntro('Guest-facing details. These stay on your hub and are only shown to sitters when you enable sharing in Settings.'),
    wifiSsid.wrap,
    wifiPassword.wrap,
    homeAddress.wrap,
    lockbox.wrap,
    ownerPin.wrap
  );

  return { wrap, wifiSsid, wifiPassword, homeAddress, lockbox, ownerPin };
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
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'hub-setup-info-button';
  button.setAttribute('aria-label', label);
  button.setAttribute('aria-expanded', 'false');
  button.append(
    createElement(CircleHelp, {
      width: 20,
      height: 20,
      'stroke-width': 1.75,
      'aria-hidden': 'true'
    })
  );

  const panel = document.createElement('p');
  panel.className = 'settings-help subtle hub-setup-info-panel';
  panel.hidden = true;
  panel.textContent = helpText;

  button.addEventListener('click', () => {
    const expanded = panel.hidden;
    panel.hidden = !expanded;
    button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  });

  return { button, panel };
}

/**
 * @param {{ wifiSsid: { input: HTMLInputElement }, wifiPassword: { input: HTMLInputElement }, homeAddress: { input: HTMLInputElement }, lockbox: { input: HTMLInputElement }, ownerPin: { input: HTMLInputElement } }} fields
 */
export function readGuestAccessSecrets(fields) {
  /** @type {Record<string, string>} */
  const patch = {};
  if (fields.wifiSsid.input.value.trim()) patch.wifi_ssid = fields.wifiSsid.input.value.trim();
  if (fields.wifiPassword.input.value.trim()) patch.wifi_password = fields.wifiPassword.input.value.trim();
  if (fields.homeAddress.input.value.trim()) patch.home_address = fields.homeAddress.input.value.trim();
  if (fields.lockbox.input.value.trim()) patch.lockbox_code = fields.lockbox.input.value.trim();
  if (fields.ownerPin.input.value.trim()) patch.owner_pin = fields.ownerPin.input.value.trim();
  return patch;
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
