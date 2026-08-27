import { hubCountryLabel, normalizeHubCountryCode } from './hubCountries.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UK_POSTCODE_RE = /^([A-Z]{1,2}\d[A-Z\d]?|\d[A-Z]{2})\s*\d[A-Z]{2}$/i;
const UK_PHONE_RE = /^(\+44|0)\d{9,10}$/;
const GENERIC_PHONE_RE = /^[+()\d\s.-]{7,20}$/;

/**
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  const value = String(email ?? '').trim();
  if (!value) return true;
  return EMAIL_RE.test(value);
}

/**
 * @param {string} phone
 * @param {string} [countryCode]
 * @returns {boolean}
 */
export function isValidPhone(phone, countryCode = 'GB') {
  const value = String(phone ?? '').trim();
  if (!value) return true;
  const normalized = value.replace(/[\s()-]/g, '');
  const code = normalizeHubCountryCode(countryCode);
  if (code === 'GB' || code === 'IE') {
    return UK_PHONE_RE.test(normalized);
  }
  return GENERIC_PHONE_RE.test(value) && /\d/.test(value);
}

/**
 * @param {string} postcode
 * @param {string} [countryCode]
 * @returns {boolean}
 */
export function isValidPostcode(postcode, countryCode = 'GB') {
  const value = String(postcode ?? '').trim();
  if (!value) return true;
  if (normalizeHubCountryCode(countryCode) === 'GB') {
    return UK_POSTCODE_RE.test(value);
  }
  return value.length >= 2;
}

/**
 * @typedef {{ name?: string, phone?: string, email?: string }} ContactInput
 */

/**
 * @param {ContactInput} contact
 * @param {{ label?: string, required?: boolean, countryCode?: string }} [options]
 * @returns {string | null}
 */
export function validateContact(contact, options = {}) {
  const label = options.label ?? 'Contact';
  const name = String(contact?.name ?? '').trim();
  const phone = String(contact?.phone ?? '').trim();
  const email = String(contact?.email ?? '').trim();
  const countryCode = normalizeHubCountryCode(options.countryCode);

  if (options.required && !name) {
    return `${label} name is required.`;
  }
  if (!name && (phone || email)) {
    return `Enter a name for ${label.toLowerCase()}.`;
  }
  if (name && !phone && !email) {
    return `${label} needs a phone number or email so guests can reach them.`;
  }
  if (phone && !isValidPhone(phone, countryCode)) {
    return `${label} phone number looks invalid for ${hubCountryLabel(countryCode) || 'this country'}.`;
  }
  if (email && !isValidEmail(email)) {
    return `${label} email address looks invalid.`;
  }
  return null;
}

/**
 * @param {{ primaryContact?: ContactInput, secondaryContact?: ContactInput }} contacts
 * @param {string} [countryCode]
 * @returns {string | null}
 */
export function validateHubContacts(contacts, countryCode = 'GB') {
  const primaryError = validateContact(contacts?.primaryContact ?? {}, {
    label: 'Primary contact',
    required: true,
    countryCode
  });
  if (primaryError) return primaryError;

  const secondaryError = validateContact(contacts?.secondaryContact ?? {}, {
    label: 'Secondary contact',
    countryCode
  });
  if (secondaryError) return secondaryError;

  return null;
}

/**
 * @param {string | string[]} emails
 * @returns {string | null}
 */
export function validateEmailAddresses(emails) {
  const list = Array.isArray(emails)
    ? emails
    : String(emails ?? '')
        .split(/[,;\n]+/)
        .map((part) => part.trim().toLowerCase())
        .filter(Boolean);
  for (const email of list) {
    if (!isValidEmail(email)) {
      return `Invalid email address: ${email}`;
    }
  }
  return null;
}

/**
 * @param {import('./propertyAddress.js').PropertyAddress | Record<string, unknown>} address
 * @param {string} [countryCode]
 * @returns {string | null}
 */
export function validatePropertyAddress(address, countryCode = 'GB') {
  const line1 = String(address?.line1 ?? '').trim();
  const city = String(address?.city ?? '').trim();
  const postcode = String(address?.postcode ?? '').trim();
  if (!line1) return 'Enter address line 1.';
  if (!city) return 'Enter city or town.';
  if (!postcode) return 'Enter postcode.';
  if (!isValidPostcode(postcode, countryCode)) {
    return 'Postcode looks invalid for the selected country.';
  }
  return null;
}
