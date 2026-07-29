import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildWeatherCardSummary,
  refreshWeather,
  resetWeatherStateForTests,
  WEATHER_REFRESH_MS,
  formatWeatherAge
} from '../src/services/weatherService.js';
import { applyWeatherToStatusStrip } from '../src/js/modules/weather.js';

const sampleWeather = {
  current: {
    temperature: 22,
    feelsLike: 24,
    condition: 'Partly Cloudy',
    icon: 'partly-cloudy',
    windSpeed: 12,
    windDirection: 'SW',
    humidity: 63,
    uvIndex: 5,
    airQuality: 'Good'
  },
  today: { high: 25, low: 16, rainChance: 20, sunrise: '05:18', sunset: '21:03' },
  hourly: [],
  daily: [{ date: '2026-07-29', label: 'Today', condition: 'Partly Cloudy', icon: 'partly-cloudy', high: 25, low: 16, rainChance: 20 }],
  advice: [{ icon: 'garden', title: 'Dry weather today.', detail: 'Good opportunity for gardening.' }],
  dashboardAlert: null,
  meta: { updatedAt: new Date().toISOString(), fromCache: false, stale: false }
};

describe('weatherService', () => {
  afterEach(() => {
    resetWeatherStateForTests();
    vi.unstubAllEnvs();
  });

  it('uses a fifteen minute refresh interval', () => {
    expect(WEATHER_REFRESH_MS).toBe(15 * 60 * 1000);
  });

  it('builds a glanceable dashboard card summary', () => {
    const summary = buildWeatherCardSummary(sampleWeather);
    expect(summary.title).toBe('22°');
    expect(summary.subtitle).toContain('Partly Cloudy');
    expect(summary.subtitle).toContain('High 25°');
  });

  it('shows rain alert on the dashboard card when provided', () => {
    const summary = buildWeatherCardSummary({
      ...sampleWeather,
      dashboardAlert: { label: 'Rain in 2 hours', icon: 'rain' }
    });
    expect(summary.subtitle).toBe('Rain in 2 hours');
  });

  it('loads weather from the Worker API', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => sampleWeather
    });
    const state = await refreshWeather(fetchImpl);
    expect(state.status).toBe('ready');
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.test/api/weather',
      expect.objectContaining({ cache: 'no-store', credentials: 'include' })
    );
    expect(String(fetchImpl.mock.calls[0][0])).not.toContain('open-meteo');
  });

  it('enters unavailable state when Worker fails and no prior data exists', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: 'Weather currently unavailable.' })
    });
    const state = await refreshWeather(fetchImpl);
    expect(state.status).toBe('unavailable');
  });

  it('formats updated age labels', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatWeatherAge(fiveMinutesAgo)).toBe('Updated 5 minutes ago');
  });
});

describe('weather status strip', () => {
  it('renders current temperature and condition', () => {
    const temp = document.createElement('strong');
    const text = document.createElement('span');
    const icon = document.createElement('span');
    applyWeatherToStatusStrip(
      { temp, text, icon },
      { status: 'ready', data: sampleWeather, message: '' }
    );
    expect(temp.textContent).toBe('22°');
    expect(text.textContent).toBe('Partly Cloudy');
    expect(icon.querySelector('svg')).toBeTruthy();
  });
});
