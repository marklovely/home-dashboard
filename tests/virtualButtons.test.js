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

  it('triggers via GET', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    await expect(triggerVirtualButton({ accessCode: 'abc', buttonId: 1, fetchImpl })).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('throws on failed response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(triggerVirtualButton({ accessCode: 'abc', buttonId: 1, fetchImpl })).rejects.toThrow('500');
  });
});
