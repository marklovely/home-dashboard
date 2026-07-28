export function createRoutineButton(button, onTrigger) {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = 'routine-button';
  element.style.setProperty('--accent', button.colour);
  element.setAttribute('aria-label', button.title);

  const icon = document.createElement('span');
  icon.className = 'button-icon';
  icon.textContent = button.icon;

  const title = document.createElement('span');
  title.className = 'button-title';
  title.textContent = button.title;

  const subtitle = document.createElement('span');
  subtitle.className = 'button-subtitle';
  subtitle.textContent = button.subtitle ?? `Virtual Button ${button.id}`;

  element.append(icon, title, subtitle);
  element.addEventListener('click', () => onTrigger(button, element));
  return element;
}

export function renderButtons(container, buttons, onTrigger) {
  container.replaceChildren(...buttons.map((button) => createRoutineButton(button, onTrigger)));
}
