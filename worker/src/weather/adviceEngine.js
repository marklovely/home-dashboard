/**
 * @typedef {Object} WeatherAdviceItem
 * @property {string} icon
 * @property {string} title
 * @property {string} detail
 */

/**
 * @param {import('./weatherTypes.js').DashboardWeatherPayload} weather
 * @returns {WeatherAdviceItem[]}
 */
export function generateWeatherAdvice(weather) {
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
      title: 'Rain expected this afternoon.',
      detail: 'Consider walking Scooter earlier.'
    });
  } else if (rainChance <= 15 && !upcomingHours.some((h) => (h.rainChance ?? 0) > 30)) {
    advice.push({
      icon: 'garden',
      title: 'Dry weather today.',
      detail: 'Good opportunity for gardening.'
    });
  }

  if (Number.isFinite(high) && high >= 28) {
    advice.push({
      icon: 'dog',
      title: 'Very warm today.',
      detail: 'Early morning or evening walks are recommended.'
    });
  }

  if (Number.isFinite(low) && low <= 2) {
    advice.push({
      icon: 'cold',
      title: 'Cold overnight.',
      detail: 'Check outdoor taps.'
    });
  }

  if (wind >= 25) {
    advice.push({
      icon: 'wind',
      title: 'Strong winds expected.',
      detail: 'Secure lightweight garden furniture.'
    });
  }

  if (uv >= 6) {
    advice.push({
      icon: 'sun',
      title: 'High UV today.',
      detail: 'Consider sunscreen if spending time outdoors.'
    });
  }

  if (advice.length === 0) {
    advice.push({
      icon: 'home',
      title: 'Enjoy the day.',
      detail: 'Conditions look comfortable at home.'
    });
  }

  return advice.slice(0, 4);
}

/**
 * @param {import('./weatherTypes.js').DashboardWeatherPayload} weather
 * @returns {{ label: string, icon: string } | null}
 */
export function buildDashboardAlert(weather) {
  const high = weather.today?.high ?? weather.daily[0]?.high;
  if (Number.isFinite(high) && high >= 28) {
    return { label: 'High Heat Today', icon: 'sun' };
  }

  const now = Date.now();
  for (const hour of weather.hourly) {
    const time = Date.parse(hour.time);
    if (!Number.isFinite(time) || time < now) continue;
    const hoursAway = (time - now) / (60 * 60 * 1000);
    if (hoursAway > 6) break;
    if ((hour.rainChance ?? 0) >= 50) {
      const rounded = Math.max(1, Math.round(hoursAway));
      return { label: `Rain in ${rounded} hour${rounded === 1 ? '' : 's'}`, icon: 'rain' };
    }
  }
  return null;
}
