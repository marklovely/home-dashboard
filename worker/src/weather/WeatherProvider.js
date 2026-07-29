/**
 * @typedef {Object} WeatherProviderConfig
 * @property {number} latitude
 * @property {number} longitude
 */

/**
 * @typedef {Object} WeatherProvider
 * @property {(fetchImpl?: typeof fetch) => Promise<unknown>} fetchRawForecast
 */

/**
 * @param {WeatherProvider} provider
 * @param {typeof fetch} [fetchImpl]
 */
export async function fetchWeatherFromProvider(provider, fetchImpl = fetch) {
  return provider.fetchRawForecast(fetchImpl);
}
