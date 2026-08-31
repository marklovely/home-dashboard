import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  formatHubHomeName,
  isPlaceholderHubName,
  titleCaseHubName
} from '../src/lib/hubHomeName.js';
import { resetHubEnvironmentForTests } from '../src/auth/hubEnvironment.js';
import { resetUserModeForTests, setUserMode, UserMode } from '../src/auth/userMode.js';
import {
  getHubDisplayName,
  getHubEyebrow,
  resetSiteProfileStateForTests,
  setSiteProfileStateForTests
} from '../src/services/siteProfileService.js';

describe('hub home name', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetHubEnvironmentForTests();
    resetSiteProfileStateForTests();
    resetUserModeForTests();
  });

  it('title-cases slugs and does not double Home', () => {
    expect(titleCaseHubName('powell')).toBe('Powell');
    expect(titleCaseHubName('rose-cottage')).toBe('Rose Cottage');
    expect(formatHubHomeName('Powell', 'powell')).toBe('Powell Home');
    expect(formatHubHomeName('Powell Home', 'powell')).toBe('Powell Home');
    expect(formatHubHomeName('Smith Home', 'smith')).toBe('Smith Home');
  });

  it('treats Lovely Home as a product leftover and uses the site slug', () => {
    expect(isPlaceholderHubName('Lovely Home')).toBe(true);
    expect(formatHubHomeName('Lovely Home', 'powell')).toBe('Powell Home');
    expect(formatHubHomeName('', 'powell')).toBe('Powell Home');
    expect(formatHubHomeName('', 'production')).toBe('Home Hub');
  });

  it('uses the site slug in chrome when the saved name is empty', () => {
    vi.stubEnv('VITE_HUB_ENVIRONMENT', 'powell');
    resetHubEnvironmentForTests();
    setSiteProfileStateForTests({ profile: { hubName: '' } });
    expect(getHubDisplayName()).toBe('Powell Home');
    expect(getHubEyebrow()).toBe('POWELL HOME HUB');
  });

  it('drops the HUB suffix in sitter mode', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'house-sitter');
    vi.stubEnv('VITE_HUB_ENVIRONMENT', 'powell');
    resetHubEnvironmentForTests();
    resetUserModeForTests();
    setUserMode(UserMode.HouseSitter);
    setSiteProfileStateForTests({ profile: { hubName: 'Powell' } });
    expect(getHubDisplayName()).toBe('Powell Home');
    expect(getHubEyebrow()).toBe('POWELL HOME');
  });
});
