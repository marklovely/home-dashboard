import {
  BookOpen,
  Calendar,
  Clapperboard,
  ChefHat,
  CloudSun,
  Cross,
  Dog,
  Droplets,
  Flame,
  HeartPulse,
  Home,
  KeyRound,
  Lightbulb,
  MapPin,
  Monitor,
  NotebookPen,
  Phone,
  Settings,
  Shield,
  ShowerHead,
  Siren,
  Trash2,
  Trees,
  Wifi,
  Zap,
  createElement
} from 'lucide';

/** @type {Record<string, import('lucide').IconNode>} */
const ICON_NODES = {
  lightbulb: Lightbulb,
  'book-open': BookOpen,
  dog: Dog,
  'cloud-sun': CloudSun,
  'trash-2': Trash2,
  clapperboard: Clapperboard,
  calendar: Calendar,
  settings: Settings,
  'chef-hat': ChefHat,
  monitor: Monitor,
  flame: Flame,
  droplets: Droplets,
  wifi: Wifi,
  siren: Siren,
  'map-pin': MapPin,
  'key-round': KeyRound,
  'shower-head': ShowerHead,
  trees: Trees,
  shield: Shield,
  home: Home,
  phone: Phone,
  'heart-pulse': HeartPulse,
  zap: Zap,
  cross: Cross,
  notebook: NotebookPen
};

/**
 * @param {string} iconId
 * @param {{ size?: number, className?: string }} [options]
 * @returns {SVGElement}
 */
export function renderIcon(iconId, options = {}) {
  const { size = 28, className = '' } = options;
  const node = ICON_NODES[iconId];
  if (!node) {
    const fallback = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    fallback.setAttribute('width', String(size));
    fallback.setAttribute('height', String(size));
    return fallback;
  }
  const svg = createElement(node, {
    width: size,
    height: size,
    'stroke-width': 1.75,
    class: className
  });
  svg.setAttribute('aria-hidden', 'true');
  return svg;
}

export { ICON_NODES };
