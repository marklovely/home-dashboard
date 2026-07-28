import { describe, expect, it, vi } from 'vitest';
import { describeWeather, fetchWeather, resolveCoordinates } from '../src/js/modules/weather.js';

describe('weather', () => {
  it('describes known and unknown codes', () => {
    expect(describeWeather(0)).toEqual({ text: 'Clear', icon: '☀' });
    expect(describeWeather(999)).toEqual({ text: 'Weather', icon: '◌' });
  });

  it('uses configured coordinates', async () => {
    await expect(resolveCoordinates({ latitude: 50.88, longitude: -1.03 })).resolves.toEqual({
      latitude: 50.88,
      longitude: -1.03
    });
  });

  it('fetches current weather', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: () => ({ current: {} }) });
    await expect(fetchWeather({ latitude: 1, longitude: 2, fetchImpl })).resolves.toEqual({ current: {} });
  });
});
