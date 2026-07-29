import { describe, expect, it, vi } from 'vitest';
import { describeWeather, resolveCoordinates } from '../src/js/modules/weather.js';

describe('weather legacy helpers', () => {
  it('describes known and unknown codes', () => {
    expect(describeWeather(0)).toEqual({ text: 'Clear', icon: 'clear' });
    expect(describeWeather(999)).toEqual({ text: 'Weather', icon: 'cloudy' });
  });

  it('returns configured coordinates when present', async () => {
    await expect(resolveCoordinates({ latitude: 50.88, longitude: -1.03 })).resolves.toEqual({
      latitude: 50.88,
      longitude: -1.03
    });
  });
});

describe('weather API client', () => {
  it('fetches dashboard weather from Worker', async () => {
    const { fetchDashboardWeather } = await import('../src/api/weatherApi.js');
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ current: { temperature: 20 } })
    });
    const result = await fetchDashboardWeather({ fetchImpl });
    expect(result.ok).toBe(true);
    expect(fetchImpl.mock.calls[0][0]).toBe('https://api.example.test/api/weather');
  });
});
