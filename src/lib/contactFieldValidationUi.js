import {
  isValidEmail,
  isValidPhone,
  isValidPostcode,
  validateContact
} from './contactValidation.js';
import { normalizeHubCountryCode } from './hubCountries.js';
import { getPropertyAddressLabels } from './propertyAddressLabels.js';

/**
 * @param {HTMLElement} fieldWrap
 * @param {HTMLInputElement | HTMLTextAreaElement} input
 */
function ensureFieldError(fieldWrap, _input) {
  let error = fieldWrap.querySelector('.hub-setup-field-error');
  if (!error) {
    error = document.createElement('p');
    error.className = 'hub-setup-field-error subtle';
    error.hidden = true;
    fieldWrap.append(error);
  }
  return error;
}

/**
 * @param {HTMLInputElement | HTMLTextAreaElement} input
 * @param {HTMLElement} error
 * @param {string | null} message
 */
function setFieldValidationState(input, error, message) {
  if (message) {
    error.textContent = message;
    error.hidden = false;
    input.classList.add('hub-setup-input--invalid');
    input.setAttribute('aria-invalid', 'true');
    return;
  }
  error.hidden = true;
  input.classList.remove('hub-setup-input--invalid');
  input.removeAttribute('aria-invalid');
}

/**
 * @param {ReturnType<import('../components/HubSetup/hubSetupFields.js').createSetupField>} field
 * @param {(value: string) => string | null} validate
 */
export function attachLiveFieldValidation(field, validate) {
  const error = ensureFieldError(field.wrap, field.input);

  function runValidation() {
    setFieldValidationState(field.input, error, validate(field.input.value));
  }

  field.input.addEventListener('input', runValidation);
  field.input.addEventListener('blur', runValidation);
  return { runValidation };
}

/**
 * @param {ReturnType<import('../components/HubSetup/hubSetupFields.js').createContactGroup>} group
 * @param {() => string} getCountryCode
 */
export function attachContactGroupValidation(group, getCountryCode) {
  const inputs = /** @type {HTMLInputElement[]} */ (group.querySelectorAll('input'));
  const nameInput = inputs[0];
  const phoneInput = inputs[1];
  const emailInput = inputs[2];
  if (!nameInput || !phoneInput || !emailInput) return;

  const phoneWrap = phoneInput.closest('.hub-setup-field') ?? phoneInput.parentElement;
  const emailWrap = emailInput.closest('.hub-setup-field') ?? emailInput.parentElement;
  const phoneError = ensureFieldError(/** @type {HTMLElement} */ (phoneWrap), phoneInput);
  const emailError = ensureFieldError(/** @type {HTMLElement} */ (emailWrap), emailInput);

  function readContacts() {
    return {
      name: nameInput.value.trim(),
      phone: phoneInput.value.trim(),
      email: emailInput.value.trim()
    };
  }

  function validatePhone() {
    const phone = phoneInput.value.trim();
    if (!phone) {
      setFieldValidationState(phoneInput, phoneError, null);
      return;
    }
    const countryCode = normalizeHubCountryCode(getCountryCode());
    setFieldValidationState(
      phoneInput,
      phoneError,
      isValidPhone(phone, countryCode) ? null : 'Phone number looks invalid for this country.'
    );
  }

  function validateEmail() {
    const email = emailInput.value.trim();
    if (!email) {
      setFieldValidationState(emailInput, emailError, null);
      return;
    }
    setFieldValidationState(
      emailInput,
      emailError,
      isValidEmail(email) ? null : 'Email address looks invalid.'
    );
  }

  phoneInput.addEventListener('input', validatePhone);
  phoneInput.addEventListener('blur', validatePhone);
  emailInput.addEventListener('input', validateEmail);
  emailInput.addEventListener('blur', validateEmail);

  return {
    validateAll(required = false) {
      validatePhone();
      validateEmail();
      const variant =
        group.querySelector('.settings-subsection-title')?.textContent?.includes('Secondary')
          ? 'secondary'
          : 'primary';
      return validateContact(readContacts(), {
        label: variant === 'secondary' ? 'Secondary contact' : 'Primary contact',
        required,
        countryCode: getCountryCode()
      });
    }
  };
}

/**
 * @param {ReturnType<import('../components/HubSetup/hubSetupFields.js').createPropertyAddressFields>} fields
 * @param {() => string} getCountryCode
 */
export function attachPropertyAddressValidation(fields, getCountryCode) {
  /** @param {string} fieldKey */
  function fieldByKey(fieldKey) {
    const wrap = fields.group.querySelector(`[data-address-field="${fieldKey}"]`);
    const input = wrap?.querySelector('input');
    if (!(wrap instanceof HTMLElement) || !(input instanceof HTMLInputElement)) return null;
    return { wrap, input };
  }

  const line1 = fieldByKey('line1');
  const city = fieldByKey('city');
  const postcode = fieldByKey('postcode');
  if (!line1?.input || !city?.input || !postcode?.input) return;

  const line1Error = ensureFieldError(line1.wrap, line1.input);
  const cityError = ensureFieldError(city.wrap, city.input);
  const postcodeError = ensureFieldError(postcode.wrap, postcode.input);

  function validateAll() {
    const countryCode = normalizeHubCountryCode(getCountryCode());
    const { enterPostcodeMessage, invalidPostcodeMessage, cityLabel } =
      getPropertyAddressLabels(countryCode);
    const line1Value = line1.input.value.trim();
    const cityValue = city.input.value.trim();
    const postcodeValue = postcode.input.value.trim();
    const enterCityMessage = cityLabel.startsWith('City / town')
      ? 'Enter city or town.'
      : `Enter ${cityLabel.toLowerCase()}.`;

    setFieldValidationState(
      line1.input,
      line1Error,
      line1Value ? null : 'Enter address line 1.'
    );
    setFieldValidationState(city.input, cityError, cityValue ? null : enterCityMessage);
    if (!postcodeValue) {
      setFieldValidationState(postcode.input, postcodeError, enterPostcodeMessage);
    } else if (!isValidPostcode(postcodeValue, countryCode)) {
      setFieldValidationState(postcode.input, postcodeError, invalidPostcodeMessage);
    } else {
      setFieldValidationState(postcode.input, postcodeError, null);
    }

    if (!line1Value) return 'Enter address line 1.';
    if (!cityValue) return enterCityMessage;
    if (!postcodeValue) return enterPostcodeMessage;
    if (!isValidPostcode(postcodeValue, countryCode)) return invalidPostcodeMessage;
    return null;
  }

  for (const entry of [line1, city, postcode]) {
    entry.input.addEventListener('input', validateAll);
    entry.input.addEventListener('blur', validateAll);
  }

  return { validateAll };
}
