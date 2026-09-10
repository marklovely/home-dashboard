import { showToast } from '../../js/modules/toast.js';
import { fetchHubPlanSummary, formatPlanUsageLine } from '../../services/hubPlanStatus.js';

/**
 * @param {import('./SettingsApp.js').SettingsRenderContext} context
 */
export function createPlanSummarySection(context) {
  const section = document.createElement('section');
  section.className = 'settings-section settings-plan-summary';
  section.hidden = true;

  const heading = document.createElement('h3');
  heading.className = 'settings-section-title';
  heading.textContent = 'Your plan';

  const card = document.createElement('div');
  card.className = 'settings-plan-card';

  const label = document.createElement('p');
  label.className = 'settings-plan-card__label';

  const detail = document.createElement('p');
  detail.className = 'settings-plan-card__detail muted';

  const actions = document.createElement('div');
  actions.className = 'settings-plan-card__actions';

  const upgradeLink = document.createElement('a');
  upgradeLink.className = 'button-secondary';
  upgradeLink.target = '_blank';
  upgradeLink.rel = 'noopener noreferrer';
  upgradeLink.textContent = 'Upgrade to Lovely Home+';

  const accountLink = document.createElement('a');
  accountLink.className = 'button-secondary';
  accountLink.target = '_blank';
  accountLink.rel = 'noopener noreferrer';
  accountLink.textContent = 'Billing & account';

  const guidesWrap = document.createElement('div');
  guidesWrap.className = 'settings-plan-guides';
  guidesWrap.hidden = true;

  const guidesHeading = document.createElement('h4');
  guidesHeading.textContent = 'House guides';

  const guidesList = document.createElement('ul');
  guidesList.className = 'settings-plan-guides__list';

  const addGuideForm = document.createElement('form');
  addGuideForm.className = 'settings-plan-guides__form';
  addGuideForm.innerHTML =
    '<label class="form-field"><span>New guide title</span><input type="text" name="title" maxlength="80" placeholder="Guest guide"></label><button type="submit" class="button-secondary">Add house guide</button>';

  guidesWrap.append(guidesHeading, guidesList, addGuideForm);
  actions.append(upgradeLink, accountLink);
  card.append(label, detail, actions, guidesWrap);
  section.append(heading, card);

  async function refresh() {
    const summary = await fetchHubPlanSummary();
    if (!summary) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    label.textContent = summary.planLabel;
    detail.textContent = formatPlanUsageLine(summary) ?? '';
    upgradeLink.href = summary.upgradeUrl;
    accountLink.href = summary.accountUrl;
    upgradeLink.hidden = summary.plan === 'plus';
    guidesWrap.hidden = false;

    try {
      const response = await fetch('/api/house-guides', { headers: { Accept: 'application/json' } });
      const payload = await response.json().catch(() => ({}));
      guidesList.replaceChildren();
      for (const guide of payload.guides ?? []) {
        const item = document.createElement('li');
        item.textContent = String(guide.title ?? guide.id);
        guidesList.append(item);
      }
    } catch {
      guidesList.replaceChildren();
    }
  }

  addGuideForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = addGuideForm.querySelector('input[name="title"]');
    const title = input?.value?.trim();
    if (!title) return;
    const response = await fetch('/api/house-guides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      showToast(context.toast, payload.message || 'Could not add guide.');
      return;
    }
    if (input) input.value = '';
    showToast(context.toast, 'House guide created.');
    await refresh();
  });

  void refresh();
  return section;
}
