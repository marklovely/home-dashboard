import { describe, expect, it } from 'vitest';
import { renderNetworkStatus } from '../src/js/modules/network.js';

describe('network status', () => {
  it('renders offline state', () => {
    const label = document.createElement('span');
    const dot = document.createElement('span');
    renderNetworkStatus({ label, dot }, false);
    expect(label.textContent).toBe('Offline');
    expect(dot.classList.contains('offline')).toBe(true);
  });
});
