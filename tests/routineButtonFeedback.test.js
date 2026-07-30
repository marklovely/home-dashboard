import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  ensureRoutineButtonStatus,
  runRoutineButtonAction
} from '../src/widgets/Alexa/routineButtonFeedback.js';

describe('routineButtonFeedback', () => {
  /** @type {HTMLElement} */
  let button;

  beforeEach(() => {
    vi.useFakeTimers();
    button = document.createElement('button');
    button.className = 'routine-button';
    document.body.append(button);
  });

  afterEach(() => {
    vi.useRealTimers();
    button.remove();
  });

  it('adds a status indicator once', () => {
    ensureRoutineButtonStatus(button);
    ensureRoutineButtonStatus(button);
    expect(button.querySelectorAll('.routine-button-status')).toHaveLength(1);
  });

  it('shows loading then success states', async () => {
    const action = vi.fn().mockResolvedValue(undefined);
    const onSuccess = vi.fn();

    const pending = runRoutineButtonAction(button, action, { onSuccess });
    expect(button.classList.contains('routine-button--loading')).toBe(true);
    expect(button.disabled).toBe(true);

    await pending;
    expect(action).toHaveBeenCalledOnce();
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(button.classList.contains('routine-button--success')).toBe(true);

    vi.advanceTimersByTime(900);
    expect(button.disabled).toBe(false);
    expect(button.dataset.routineBusy).toBeUndefined();
  });

  it('shows error state when the action fails', async () => {
    const onError = vi.fn();
    await runRoutineButtonAction(
      button,
      () => Promise.reject(new Error('Upstream failed')),
      { onError }
    );

    expect(onError).toHaveBeenCalledOnce();
    expect(button.classList.contains('routine-button--error')).toBe(true);

    vi.advanceTimersByTime(650);
    expect(button.disabled).toBe(false);
  });

  it('ignores duplicate clicks while busy', async () => {
    let resolveAction;
    const action = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveAction = resolve;
        })
    );

    void runRoutineButtonAction(button, action);
    void runRoutineButtonAction(button, action);
    expect(action).toHaveBeenCalledOnce();

    resolveAction?.();
    await Promise.resolve();
    vi.advanceTimersByTime(900);
  });
});
