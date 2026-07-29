/** @type {Record<string, unknown>} */
export const SAMPLE_OPEN_METEO_FORECAST = {
  current: {
    temperature_2m: 22.1,
    apparent_temperature: 24.2,
    weather_code: 2,
    wind_speed_10m: 12.4,
    wind_direction_10m: 225,
    relative_humidity_2m: 63,
    uv_index: 5.2
  },
  hourly: {
    time: ['2026-07-29T09:00', '2026-07-29T12:00', '2026-07-29T15:00', '2026-07-29T18:00'],
    temperature_2m: [21, 23, 22, 19],
    weather_code: [0, 2, 61, 61],
    precipitation_probability: [5, 10, 70, 80],
    wind_speed_10m: [8, 10, 14, 18]
  },
  daily: {
    time: ['2026-07-29', '2026-07-30', '2026-07-31', '2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04'],
    weather_code: [2, 61, 3, 0, 0, 2, 80],
    temperature_2m_max: [25, 24, 23, 27, 29, 26, 22],
    temperature_2m_min: [16, 15, 14, 16, 18, 17, 15],
    precipitation_probability_max: [20, 55, 10, 5, 5, 15, 60],
    sunrise: ['2026-07-29T05:18', '2026-07-30T05:19'],
    sunset: ['2026-07-29T21:03', '2026-07-30T21:02']
  }
};

export const SAMPLE_AIR_QUALITY = {
  current: { european_aqi: 18 }
};
