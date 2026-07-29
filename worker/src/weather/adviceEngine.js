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
      title: houseSitter ? 'Rain may arrive later today.' : 'Rain may arrive this afternoon.',
      detail: houseSitter
        ? 'An earlier walk with Scooter might stay drier. A towel could help if he gets wet.'
        : 'You might prefer to walk Scooter earlier while it is still dry.'
    });
  } else if (rainChance <= 15 && !upcomingHours.some((h) => (h.rainChance ?? 0) > 30)) {
    advice.push(
      houseSitter
        ? {
            icon: 'dog',
            title: 'It may stay mostly dry today.',
            detail: 'Walks with Scooter could be pleasant; water might be worth bringing on longer outings.'
          }
        : {
            icon: 'garden',
            title: 'It may stay mostly dry today.',
            detail: 'You might find it a good opportunity for gardening if that was already on your mind.'
          }
    );
  }

  if (Number.isFinite(high) && high >= 28) {
    advice.push({
      icon: 'dog',
      title: 'It may feel very warm.',
      detail: houseSitter
        ? 'Shadier times and extra water could help Scooter stay comfortable on walks.'
        : 'Early or late walks with Scooter might feel more comfortable than the middle of the day.'
    });
  }

  if (Number.isFinite(low) && low <= 2) {
    advice.push(
      houseSitter
        ? {
            icon: 'cold',
            title: 'It may turn cold overnight.',
            detail: 'A shorter evening walk might suit Scooter; drying off could help when you come in.'
          }
        : {
            icon: 'cold',
            title: 'It may turn cold overnight.',
            detail: 'Outdoor taps might be worth a glance if frost is a concern.'
          }
    );
  }

  if (wind >= 25) {
    advice.push(
      houseSitter
        ? {
            icon: 'wind',
            title: 'It might be windy.',
            detail: 'Scooter may feel more settled on a lead in open areas if gusts pick up.'
          }
        : {
            icon: 'wind',
            title: 'It might be windy.',
            detail: 'Light garden furniture could shift; you might consider securing it if needed.'
          }
    );
  }

  if (uv >= 6) {
    advice.push({
      icon: 'sun',
      title: 'UV may be high.',
      detail: houseSitter
        ? 'Sunscreen and shadier routes might be worth considering on walks with Scooter.'
        : 'Consider sunscreen if you might spend extended time outdoors.'
    });
  }

  if (advice.length === 0) {
    advice.push(
      houseSitter
        ? {
            icon: 'dog',
            title: 'Conditions may suit Scooter.',
            detail: 'Usual walks and time in the garden could feel comfortable today.'
          }
        : {
            icon: 'home',
            title: 'Comfortable conditions.',
            detail: 'The forecast suggests a pleasant day at home.'
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
      label: audience === 'house-sitter' ? 'Heat may be high today' : 'Heat may be high today',
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
      return {
        label: `Rain might arrive in ${rounded} hour${rounded === 1 ? '' : 's'}`,
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
