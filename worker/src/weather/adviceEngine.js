/**
 * @typedef {Object} WeatherAdviceItem
 * @property {string} icon
 * @property {string} title
 * @property {string} detail
 */

/** @typedef {'owner' | 'house-sitter'} WeatherAdviceAudience */

/**
 * @param {import('./weatherTypes.js').DashboardWeatherPayload} weather
 * @param {WeatherAdviceAudience} [audience]
 * @returns {WeatherAdviceItem[]}
 */
export function generateWeatherAdvice(weather, audience = 'owner') {
  const houseSitter = audience === 'house-sitter';
  /** @type {WeatherAdviceItem[]} */
  const advice = [];
  const { current, today, hourly, daily } = weather;

  const high = today?.high ?? daily[0]?.high;
  const low = today?.low ?? daily[0]?.low;
  const rainChance = today?.rainChance ?? 0;
  const uv = current?.uvIndex ?? 0;
  const wind = current?.windSpeed ?? 0;

  const now = Date.now();
  const upcomingHours = hourly.filter((hour) => {
    const time = Date.parse(hour.time);
    return Number.isFinite(time) && time >= now && time <= now + 6 * 60 * 60 * 1000;
  });

  const heavyRainSoon = upcomingHours.some(
    (hour) => (hour.rainChance ?? 0) >= 60 && ['rain', 'heavy-rain', 'showers', 'thunderstorm'].includes(hour.icon)
  );
  const afternoonRain = hourly.some((hour) => {
    const date = new Date(hour.time);
    const hourOfDay = date.getHours();
    return hourOfDay >= 12 && hourOfDay <= 18 && (hour.rainChance ?? 0) >= 50;
  });

  if (heavyRainSoon || afternoonRain || rainChance >= 60) {
    advice.push({
      icon: 'rain',
      title: houseSitter ? 'Rain expected later today.' : 'Rain expected this afternoon.',
      detail: houseSitter
        ? 'Walk Scooter before it starts — towel him off if he gets wet.'
        : 'Consider walking Scooter earlier.'
    });
  } else if (rainChance <= 15 && !upcomingHours.some((h) => (h.rainChance ?? 0) > 30)) {
    advice.push(
      houseSitter
        ? {
            icon: 'dog',
            title: 'Dry weather today.',
            detail: 'A good day for Scooter’s usual walks — bring water if you stay out long.'
          }
        : {
            icon: 'garden',
            title: 'Dry weather today.',
            detail: 'Good opportunity for gardening.'
          }
    );
  }

  if (Number.isFinite(high) && high >= 28) {
    advice.push({
      icon: 'dog',
      title: houseSitter ? 'Very warm for Scooter.' : 'Very warm today.',
      detail: houseSitter
        ? 'Walk early or late, stick to shade, and offer plenty of water.'
        : 'Early morning or evening walks are recommended.'
    });
  }

  if (Number.isFinite(low) && low <= 2) {
    advice.push(
      houseSitter
        ? {
            icon: 'cold',
            title: 'Cold overnight.',
            detail: 'Keep Scooter’s evening walk brief and dry him off when you come in.'
          }
        : {
            icon: 'cold',
            title: 'Cold overnight.',
            detail: 'Check outdoor taps.'
          }
    );
  }

  if (wind >= 25) {
    advice.push(
      houseSitter
        ? {
            icon: 'wind',
            title: 'Windy today.',
            detail: 'Keep Scooter on a lead in open areas — gusts can unsettle smaller dogs.'
          }
        : {
            icon: 'wind',
            title: 'Strong winds expected.',
            detail: 'Secure lightweight garden furniture.'
          }
    );
  }

  if (uv >= 6) {
    advice.push({
      icon: 'sun',
      title: 'High UV today.',
      detail: houseSitter
        ? 'Use sunscreen on walks with Scooter and favour shady routes.'
        : 'Consider sunscreen if spending time outdoors.'
    });
  }

  if (advice.length === 0) {
    advice.push(
      houseSitter
        ? {
            icon: 'dog',
            title: 'Comfortable for Scooter.',
            detail: 'Routine walks and garden time should be fine today.'
          }
        : {
            icon: 'home',
            title: 'Enjoy the day.',
            detail: 'Conditions look comfortable at home.'
          }
    );
  }

  return advice.slice(0, 4);
}

/**
 * @param {import('./weatherTypes.js').DashboardWeatherPayload} weather
 * @param {WeatherAdviceAudience} [audience]
 * @returns {{ label: string, icon: string } | null}
 */
export function buildDashboardAlert(weather, audience = 'owner') {
  const high = weather.today?.high ?? weather.daily[0]?.high;
  if (Number.isFinite(high) && high >= 28) {
    return {
      label: audience === 'house-sitter' ? 'Hot day — care for Scooter' : 'High Heat Today',
      icon: 'sun'
    };
  }

  const now = Date.now();
  for (const hour of weather.hourly) {
    const time = Date.parse(hour.time);
    if (!Number.isFinite(time) || time < now) continue;
    const hoursAway = (time - now) / (60 * 60 * 1000);
    if (hoursAway > 6) break;
    if ((hour.rainChance ?? 0) >= 50) {
      const rounded = Math.max(1, Math.round(hoursAway));
      const rainLabel = `Rain in ${rounded} hour${rounded === 1 ? '' : 's'}`;
      return {
        label: audience === 'house-sitter' ? `${rainLabel} — plan Scooter’s walk` : rainLabel,
        icon: 'rain'
      };
    }
  }
  return null;
}

/**
 * @param {import('./weatherTypes.js').DashboardWeatherPayload} payload
 * @param {WeatherAdviceAudience} audience
 */
export function applyWeatherAudience(payload, audience) {
  return {
    ...payload,
    advice: generateWeatherAdvice(payload, audience),
    dashboardAlert: buildDashboardAlert(payload, audience)
  };
}

/**
 * @param {string | null | undefined} value
 * @returns {WeatherAdviceAudience}
 */
export function parseWeatherAudience(value) {
  return value === 'house-sitter' ? 'house-sitter' : 'owner';
}
