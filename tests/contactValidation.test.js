import { describe, expect, it } from 'vitest';
import {
  isValidEmail,
  isValidPhone,
  isValidPostcode,
  validateHubContacts
} from '../src/lib/contactValidation.js';

describe('contactValidation', () => {
  it('accepts valid UK contact details', () => {
    expect(
      validateHubContacts({
        primaryContact: {
          name: 'Alex',
          phone: '07700 900123',
          email: 'alex@example.com'
        }
      })
    ).toBeNull();
  });

  it('requires primary phone or email', () => {
    expect(
      validateHubContacts({
        primaryContact: { name: 'Alex' }
      })
    ).toMatch(/phone number or email/i);
  });

  it('rejects invalid email addresses', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(
      validateHubContacts({
        primaryContact: {
          name: 'Alex',
          email: 'not-an-email'
        }
      })
    ).toMatch(/invalid/i);
  });

  it('validates UK phone numbers', () => {
    expect(isValidPhone('07700900123', 'GB')).toBe(true);
    expect(isValidPhone('123', 'GB')).toBe(false);
  });

  it('validates UK postcodes', () => {
    expect(isValidPostcode('SW1A 1AA', 'GB')).toBe(true);
    expect(isValidPostcode('NOT A POSTCODE', 'GB')).toBe(false);
  });
});
