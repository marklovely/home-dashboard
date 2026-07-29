import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Flower2,
  Home,
  Sun,
  ThermometerSun,
  Wind,
  createElement
} from 'lucide';

/** @type {Record<string, import('lucide').IconNode>} */
const WEATHER_ICON_NODES = {
  clear: Sun,
  'partly-cloudy': CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  'heavy-rain': CloudRain,
  showers: CloudDrizzle,
  snow: CloudSnow,
  thunderstorm: CloudLightning,
  sun: Sun,
  dog: ThermometerSun,
  garden: Flower2,
  cold: CloudSnow,
  wind: Wind,
  home: Home
};

/**
 * @param {string} iconId
 * @param {{ size?: number, className?: string }} [options]
 */
export function renderWeatherIcon(iconId, options = {}) {
  const { size = 28, className = '' } = options;
  const node = WEATHER_ICON_NODES[iconId] ?? CloudSun;
  const svg = createElement(node, {
    width: size,
    height: size,
    'stroke-width': 1.75,
    class: className
  });
  svg.setAttribute('aria-hidden', 'true');
  return svg;
}
