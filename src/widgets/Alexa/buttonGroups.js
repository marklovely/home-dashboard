import { createRoutineButton } from './buttons.js';

/**
 * @param {{ buttons?: Array<{ id: number }>, buttonGroups?: Array<{ title: string, buttonIds: number[] }> }} config
 * @returns {Array<{ title: string, buttons: Array<{ id: number }> }>}
 */
export function resolveButtonGroups(config) {
  const allButtons = config.buttons ?? [];
  const byId = new Map(allButtons.map((button) => [button.id, button]));

  if (!config.buttonGroups?.length) {
    return [{ title: '', buttons: allButtons }];
  }

  return config.buttonGroups
    .map((group) => ({
      title: group.title,
      buttons: group.buttonIds.map((id) => byId.get(id)).filter(Boolean)
    }))
    .filter((group) => group.buttons.length > 0);
}

/**
 * @param {HTMLElement | DocumentFragment} container
 * @param {{ buttons?: Array<{ id: number }>, buttonGroups?: Array<{ title: string, buttonIds: number[] }> }} config
 * @param {Array<{ id: number }>} [buttonsOverride]
 * @param {(button: { id: number }, element: HTMLButtonElement) => void} onTrigger
 * @param {(button: HTMLButtonElement) => void} [decorateButton]
 */
export function renderButtonGroups(container, config, buttonsOverride, onTrigger, decorateButton) {
  const sourceConfig = buttonsOverride
    ? {
        buttons: buttonsOverride,
        buttonGroups: config.buttonGroups?.map((group) => ({
          ...group,
          buttonIds: group.buttonIds.filter((id) => buttonsOverride.some((b) => b.id === id))
        }))
      }
    : config;

  const groups = resolveButtonGroups(sourceConfig);

  container.replaceChildren(
    ...groups.map((group) => {
      const section = document.createElement('section');
      section.className = 'control-button-group';

      if (group.title) {
        const heading = document.createElement('h3');
        heading.className = 'control-button-group__title';
        heading.textContent = group.title;
        section.append(heading);
      }

      const grid = document.createElement('div');
      grid.className = 'button-grid control-button-group__grid';

      for (const button of group.buttons) {
        const element = createRoutineButton(button, onTrigger);
        decorateButton?.(element);
        grid.append(element);
      }

      section.append(grid);
      return section;
    })
  );
}
