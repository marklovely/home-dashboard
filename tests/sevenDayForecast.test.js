import { describe, expect, it } from 'vitest';
import {
  computeWeekTemperatureSpan,
  dailyBarStyle,
  renderSevenDayForecast
} from '../src/weather/renderSevenDayForecast.js';

const sampleDaily = [
  { date: '1', label: 'Today', condition: 'Clear', icon: 'clear', high: 29, low: 15, rainChance: 0 },
  { date: '2', label: 'Tomorrow', condition: 'Cloudy', icon: 'cloudy', high: 24, low: 14, rainChance: 31 }
];

describe('seven day forecast UI', () => {
  it('computes week temperature span for bars', () => {
    expect(computeWeekTemperatureSpan(sampleDaily)).toEqual({
      weekMin: 14,
      weekMax: 29,
      span: 15
    });
  });

  it('positions bar fill between low and high', () => {
    const { weekMin, span } = computeWeekTemperatureSpan(sampleDaily);
    const style = dailyBarStyle(sampleDaily[0], weekMin, span);
    expect(style.start).toBeCloseTo(((15 - 14) / 15) * 100, 1);
    expect(style.width).toBeGreaterThan(0);
  });

  it('renders Apple-style row with icon, temps, and bar', () => {
    const section = renderSevenDayForecast(sampleDaily, 22);
    const row = section.querySelector('.weather-daily-row');
    expect(row?.querySelector('.weather-daily-label')?.textContent).toBe('Today');
    expect(row?.querySelector('.weather-daily-low')?.textContent).toBe('15°');
    expect(row?.querySelector('.weather-daily-high')?.textContent).toBe('29°');
    expect(row?.querySelector('.weather-daily-bar-fill')).toBeTruthy();
    expect(row?.querySelector('.weather-daily-bar-marker')).toBeTruthy();
    expect(row?.querySelector('svg')).toBeTruthy();
  });
});
