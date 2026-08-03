import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  clearApplianceManualsState,
  getApplianceManualsState,
  refreshApplianceManuals,
  resetApplianceManualsStateForTests,
  setApplianceManualsOwnerDraftOpen
} from '../src/services/applianceManualsService.js';
import { APPLIANCE_MANUALS_CATEGORY_ID } from '../src/services/applianceManualsConstants.js';
import { getGuideCategory } from '../src/services/guideService.js';
import { getAppsForProfile } from '../src/services/appRegistry.js';
import { resetApiBaseForTests } from '../src/api/apiBase.js';
import {
  applyDeviceSessionMode,
  resetUserModeForTests,
  setUserMode,
  UserMode
} from '../src/auth/userMode.js';
import {
  bootstrapDeviceSession,
  clearOwnerOnlyClientData,
  resetDeviceSessionStoreForTests
} from '../src/auth/deviceSessionStore.js';
import { renderApplianceManualViewer } from '../src/widgets/HouseGuide/applianceManualsViewer.js';
import { renderApplianceManualsSitterView } from '../src/widgets/HouseGuide/applianceManualsSitterView.js';
import '../src/apps/index.js';

const sampleManual = {
  id: 'manual-1',
  title: 'User guide',
  applianceName: 'Dishwasher',
  manufacturer: 'Bosch',
  model: 'SMS2',
  category: 'Kitchen',
  location: 'Kitchen',
  description: 'Daily use',
  originalFilename: 'dishwasher.pdf',
  mimeType: 'application/pdf',
  fileSize: 1200,
  published: true,
  sortOrder: 0,
  createdAt: '2026-07-29T10:00:00.000Z',
  updatedAt: '2026-07-29T10:00:00.000Z'
};

describe('Appliance Manuals app registration', () => {
  it('registers management app for owner profile only', () => {
    const ownerApps = getAppsForProfile('owner').map((app) => app.id);
    const sitterApps = getAppsForProfile('housesitter').map((app) => app.id);
    expect(ownerApps).toContain('appliance-manuals');
    expect(sitterApps).not.toContain('appliance-manuals');
  });

  it('exposes Appliance Manuals in the House Guide catalog', () => {
    const category = getGuideCategory(APPLIANCE_MANUALS_CATEGORY_ID);
    expect(category?.title).toBe('Appliance Manuals');
    expect(category?.cardSubtitle).toContain('Instructions and user guides');
  });
});

describe('Appliance Manuals service', () => {
  beforeEach(async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://worker.test');
    resetApiBaseForTests();
    resetUserModeForTests();
    resetDeviceSessionStoreForTests();
    resetApplianceManualsStateForTests();
    applyDeviceSessionMode('owner');
    setUserMode(UserMode.Owner);
    await bootstrapDeviceSession(
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ authenticated: true, mode: 'owner', ownerSessionExpiresAt: null })
      }))
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetApplianceManualsStateForTests();
  });

  it('loads published manuals for sitter mode', async () => {
    setUserMode(UserMode.HouseSitter);
    applyDeviceSessionMode('sitter');
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ manuals: [sampleManual] })
    }));
    await refreshApplianceManuals(fetchImpl, { owner: false, force: true });
    expect(getApplianceManualsState().manuals).toHaveLength(1);
  });

  it('clears owner manual state when entering sitter mode', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ manuals: [sampleManual] })
    }));
    await refreshApplianceManuals(fetchImpl, { owner: true, force: true });
    setApplianceManualsOwnerDraftOpen(true);
    expect(getApplianceManualsState().manuals).toHaveLength(1);
    clearOwnerOnlyClientData();
    expect(getApplianceManualsState().manuals).toHaveLength(0);
    expect(getApplianceManualsState().ownerDraftOpen).toBe(false);
  });

  it('surfaces unavailable state on server error', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({ error: { message: 'Unavailable' } })
    }));
    await refreshApplianceManuals(fetchImpl, { owner: true, force: true });
    expect(getApplianceManualsState().status).toBe('unavailable');
    expect(getApplianceManualsState().message).toContain('temporarily unavailable');
  });
});

