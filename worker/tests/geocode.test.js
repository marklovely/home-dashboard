import { describe, expect, it, vi } from 'vitest';
import {
  geocodeWeatherQuery,
  parseWeatherCoordinateOverride,
  weatherCacheKey
} from '../src/weather/geocode.js';

describe('weather geocode', () => {
  it('recognises coordinate overrides', () => {
    expect(parseWeatherCoordinateOverride('50.88', '-1.03')).toEqual({
      latitude: 50.88,
      longitude: -1.03
    });
    expect(parseWeatherCoordinateOverride('999', '0')).toEqual({ error: 'Invalid coordinates.' });
  });

  it('builds stable cache keys', () => {
    expect(weatherCacheKey(50.881, -1.034)).toBe('50.88,-1.03');
  });

  it('looks up UK postcodes via postcodes.io', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          result: {
            postcode: 'PO8 9XX',
            latitude: 50.881,
            longitude: -1.034,
            admin_district: 'Havant',
            region: 'South East'
          }
        }),
        { status: 200 }
      )
    );

    const result = await geocodeWeatherQuery('PO89XX', {}, fetchImpl);
    expect(result.status).toBe(200);
    expect(result.body.results[0].label).toBe('PO8 9XX');
    expect(fetchImpl).toHaveBeenCalledWith('https://api.postcodes.io/postcodes/PO89XX');
  });

  it('falls back to Open-Meteo for place names', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [{ name: 'Portsmouth', latitude: 50.81, longitude: -1.08, country: 'United Kingdom' }]
        }),
        { status: 200 }
      )
    );

    const result = await geocodeWeatherQuery('Portsmouth', {}, fetchImpl);
    expect(result.status).toBe(200);
    expect(result.body.results[0].label).toBe('Portsmouth');
  });
});
