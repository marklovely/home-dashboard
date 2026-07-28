import { describe, expect, it, vi } from 'vitest';
import { buildVirtualButtonUrl, triggerVirtualButton } from '../src/js/modules/virtualButtons.js';

describe('Virtual Buttons', () => {
  it('builds a valid trigger URL', () => {
    const url = new URL(buildVirtualButtonUrl('abc123', 4));
    expect(url.searchParams.get('virtualButton')).toBe('4');
    expect(url.searchParams.get('accessCode')).toBe('abc123');
  });

  it('rejects missing access code', () => {
    expect(() => buildVirtualButtonUrl('', 1)).toThrow(/access code/i);
  });

  it('triggers via GET using no-cors mode', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ type: 'opaque' });

    await expect(triggerVirtualButton({ accessCode: 'abc', buttonId: 1, fetchImpl })).resolves.toBe(true);

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('virtualButton=1'),
      expect.objectContaining({ method: 'GET', mode: 'no-cors', cache: 'no-store' })
    );
  });

  it('propagates a network failure', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Network request failed'));

    await expect(triggerVirtualButton({ accessCode: 'abc', buttonId: 1, fetchImpl })).rejects.toThrow(
      'Network request failed'
    );
  });
});