describe('Appliance Manuals sitter UI', () => {
  beforeEach(async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://worker.test');
    resetApiBaseForTests();
    resetDeviceSessionStoreForTests();
    const dom = new JSDOM('<!doctype html><html><body></body></html>');
    global.document = dom.window.document;
    global.window = dom.window;
    resetApplianceManualsStateForTests();
    clearApplianceManualsState();
    setUserMode(UserMode.HouseSitter);
    await bootstrapDeviceSession(
      vi.fn(async (url) => {
        if (String(url).includes('/api/device-session')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ authenticated: true, mode: 'sitter', ownerSessionExpiresAt: null })
          };
        }
        return { ok: true, status: 200, json: async () => ({ manuals: [] }) };
      })
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetApiBaseForTests();
  });

  it('renders published manuals and empty search state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ manuals: [sampleManual] })
      }))
    );

    const panel = renderApplianceManualsSitterView(() => {});
    await vi.waitFor(() => expect(panel.textContent).toContain('Dishwasher'));

    expect(panel.querySelector('.guide-category-title')?.textContent).toBe('Appliance Manuals');
    expect(panel.textContent).not.toContain('Add manual');

    const search = /** @type {HTMLInputElement} */ (panel.querySelector('.appliance-manuals-search'));
    search.value = 'missing-appliance';
    search.dispatchEvent(new window.Event('input'));
    expect(panel.textContent).toContain('No appliance manuals match your search.');
    panel.cleanup?.();
  });

  it('shows loading and empty states', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ manuals: [] })
      }))
    );

    const loadingPanel = renderApplianceManualsSitterView(() => {});
    expect(loadingPanel.textContent).toContain('Loading appliance manuals');

    await vi.waitFor(() =>
      expect(loadingPanel.textContent).toContain('No appliance manuals have been added yet.')
    );
    loadingPanel.cleanup?.();
  });
});

describe('Appliance Manuals PDF viewer', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://worker.test');
    resetApiBaseForTests();
    const dom = new JSDOM('<!doctype html><html><body></body></html>');
    global.document = dom.window.document;
    global.window = dom.window;
    global.URL.createObjectURL = vi.fn(() => 'blob:manual');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetApiBaseForTests();
  });

  it('shows retry action when the PDF cannot load', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 403
      }))
    );

    const viewer = renderApplianceManualViewer(sampleManual, () => {});
    expect(viewer.querySelector('.appliance-manual-viewer-title')?.textContent).toBe('User guide');
    await vi.waitFor(() => expect(viewer.textContent).toContain('Try again'));
    viewer.cleanup?.();
  });
});

describe('Owner controls hidden during session loading', () => {
  beforeEach(() => {
    const dom = new JSDOM('<!doctype html><html><body><div id="viewport"></body></html>');
    global.document = dom.window.document;
    global.window = dom.window;
    vi.stubEnv('VITE_API_BASE_URL', 'https://worker.test');
    resetDeviceSessionStoreForTests();
    resetUserModeForTests();
    resetApplianceManualsStateForTests();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('does not show management copy before session is ready', async () => {
    const { applianceManualsApp } = await import('../src/apps/ApplianceManuals/ApplianceManualsApp.js');
    const viewport = document.getElementById('viewport');
    applianceManualsApp.mount(viewport, {});
    expect(viewport.textContent).toContain('Loading');
    expect(viewport.textContent).not.toContain('Add manual');
  });

  it('opens the add manual dialog when Add manual is clicked', async () => {
    await bootstrapDeviceSession(
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ authenticated: true, mode: 'owner', ownerSessionExpiresAt: null })
      }))
    );

    const { applianceManualsApp } = await import('../src/apps/ApplianceManuals/ApplianceManualsApp.js');
    const viewport = document.getElementById('viewport');
    applianceManualsApp.mount(viewport, {});

    const addButton = /** @type {HTMLButtonElement | null} */ (
      viewport.querySelector('.appliance-manuals-owner-header .button-primary')
    );
    expect(addButton?.textContent).toBe('Add manual');
    addButton?.click();

    const dialog = viewport.querySelector('dialog.appliance-manuals-dialog');
    expect(dialog).toBeTruthy();
    expect(dialog?.textContent).toContain('Manual title');
    expect(dialog?.textContent).toContain('House Guide help pages');
  });
});
