import { describe, expect, it, vi, beforeEach } from 'vitest';
import { generateWeatherAdvice, buildDashboardAlert } from '../src/weather/adviceEngine.js';
import { mapOpenMeteoToDashboard } from '../src/weather/mapOpenMeteo.js';
import {
  getHomeWeather,
  resetWeatherCacheForTests,
  WEATHER_CACHE_TTL_MS
} from '../src/weather/weatherService.js';
import { setWeatherCache } from '../src/weather/weatherCache.js';
import { SAMPLE_AIR_QUALITY, SAMPLE_OPEN_METEO_FORECAST } from './fixtures/openMeteoSample.js';
import { handleRequest } from '../src/index.js';

const env = {
  HOME_LATITUDE: '50.88',
  HOME_LONGITUDE: '-1.03',
  ALLOWED_ORIGINS: 'http://localhost:5173'
};

beforeEach(() => {
  resetWeatherCacheForTests();
});

describe('weather mapping', () => {
  it('maps Open-Meteo data into dashboard shape', () => {
    const payload = mapOpenMeteoToDashboard(SAMPLE_OPEN_METEO_FORECAST, SAMPLE_AIR_QUALITY, {
      fetchedAt: '2026-07-29T09:00:00.000Z',
      fromCache: false,
      stale: false
    });
    expect(payload.current.temperature).toBe(22);
    expect(payload.current.condition).toBe('Partly Cloudy');
    expect(payload.current.icon).toBe('partly-cloudy');
    expect(payload.current.airQuality).toBe('Good');
    expect(payload.today.high).toBe(25);
    expect(payload.hourly).toHaveLength(4);
    expect(payload.daily).toHaveLength(7);
    expect(payload.advice.length).toBeGreaterThan(0);
  });
});

describe('weather advice audiences', () => {
  it('uses Scooter-focused copy for house sitters', () => {
    const payload = mapOpenMeteoToDashboard(SAMPLE_OPEN_METEO_FORECAST, null, {
      fetchedAt: new Date().toISOString(),
      fromCache: false,
      stale: false
    });
    payload.today.rainChance = 5;
    payload.hourly = payload.hourly.map((hour) => ({ ...hour, rainChance: 5 }));
    const advice = generateWeatherAdvice(payload, 'house-sitter');
    expect(advice.some((item) => /Scooter/i.test(item.detail))).toBe(true);
    expect(advice.some((item) => /gardening/i.test(item.detail))).toBe(false);
  });

  it('keeps owner gardening tips for dry days', () => {
    const payload = mapOpenMeteoToDashboard(SAMPLE_OPEN_METEO_FORECAST, null, {
      fetchedAt: new Date().toISOString(),
      fromCache: false,
      stale: false
    });
    payload.today.rainChance = 5;
    payload.hourly = payload.hourly.map((hour) => ({ ...hour, rainChance: 5 }));
    const advice = generateWeatherAdvice(payload, 'owner');
    expect(advice.some((item) => /gardening/i.test(item.detail))).toBe(true);
  });
});

describe('dashboard alerts', () => {
  it('builds dashboard rain alert from hourly forecast', () => {
    const payload = mapOpenMeteoToDashboard(SAMPLE_OPEN_METEO_FORECAST, null, {
      fetchedAt: new Date().toISOString(),
      fromCache: false,
      stale: false
    });
    payload.hourly = payload.hourly.map((hour, index) => ({
      ...hour,
      time: new Date(Date.now() + (index + 1) * 60 * 60 * 1000).toISOString(),
      rainChance: index === 0 ? 70 : 5
    }));
    const alert = buildDashboardAlert(payload);
    expect(alert?.label).toMatch(/Rain in/);
  });
});

describe('weather cache and service', () => {
  it('serves cached payload without calling upstream', async () => {
    const cached = mapOpenMeteoToDashboard(SAMPLE_OPEN_METEO_FORECAST, SAMPLE_AIR_QUALITY, {
      fetchedAt: new Date().toISOString(),
      fromCache: true,
      stale: false
    });
    setWeatherCache(cached, WEATHER_CACHE_TTL_MS);
    const fetchImpl = vi.fn();
    const result = await getHomeWeather(env, fetchImpl);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.status).toBe(200);
    expect(result.body.current.temperature).toBe(22);
    expect(result.body.meta.fromCache).toBe(true);
  });

  it('returns stale cache when upstream fails', async () => {
    const cached = mapOpenMeteoToDashboard(SAMPLE_OPEN_METEO_FORECAST, SAMPLE_AIR_QUALITY, {
      fetchedAt: new Date().toISOString(),
      fromCache: true,
      stale: false
    });
    setWeatherCache(cached, 1);
    await new Promise((resolve) => setTimeout(resolve, 5));
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network'));
    const result = await getHomeWeather(env, fetchImpl);
    expect(result.status).toBe(200);
    expect(result.body.meta.stale).toBe(true);
  });

  it('returns 503 when upstream fails and no cache exists', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network'));
    const result = await getHomeWeather(env, fetchImpl);
    expect(result.status).toBe(503);
  });
});

describe('GET /api/weather', () => {
  it('returns mapped weather JSON', async () => {
    const fetchImpl = vi.fn(async (url) => {
      if (String(url).includes('air-quality')) {
        return new Response(JSON.stringify(SAMPLE_AIR_QUALITY), { status: 200 });
      }
      return new Response(JSON.stringify(SAMPLE_OPEN_METEO_FORECAST), { status: 200 });
    });
    const response = await handleRequest(
      new Request('https://worker.test/api/weather', { method: 'GET' }),
      env,
      fetchImpl
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.current.temperature).toBe(22);
    expect(JSON.stringify(body)).not.toContain('open-meteo');
  });
});
