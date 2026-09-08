import '../src/apps/index.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAppById } from '../src/services/appRegistry.js';
import { navigate, resetRouterForTests, getCurrentRoute } from '../src/shell/router.js';
import * as siteProfileService from '../src/services/siteProfileService.js';
import * as privateConfigService from '../src/services/privateConfigService.js';
import * as sitterAccessEmailsService from '../src/services/sitterAccessEmailsService.js';
import * as sitterSecretsService from '../src/services/sitterSecretsService.js';
import * as sitterControlsService from '../src/services/sitterControlsService.js';
import * as sitterStaysService from '../src/services/sitterStaysService.js';

describe('settings mount race', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetRouterForTests();
  });

  it('does not paint Settings after navigating away before async load finishes', async () => {
    let resolveProfileSync;
    vi.spyOn(siteProfileService, 'syncSiteProfileFromServer').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveProfileSync = () => resolve({ ok: true, data: {} });
        })
    );
    vi.spyOn(privateConfigService, 'refreshPrivateConfig').mockResolvedValue(undefined);
    vi.spyOn(sitterAccessEmailsService, 'syncSitterAccessEmailsFromServer').mockResolvedValue(true);
    vi.spyOn(sitterSecretsService, 'syncSitterSecretsFromServer').mockResolvedValue(true);
    vi.spyOn(sitterControlsService, 'syncSitterControlsFromServer').mockResolvedValue(true);
    vi.spyOn(sitterStaysService, 'syncSitterStaysFromServer').mockResolvedValue(true);

    const viewport = document.createElement('div');
    const context = {
      config: { buttons: [] },
      toast: document.createElement('div'),
      lastCommand: document.createElement('span'),
      refreshShell: vi.fn()
    };

    navigate('settings');
    getAppById('settings')?.mount(viewport, context);
    expect(viewport.querySelector('.settings-app--loading')).toBeTruthy();

    navigate('home');
    expect(getCurrentRoute()).toBe('home');

    resolveProfileSync?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(viewport.querySelector('.settings-nav')).toBeNull();
    expect(viewport.querySelector('.settings-panel')).toBeNull();
  });
});
