import { describe, expect, it } from 'vitest';
import { getHubSecret, setHubSecrets } from '../src/lib/hubSecrets.js';
import { getSiteProfile, resetSiteProfile, updateSiteProfile } from '../src/lib/siteProfile.js';
import { createInMemoryHubSetupDb } from './mocks/hubSetupStorage.js';

describe('hub setup storage', () => {
  it('stores and reads hub secrets', async () => {
    const env = { HOUSE_GUIDE_DB: createInMemoryHubSetupDb() };
    await setHubSecrets(env, { wifi_ssid: 'GuestNet', owner_pin: '1234' });
    expect(await getHubSecret(env, 'wifi_ssid')).toBe('GuestNet');
    expect(await getHubSecret(env, 'owner_pin')).toBe('1234');
  });

  it('updates site profile fields', async () => {
    const env = { HOUSE_GUIDE_DB: createInMemoryHubSetupDb() };
    await updateSiteProfile(env, {
      hubName: 'Rose Cottage Hub',
      onboardingComplete: true,
      primaryContact: { name: 'Alex', phone: '111', email: 'alex@example.com' }
    });
    const profile = await getSiteProfile(env);
    expect(profile.hubName).toBe('Rose Cottage Hub');
    expect(profile.onboardingComplete).toBe(true);
    expect(profile.primaryContact.name).toBe('Alex');
  });

  it('resets site profile to defaults', async () => {
    const env = { HOUSE_GUIDE_DB: createInMemoryHubSetupDb() };
    await updateSiteProfile(env, { hubName: 'Test', onboardingComplete: true });
    const profile = await resetSiteProfile(env);
    expect(profile.hubName).toBe('');
    expect(profile.onboardingComplete).toBe(false);
  });
});
