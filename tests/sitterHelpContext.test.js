import { afterEach, describe, expect, it, vi } from 'vitest';
import '../src/apps/index.js';
import { buildSitterHelpSections } from '../src/components/HelpGuide/sitterHelpContent.js';
import { resetHubEnvironmentForTests } from '../src/auth/hubEnvironment.js';
import {
  buildSitterHelpSearchPlaceholder,
  getHostDisplayName,
  getStayPlaceLabel
} from '../src/lib/sitterHelpContext.js';
import {
  resetSiteProfileStateForTests,
  setSiteProfileStateForTests
} from '../src/services/siteProfileService.js';

describe('sitter help context', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    resetHubEnvironmentForTests();
    resetSiteProfileStateForTests();
  });

  it('uses host and hub names from site profile', () => {
    setSiteProfileStateForTests({
      profile: {
        hubName: 'Lovely Demo Home',
        primaryContact: { name: 'Alex & Sam' },
        petCare: { hasPets: true, name: 'Bailey', species: 'Jack Russell', age: '5 years' }
      },
      loaded: true
    });

    expect(getHostDisplayName()).toBe('Alex & Sam');
    expect(getStayPlaceLabel()).toBe('Lovely Demo Home');
  });

  it('builds demo-aware sitter help without Mark, Donna, or Scooter', () => {
    resetHubEnvironmentForTests();
    vi.stubEnv('VITE_HUB_ENVIRONMENT', 'demo');
    vi.stubGlobal('location', { hostname: 'demo.lovely-home.co.uk' });

    setSiteProfileStateForTests({
      profile: {
        hubName: 'Lovely Demo Home',
        primaryContact: { name: 'Alex & Sam' },
        petCare: { hasPets: true, name: 'Bailey', species: 'Jack Russell', age: '5 years' }
      },
      loaded: true
    });

    const sections = buildSitterHelpSections();
    const allText = JSON.stringify(sections);

    expect(allText).toContain('Alex & Sam');
    expect(allText).toContain('Bailey');
    expect(allText).toContain('Lovely Demo Home');
    expect(allText).not.toMatch(/Mark and Donna|Scooter app|Home Controls/);
    expect(sections.some((section) => section.id === 'home-controls')).toBe(false);
    expect(sections.find((section) => section.id === 'pet-care')?.title).toContain('Bailey');
    expect(buildSitterHelpSearchPlaceholder()).toContain('Bailey');
  });
});
