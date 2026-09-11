import { describe, expect, it } from 'vitest';
import { fetchBillingArchiveState } from '../scripts/lib/fetch-billing-archive-state.mjs';

describe('fetchBillingArchiveState', () => {
  it('rejects invalid site ids', () => {
    expect(() => fetchBillingArchiveState('')).toThrow(/valid site_id/);
    expect(() => fetchBillingArchiveState('Bad Site')).toThrow(/valid site_id/);
  });
});
