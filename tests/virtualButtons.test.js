import { describe, expect, it, vi } from 'vitest';
import { triggerVirtualButton } from '../src/js/modules/virtualButtons.js';
import * as buttonApiModule from '../src/api/buttonApi.js';

describe('Virtual Buttons (Worker proxy)', () => {
  it('delegates to buttonApi by numeric id', async () => {
    const pressSpy = vi.spyOn(buttonApiModule, 'pressButtonById').mockResolvedValue(true);
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

    await expect(triggerVirtualButton({ buttonId: 1 })).resolves.toBe(true);
    expect(pressSpy).toHaveBeenCalledWith(1, undefined);
    pressSpy.mockRestore();
  });

  it('rejects when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    await expect(triggerVirtualButton({ buttonId: 1 })).rejects.toThrow(/offline/i);
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });
});
