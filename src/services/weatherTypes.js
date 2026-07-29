/**
 * @typedef {Object} WeatherCurrent
 * @property {number} temperature
 * @property {number} feelsLike
 * @property {string} condition
 * @property {string} icon
 * @property {number} windSpeed
 * @property {string} windDirection
 * @property {number} humidity
 * @property {number} uvIndex
 * @property {string} airQuality
 */

/**
 * @typedef {Object} WeatherToday
 * @property {number} high
 * @property {number} low
 * @property {number} rainChance
 * @property {string} sunrise
 * @property {string} sunset
 */

/**
 * @typedef {Object} WeatherHourly
 * @property {string} time
 * @property {string} label
 * @property {number} temperature
 * @property {string} condition
 * @property {string} icon
 * @property {number} rainChance
 * @property {number} windSpeed
 */

/**
 * @typedef {Object} WeatherDaily
 * @property {string} date
 * @property {string} label
 * @property {string} condition
 * @property {string} icon
 * @property {number} high
 * @property {number} low
 * @property {number} rainChance
 */

/**
 * @typedef {Object} WeatherAdvice
 * @property {string} icon
 * @property {string} title
 * @property {string} detail
 */

/**
 * @typedef {Object} DashboardWeather
 * @property {WeatherCurrent} current
 * @property {WeatherToday} today
 * @property {WeatherHourly[]} hourly
 * @property {WeatherDaily[]} daily
 * @property {WeatherAdvice[]} advice
 * @property {{ label: string, icon: string } | null} dashboardAlert
 * @property {{ updatedAt: string, fromCache: boolean, stale: boolean }} meta
 */

export {};
