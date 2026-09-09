/** @type {{ id: string, label: string, slotId: string }[]} */
export const SETTINGS_TABS = [
  { id: 'stripe', label: 'Stripe', slotId: 'stripe-mode-slot' },
  { id: 'intro', label: 'Intro offer', slotId: 'intro-offer-slot' },
  { id: 'copy', label: 'Marketing copy', slotId: 'marketing-pricing-slot' },
  { id: 'access', label: 'Site access', slotId: 'marketing-access-slot' }
];

const STORAGE_KEY = 'platform-admin-settings-tab';

/**
 * Shell for billing / marketing settings — one tab visible at a time.
 */
export function renderSettingsHubShell() {
  return `
    <section class="settings-hub" aria-label="Platform settings">
      <div class="settings-hub__head">
        <h2 class="settings-hub__title">Platform settings</h2>
        <p class="settings-hub__lead muted">Stripe mode, offers, public pricing copy, and marketing-site access.</p>
      </div>
      <div class="settings-tabs" role="tablist" aria-label="Settings sections">
        ${SETTINGS_TABS.map(
          (tab, index) => `
          <button
            type="button"
            class="settings-tab${index === 0 ? ' is-active' : ''}"
            role="tab"
            id="settings-tab-${tab.id}"
            aria-selected="${index === 0 ? 'true' : 'false'}"
            aria-controls="${tab.slotId}"
            data-settings-tab="${tab.id}"
          >${tab.label}</button>`
        ).join('')}
      </div>
      <div class="settings-panels">
        ${SETTINGS_TABS.map(
          (tab, index) => `
          <div
            id="${tab.slotId}"
            class="settings-panel${index === 0 ? ' is-active' : ''}"
            role="tabpanel"
            aria-labelledby="settings-tab-${tab.id}"
            data-settings-panel="${tab.id}"
          ></div>`
        ).join('')}
      </div>
    </section>
  `;
}

/**
 * Tab switching for the settings hub. Keeps fold panels open inside the active tab.
 */
export function wireSettingsHub() {
  const hub = document.querySelector('.settings-hub');
  if (!hub) return;

  const saved = sessionStorage.getItem(STORAGE_KEY);
  const initial =
    saved && SETTINGS_TABS.some((tab) => tab.id === saved) ? saved : SETTINGS_TABS[0].id;

  /** @param {string} tabId */
  function activate(tabId) {
    hub.querySelectorAll('.settings-tab').forEach((tab) => {
      const active = tab.getAttribute('data-settings-tab') === tabId;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    hub.querySelectorAll('.settings-panel').forEach((panel) => {
      const active = panel.getAttribute('data-settings-panel') === tabId;
      panel.classList.toggle('is-active', active);
      if (active) {
        panel.querySelectorAll('details.panel-fold').forEach((details) => {
          if (details instanceof HTMLDetailsElement) details.open = true;
        });
      }
    });

    sessionStorage.setItem(STORAGE_KEY, tabId);
  }

  hub.querySelectorAll('.settings-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabId = tab.getAttribute('data-settings-tab');
      if (tabId) activate(tabId);
    });
  });

  activate(initial);
}
