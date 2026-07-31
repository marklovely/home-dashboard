import { describe, expect, it, vi, beforeEach } from 'vitest';
import '../src/apps/index.js';
import { mountEmergencyApp } from '../src/apps/Emergency/EmergencyApp.js';
import {
  preloadPrivateConfig,
  resetPrivateConfigForTests
} from '../src/services/privateConfigService.js';

describe('Emergency app', () => {
  beforeEach(() => {
    resetPrivateConfigForTests();
    vi.unstubAllEnvs();
  });

  it('shows owner contact details in-page instead of tel links or House Guide', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        contacts: {
          mark: { phone: '07123456789', email: 'mark@example.com' },
          donna: { phone: '07987654321', email: 'donna@example.com' }
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

    const markCard = [...viewport.querySelectorAll('.emergency-card')].find((card) =>
      /Mark — contact details/i.test(card.textContent ?? '')
    );
    expect(markCard).toBeTruthy();
    markCard?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(navigate).not.toHaveBeenCalled();
    const panel = viewport.querySelector('.emergency-detail-overlay');
    expect(panel).toBeTruthy();
    expect(panel?.textContent).toMatch(/07123456789/);
    expect(panel?.textContent).toMatch(/mark@example.com/);
  });

  it('shows vet details in-page without navigating to House Guide', () => {
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
});
