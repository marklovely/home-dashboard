import { describe, expect, it, vi } from 'vitest';
import '../src/apps/index.js';
import { mountEmergencyApp } from '../src/apps/Emergency/EmergencyApp.js';
import { consumePendingGuideTopic, setPendingGuideTopic } from '../src/services/guideNavigation.js';

describe('Emergency app', () => {
  it('opens owner contact details in House Guide instead of tel links', () => {
    setPendingGuideTopic(null);
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
    expect(viewport.textContent).not.toMatch(/Call Mark|Call Donna|Useful numbers/);

    const markCard = [...viewport.querySelectorAll('.emergency-card')].find((card) =>
      /Mark — contact details/i.test(card.textContent ?? '')
    );
    expect(markCard).toBeTruthy();
    markCard?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(navigate).toHaveBeenCalledWith('house-guide', { guideTopicId: 'contacting-mark-donna' });
    expect(consumePendingGuideTopic()).toBe('contacting-mark-donna');
  });
});
