/** @type {Record<number, { condition: string, icon: string }>} */
export const WMO_CONDITIONS = {
  0: { condition: 'Clear', icon: 'clear' },
  1: { condition: 'Mainly Clear', icon: 'clear' },
  2: { condition: 'Partly Cloudy', icon: 'partly-cloudy' },
  3: { condition: 'Overcast', icon: 'cloudy' },
  45: { condition: 'Fog', icon: 'fog' },
  48: { condition: 'Fog', icon: 'fog' },
  51: { condition: 'Drizzle', icon: 'drizzle' },
  53: { condition: 'Drizzle', icon: 'drizzle' },
  55: { condition: 'Drizzle', icon: 'drizzle' },
  61: { condition: 'Rain', icon: 'rain' },
  63: { condition: 'Rain', icon: 'rain' },
  65: { condition: 'Heavy Rain', icon: 'heavy-rain' },
  71: { condition: 'Snow', icon: 'snow' },
  73: { condition: 'Snow', icon: 'snow' },
  75: { condition: 'Heavy Snow', icon: 'snow' },
  80: { condition: 'Showers', icon: 'showers' },
  81: { condition: 'Showers', icon: 'showers' },
  82: { condition: 'Heavy Showers', icon: 'heavy-rain' },
  95: { condition: 'Thunderstorm', icon: 'thunderstorm' },
  96: { condition: 'Thunderstorm', icon: 'thunderstorm' },
  99: { condition: 'Thunderstorm', icon: 'thunderstorm' }
};

/**
 * @param {number | null | undefined} code
 */
export function mapWeatherCode(code) {
  return WMO_CONDITIONS[Number(code)] ?? { condition: 'Weather', icon: 'cloudy' };
}
