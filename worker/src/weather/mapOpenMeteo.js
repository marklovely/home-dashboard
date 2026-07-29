import { mapWeatherCode } from './wmoCodes.js';
import { degreesToCompass } from './wind.js';
import { buildDashboardAlert, generateWeatherAdvice } from './adviceEngine.js';

/**
 * @param {string | undefined} iso
 */
function formatClockTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/**
 * @param {string} iso
 * @param {number} index
 */
function dayLabel(iso, index) {
  if (index === 0) return 'Today';
  if (index === 1) return 'Tomorrow';
  const date = new Date(iso);
  return date.toLocaleDateString('en-GB', { weekday: 'short' });
}

/**
 * @param {number | null | undefined} value
 */
function roundTemp(value) {
  return Number.isFinite(value) ? Math.round(Number(value)) : 0;
}

/**
 * @param {number | null | undefined} aqi
 */
function describeAirQuality(aqi) {
  if (!Number.isFinite(aqi)) return 'Unknown';
  if (aqi <= 20) return 'Good';
  if (aqi <= 40) return 'Fair';
  if (aqi <= 60) return 'Moderate';
  if (aqi <= 80) return 'Poor';
  return 'Very Poor';
}

/**
 * @param {Record<string, unknown>} forecast
 * @param {Record<string, unknown> | null} airQuality
 * @param {{ fetchedAt: string, fromCache: boolean, stale: boolean }} meta
 */
export function mapOpenMeteoToDashboard(forecast, airQuality, meta) {
  const currentBlock = /** @type {Record<string, unknown>} */ (forecast.current ?? {});
  const hourlyBlock = /** @type {Record<string, unknown[]>} */ (forecast.hourly ?? {});
  const dailyBlock = /** @type {Record<string, unknown[]>} */ (forecast.daily ?? {});

  const currentMapped = mapWeatherCode(/** @type {number} */ (currentBlock.weather_code));

  /** @type {import('./weatherTypes.js').DashboardWeatherPayload} */
  const payload = {
    current: {
      temperature: roundTemp(currentBlock.temperature_2m),
      feelsLike: roundTemp(currentBlock.apparent_temperature),
      condition: currentMapped.condition,
      icon: currentMapped.icon,
      windSpeed: roundTemp(currentBlock.wind_speed_10m),
      windDirection: degreesToCompass(/** @type {number} */ (currentBlock.wind_direction_10m)),
      humidity: roundTemp(currentBlock.relative_humidity_2m),
      uvIndex: roundTemp(currentBlock.uv_index),
      airQuality: describeAirQuality(
        airQuality &&
          typeof airQuality === 'object' &&
          airQuality.current &&
          typeof airQuality.current === 'object'
          ? /** @type {{ european_aqi?: number }} */ (airQuality.current).european_aqi
          : undefined
      )
    },
    today: {
      high: roundTemp(dailyBlock.temperature_2m_max?.[0]),
      low: roundTemp(dailyBlock.temperature_2m_min?.[0]),
      rainChance: roundTemp(dailyBlock.precipitation_probability_max?.[0]),
      sunrise: formatClockTime(/** @type {string} */ (dailyBlock.sunrise?.[0])),
      sunset: formatClockTime(/** @type {string} */ (dailyBlock.sunset?.[0]))
    },
    hourly: [],
    daily: [],
    advice: [],
    dashboardAlert: null,
    meta
  };

  const hourlyTimes = /** @type {string[]} */ (hourlyBlock.time ?? []);
  for (let index = 0; index < hourlyTimes.length && index < 24; index += 1) {
    const mapped = mapWeatherCode(/** @type {number} */ (hourlyBlock.weather_code?.[index]));
    payload.hourly.push({
      time: hourlyTimes[index],
      label: formatClockTime(hourlyTimes[index]),
      temperature: roundTemp(hourlyBlock.temperature_2m?.[index]),
      condition: mapped.condition,
      icon: mapped.icon,
      rainChance: roundTemp(hourlyBlock.precipitation_probability?.[index]),
      windSpeed: roundTemp(hourlyBlock.wind_speed_10m?.[index])
    });
  }

  const dailyTimes = /** @type {string[]} */ (dailyBlock.time ?? []);
  for (let index = 0; index < dailyTimes.length && index < 7; index += 1) {
    const mapped = mapWeatherCode(/** @type {number} */ (dailyBlock.weather_code?.[index]));
    payload.daily.push({
      date: dailyTimes[index],
      label: dayLabel(dailyTimes[index], index),
      condition: mapped.condition,
      icon: mapped.icon,
      high: roundTemp(dailyBlock.temperature_2m_max?.[index]),
      low: roundTemp(dailyBlock.temperature_2m_min?.[index]),
      rainChance: roundTemp(dailyBlock.precipitation_probability_max?.[index])
    });
  }

  payload.advice = generateWeatherAdvice(payload, 'owner');
  payload.dashboardAlert = buildDashboardAlert(payload, 'owner');
  return payload;
}
