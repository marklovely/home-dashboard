import { defineApp } from '../../components/App/defineApp.js';
import { mountArrivalPrepChecklist } from '../../components/ArrivalPrep/createArrivalPrepCard.js';
import { getArrivalPrepHomeSummary } from '../../lib/arrivalPrep/arrivalPrepSummary.js';
import { syncSitterStaysFromServer } from '../../services/sitterStaysService.js';

/**
 * @param {HTMLElement} viewport
 */
function mountArrivalPrepApp(viewport) {
  viewport.replaceChildren();

  const page = document.createElement('section');
  page.className = 'app-page arrival-prep-page';
  page.setAttribute('aria-label', 'Getting ready');

  const host = document.createElement('div');
  host.className = 'arrival-prep-page-host';
  page.append(host);
  viewport.append(page);

  void syncSitterStaysFromServer();
  mountArrivalPrepChecklist(host, { variant: 'app' });
}

export const arrivalPrepApp = defineApp({
  id: 'arrival-prep',
  title: 'Getting ready',
  iconId: 'list-checks',
  description: 'Prepare your home before guests or sitters arrive',
  capabilities: ['offline', 'owner-private'],
  accent: '#c4a35a',
  profiles: ['owner'],
  summary: () => getArrivalPrepHomeSummary(),
  mount: mountArrivalPrepApp
});
