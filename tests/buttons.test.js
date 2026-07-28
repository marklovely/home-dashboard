import { describe, expect, it, vi } from 'vitest';
import { createRoutineButton, renderButtons } from '../src/js/modules/buttons.js';

describe('buttons', () => {
  const button = { id: 1, title: 'Bedtime', subtitle: 'Sleep', icon: '☾', colour: '#fff' };

  it('creates an accessible routine button', () => {
    const onTrigger = vi.fn();
    const element = createRoutineButton(button, onTrigger);
    expect(element.getAttribute('aria-label')).toBe('Bedtime');
    element.click();
    expect(onTrigger).toHaveBeenCalledWith(button, element);
  });

  it('renders all configured buttons', () => {
    const container = document.createElement('div');
    renderButtons(container, [button, { ...button, id: 2, title: 'Movie' }], vi.fn());
    expect(container.children).toHaveLength(2);
  });
});
