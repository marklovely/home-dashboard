import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import '../src/apps/index.js';
import { mountEmergencyApp } from '../src/apps/Emergency/EmergencyApp.js';
import { buildEmergencyCards } from '../src/apps/Emergency/emergencyCards.js';
import { resetHubEnvironmentForTests } from '../src/auth/hubEnvironment.js';
import {
  preloadPrivateConfig,
  resetPrivateConfigForTests
} from '../src/services/privateConfigService.js';
import {
  resetSiteProfileStateForTests,
  setSiteProfileStateForTests
} from '../src/services/siteProfileService.js';

describe('Emergency app', () => {
  beforeEach(() => {
    resetPrivateConfigForTests();
    resetSiteProfileStateForTests();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    resetHubEnvironmentForTests();
    resetSiteProfileStateForTests();
  });

  it('shows owner contact details in-page instead of tel links or House Guide', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
    setSiteProfileStateForTests({
      profile: {
        onboardingComplete: true,
        primaryContact: { name: 'Alex Host' }
      }
    });
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        contacts: {
          mark: { phone: '07123456789', email: 'alex@example.com' },
          donna: { phone: '07987654321', email: 'backup@example.com' }
        }
      })
    });
    await preloadPrivateConfig(fetchImpl);

    const viewport = document.createElement('div');
    const navigate = vi.fn();
    const context = {
      config: { buttons: [] },
      toast: document.createElement('div'),
      lastCommand: document.createElement('div'),
      navigate
    };

    mountEmergencyApp(viewport, context);

    expect(viewport.querySelector('a.emergency-card[href^="tel:"]')).toBeNull();

    const primaryCard = [...viewport.querySelectorAll('.emergency-card')].find((card) =>
      /Alex Host — contact details/i.test(card.textContent ?? '')
    );
    expect(primaryCard).toBeTruthy();
    primaryCard?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(navigate).not.toHaveBeenCalled();
    const panel = viewport.querySelector('.emergency-detail-overlay');
    expect(panel).toBeTruthy();
    expect(panel?.textContent).toMatch(/07123456789/);
    expect(panel?.textContent).toMatch(/alex@example.com/);
  });

  it('shows vet details in-page without navigating to House Guide', () => {
    setSiteProfileStateForTests({
      profile: { onboardingComplete: true, primaryContact: { name: 'Alex Host' } }
    });

    const viewport = document.createElement('div');
    const navigate = vi.fn();
    const context = {
      config: { buttons: [] },
      toast: document.createElement('div'),
      lastCommand: document.createElement('div'),
      navigate
    };

    mountEmergencyApp(viewport, context);

    const vetCard = [...viewport.querySelectorAll('.emergency-card')].find((card) =>
      /^Vet/i.test(card.textContent?.trim() ?? '')
    );
    expect(vetCard).toBeTruthy();
    vetCard?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(navigate).not.toHaveBeenCalled();
    const panel = viewport.querySelector('.emergency-detail-overlay');
    expect(panel?.textContent).toMatch(/Vets 4 Pets/);
    expect(panel?.textContent).toMatch(/Waterlooville/);
    expect(panel?.querySelector('a[href^="tel:"]')).toBeNull();
  });

  it('uses generic contact cards on the test hub with no personal names', () => {
    vi.stubEnv('VITE_HUB_ENVIRONMENT', 'test');
    resetHubEnvironmentForTests();

    const cards = buildEmergencyCards();
    const labels = cards.map((card) => card.label).join('\n');

    expect(labels).toMatch(/Primary contact/);
    expect(labels).not.toMatch(/Mark|Donna|Scooter|Vets 4 Pets/i);
    expect(cards.some((card) => card.kind === 'topic' && card.topicId === 'vet')).toBe(false);
  });
});
