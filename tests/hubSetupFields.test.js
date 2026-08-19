import { afterEach, describe, expect, it } from 'vitest';
import {
  applyGuestAccessDisplayValues,
  buildHomeDetailsFormProfile,
  createGuestAccessFields
} from '../src/components/HubSetup/hubSetupFields.js';
import {
  resetPrivateConfigForTests,
  setPrivateConfigForTests
} from '../src/services/privateConfigService.js';

describe('buildHomeDetailsFormProfile', () => {
  afterEach(() => {
    resetPrivateConfigForTests();
  });

  it('keeps profile contact values when present', () => {
    const profile = buildHomeDetailsFormProfile({
      hubName: 'Rose Cottage Hub',
      primaryContact: { name: 'Alex', phone: '111', email: 'alex@example.com' }
    });

    expect(profile.hubName).toBe('Rose Cottage Hub');
    expect(profile.primaryContact).toEqual({
      name: 'Alex',
      phone: '111',
      email: 'alex@example.com'
    });
  });

  it('fills missing contact phone and email from private config', () => {
    setPrivateConfigForTests({
      contacts: {
        mark: { phone: '07700900000', email: 'mark@example.com' },
        donna: { phone: '07700900001', email: 'donna@example.com' }
      }
    });

    const profile = buildHomeDetailsFormProfile({
      primaryContact: { name: 'Alex', phone: '', email: '' },
      secondaryContact: { name: 'Sam', phone: '', email: '' }
    });

    expect(profile.primaryContact).toEqual({
      name: 'Alex',
      phone: '07700900000',
      email: 'mark@example.com'
    });
    expect(profile.secondaryContact).toEqual({
      name: 'Sam',
      phone: '07700900001',
      email: 'donna@example.com'
    });
  });
});

describe('applyGuestAccessDisplayValues', () => {
  afterEach(() => {
    resetPrivateConfigForTests();
  });

  it('prefills Wi-Fi network name and shows configured hints for saved secrets', () => {
    setPrivateConfigForTests({
      wifi: { ssid: 'GuestNet' }
    });

    const fields = createGuestAccessFields({});
    applyGuestAccessDisplayValues(fields, {
      wifi_password: true,
      lockbox_code: true,
      owner_pin: true
    });

    expect(fields.wifiSsid.input.value).toBe('GuestNet');
    expect(fields.wifiPassword.wrap.querySelector('.hub-setup-configured-hint')?.textContent).toMatch(
      /already saved/i
    );
    expect(fields.lockbox.wrap.querySelector('.hub-setup-configured-hint')).toBeTruthy();
    expect(fields.ownerPin.wrap.querySelector('.hub-setup-configured-hint')).toBeTruthy();
  });
});
