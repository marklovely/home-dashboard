/**
 * @param {string} title
 * @returns {HTMLElement}
 */
export function createComingSoonView(title) {
  const page = document.createElement('section');
  page.className = 'app-page coming-soon-app';
  page.setAttribute('aria-label', title);

  const heading = document.createElement('h2');
  heading.className = 'coming-soon-title';
  heading.textContent = title;

  const message = document.createElement('p');
  message.className = 'coming-soon-message';
  message.textContent = 'Coming Soon';

  page.append(heading, message);
  return page;
}

/**
 * @param {Omit<import('../types/app.js').App, 'mount'>} definition
 * @returns {import('../types/app.js').App}
 */
export function definePlaceholderApp(definition) {
  return {
    ...definition,
    mount(viewport) {
      viewport.replaceChildren(createComingSoonView(definition.title));
    }
  };
}
