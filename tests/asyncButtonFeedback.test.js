import { describe, expect, it, vi } from 'vitest';
import { withAsyncButtonFeedback } from '../src/lib/asyncButtonFeedback.js';

describe('withAsyncButtonFeedback', () => {
  it('disables the button, shows a busy label, and restores state', async () => {
    const button = document.createElement('button');
    button.textContent = 'Save';
    document.body.append(button);

    const task = vi.fn().mockResolvedValue('ok');
    const result = await withAsyncButtonFeedback(button, 'Saving…', task);

    expect(result).toBe('ok');
    expect(task).toHaveBeenCalledOnce();
    expect(button.disabled).toBe(false);
    expect(button.textContent).toBe('Save');
    expect(button.getAttribute('aria-busy')).toBeNull();

    button.remove();
  });

  it('restores state when the task throws', async () => {
    const button = document.createElement('button');
    button.textContent = 'Reset';
    document.body.append(button);

    await expect(
      withAsyncButtonFeedback(button, 'Resetting…', async () => {
        throw new Error('fail');
      })
    ).rejects.toThrow('fail');

    expect(button.disabled).toBe(false);
    expect(button.textContent).toBe('Reset');
    expect(button.getAttribute('aria-busy')).toBeNull();

    button.remove();
  });

  it('uses resolveLabel when the visible label changes during the task', async () => {
    const button = document.createElement('button');
    button.textContent = 'Continue';
    document.body.append(button);

    await withAsyncButtonFeedback(
      button,
      'Working…',
      async () => {
        button.textContent = 'Next step';
      },
      () => 'Next step'
    );

    expect(button.textContent).toBe('Next step');

    button.remove();
  });
});
