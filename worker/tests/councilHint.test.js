import { describe, expect, it, vi } from 'vitest';
import { lookupCouncilHint, resolveCouncilHint } from '../src/bins/councilHint.js';

describe('council hint lookup', () => {
  it('finds a mapped council by admin district', () => {
    const hint = lookupCouncilHint('Havant');
    expect(hint?.councilName).toContain('Havant');
    expect(hint?.binsUrl).toMatch(/^https:\/\//);
  });

  it('resolves postcode via postcodes.io and attaches council hint', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          result: {
            postcode: 'PO8 9XX',
            admin_district: 'Havant',
            region: 'South East'
          }
        }),
        { status: 200 }
      )
    );

    const result = await resolveCouncilHint('PO89XX', fetchImpl);
    expect(result.status).toBe(200);
    expect(result.body.adminDistrict).toBe('Havant');
    expect(result.body.councilName).toContain('Havant');
    expect(result.body.binsUrl).toMatch(/^https:\/\//);
    expect(fetchImpl).toHaveBeenCalledWith('https://api.postcodes.io/postcodes/PO89XX');
  });

  it('returns district without mapped council URL', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          result: {
            postcode: 'AB12 3CD',
            admin_district: 'Aberdeen City',
            region: 'Scotland'
          }
        }),
        { status: 200 }
      )
    );

    const result = await resolveCouncilHint('AB12 3CD', fetchImpl);
    expect(result.status).toBe(200);
    expect(result.body.adminDistrict).toBe('Aberdeen City');
    expect(result.body.councilName).toBeNull();
    expect(result.body.binsUrl).toBeNull();
  });

  it('rejects invalid postcodes', async () => {
    const result = await resolveCouncilHint('not-a-postcode');
    expect(result.status).toBe(400);
  });
});
