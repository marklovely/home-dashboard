import { describe, expect, it } from 'vitest';
import { uniqueOwnerEmail } from '../e2e/lib/stripeApi.js';

describe('lifecycle e2e helpers', () => {
  it('plus-tags the owner email with the site id', () => {
    expect(uniqueOwnerEmail('you@example.com', 'e2e-abc')).toBe('you+e2e-abc@example.com');
    expect(uniqueOwnerEmail('you+ops@example.com', 'e2e-abc')).toBe('you+ops-e2e-abc@example.com');
  });
});
