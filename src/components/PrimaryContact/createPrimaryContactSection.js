import { getProtectedDisplayValue } from '../../content/houseguide/privateContent.js';
import { isPrivateConfigLoading, subscribeToPrivateConfig } from '../../services/privateConfigService.js';

/**
 * @param {{ heading?: string, intro?: string }} [options]
 * @returns {HTMLElement}
 */
export function createPrimaryContactSection(options = {}) {
  const section = document.createElement('section');
  section.className = 'guide-section guide-section-protected guide-section-primary-contact';

  if (options.intro) {
    const intro = document.createElement('p');
    intro.className = 'guide-section-lead';
    intro.textContent = options.intro;
    section.append(intro);
  }

  const name = document.createElement('h3');
  name.className = 'guide-section-heading';
  name.textContent = options.heading ?? 'Primary contact';

  const list = document.createElement('dl');
  list.className = 'guide-value-list';

  const phoneLabel = document.createElement('dt');
  phoneLabel.textContent = 'Phone';
  const phoneValue = document.createElement('dd');

  const emailLabel = document.createElement('dt');
  emailLabel.textContent = 'Email';
  const emailValue = document.createElement('dd');

  list.append(phoneLabel, phoneValue, emailLabel, emailValue);
  section.append(name, list);

  function paintValue(element, value) {
    element.textContent = value;
    element.classList.toggle('guide-protected-placeholder', value.includes('secure house-sitter'));
  }

  function paint() {
    if (isPrivateConfigLoading()) {
      paintValue(phoneValue, 'Loading secure details…');
      paintValue(emailValue, 'Loading secure details…');
      return;
    }

    paintValue(phoneValue, getProtectedDisplayValue('contacts.mark.phone', 'contact'));
    paintValue(emailValue, getProtectedDisplayValue('contacts.mark.email', 'contact'));
  }

  paint();
  subscribeToPrivateConfig(paint);

  return section;
}
