import { describe, expect, it, beforeEach } from 'vitest';
import {
  clearLocalSetup,
  loadLocalProfile,
  loadLocalSecrets,
  mergeLocalProfile,
  mergeLocalSecrets
} from '../src/services/siteSetupLocalStorage.js';

describe('siteSetupLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    clearLocalSetup();
  });

  it('merges profile patches in localStorage', () => {
    mergeLocalProfile({ hubName: 'Rose Cottage Hub', useCase: 'airbnb' });
    const profile = loadLocalProfile();
    expect(profile.hubName).toBe('Rose Cottage Hub');
    expect(profile.useCase).toBe('airbnb');
    expect(profile._hasLocalRow).toBe(true);
  });

  it('merges nested contacts and secrets', () => {
    mergeLocalProfile({
      primaryContact: { name: 'Alex', phone: '111', email: 'alex@example.com' }
    });
    mergeLocalSecrets({ wifi_ssid: 'GuestNet', owner_pin: '1234' });
    expect(loadLocalProfile().primaryContact.name).toBe('Alex');
    expect(loadLocalSecrets().wifi_ssid).toBe('GuestNet');
  });

  it('clears local setup storage', () => {
    mergeLocalProfile({ hubName: 'Test' });
    mergeLocalSecrets({ wifi_ssid: 'Net' });
    clearLocalSetup();
    expect(loadLocalProfile()._hasLocalRow).toBe(false);
    expect(loadLocalSecrets()).toEqual({});
  });
});
