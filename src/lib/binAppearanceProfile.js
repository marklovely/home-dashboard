import { getSiteProfileState } from '../services/siteProfileService.js';

/** @typedef {'rubbish' | 'recycling' | 'gardenWaste'} BinAppearanceTypeId */

/** @typedef {{ id: string, label: string, hex: string }} BinColorPreset */

/** @type {BinColorPreset[]} */
export const BIN_COLOR_PRESETS = [
  { id: 'green', label: 'Green', hex: '#28d17c' },
  { id: 'black', label: 'Black', hex: '#2d2d2d' },
  { id: 'brown', label: 'Brown', hex: '#a67c52' },
  { id: 'blue', label: 'Blue', hex: '#3b82f6' },
  { id: 'grey', label: 'Grey', hex: '#6b7280' },
  { id: 'red', label: 'Red', hex: '#dc2626' },
  { id: 'purple', label: 'Purple', hex: '#9333ea' },
  { id: 'yellow', label: 'Yellow', hex: '#eab308' }
];

/** @type {Record<BinAppearanceTypeId, string>} */
export const DEFAULT_BIN_COLOR_IDS = {
  rubbish: 'green',
  recycling: 'black',
  gardenWaste: 'brown'
};

/**
 * @param {unknown} value
 * @returns {Record<BinAppearanceTypeId, string>}
 */
export function normalizeBinColors(value) {
  const raw = value && typeof value === 'object' ? /** @type {Record<string, unknown>} */ (value) : {};
  /** @type {Record<BinAppearanceTypeId, string>} */
  const colors = { ...DEFAULT_BIN_COLOR_IDS };

  for (const typeId of /** @type {BinAppearanceTypeId[]} */ (['rubbish', 'recycling', 'gardenWaste'])) {
    const preset = resolveBinColorPreset(raw[typeId]);
    if (preset) colors[typeId] = preset.id;
  }

  return colors;
}

/**
 * @param {unknown} colorId
 * @returns {BinColorPreset | null}
 */
export function resolveBinColorPreset(colorId) {
  const id = String(colorId ?? '')
    .trim()
    .toLowerCase();
  if (!id) return null;
  return BIN_COLOR_PRESETS.find((preset) => preset.id === id) ?? null;
}

/**
 * @param {BinAppearanceTypeId} typeId
 * @param {Record<BinAppearanceTypeId, string>} [binColors]
 */
export function getBinColorPresetForType(typeId, binColors = DEFAULT_BIN_COLOR_IDS) {
  return resolveBinColorPreset(binColors[typeId]) ?? resolveBinColorPreset(DEFAULT_BIN_COLOR_IDS[typeId]);
}

/**
 * @param {BinAppearanceTypeId} typeId
 * @param {Record<BinAppearanceTypeId, string>} [binColors]
 */
export function getBinDescriptionForType(typeId, binColors = DEFAULT_BIN_COLOR_IDS) {
  const preset = getBinColorPresetForType(typeId, binColors);
  const colorLabel = preset?.label ?? 'Bin';
  if (typeId === 'recycling') {
    return `${colorLabel} wheelie bin + glass box`;
  }
  return `${colorLabel} wheelie bin`;
}

/**
 * @typedef {Object} BinAppearance
 * @property {BinAppearanceTypeId} typeId
 * @property {string} colorId
 * @property {string} colorLabel
 * @property {string} hex
 * @property {string} description
 * @property {string} label Short label with colour for cards
 */

/**
 * @param {BinAppearanceTypeId} typeId
 * @param {import('./binScheduleProfile.js').BinScheduleProfile | Record<string, unknown> | null | undefined} [schedule]
 * @returns {BinAppearance}
 */
export function getBinAppearance(typeId, schedule) {
  /** @type {Record<BinAppearanceTypeId, string>} */
  let binColors = { ...DEFAULT_BIN_COLOR_IDS };

  if (schedule && typeof schedule === 'object') {
    if ('binColors' in schedule) {
      binColors = normalizeBinColors(schedule.binColors);
    } else if ('binSchedule' in schedule) {
      const nested = /** @type {{ binColors?: unknown }} */ (schedule.binSchedule);
      binColors = normalizeBinColors(nested?.binColors);
    }
  } else {
    const profile = getSiteProfileState()?.profile;
    if (profile && typeof profile === 'object' && 'binSchedule' in profile) {
      binColors = normalizeBinColors(/** @type {{ binColors?: unknown }} */ (profile.binSchedule).binColors);
    }
  }

  const preset = getBinColorPresetForType(typeId, binColors);
  const colorLabel = preset?.label ?? 'Bin';
  const hex = preset?.hex ?? '#28d17c';
  const description = getBinDescriptionForType(typeId, binColors);

  return {
    typeId,
    colorId: preset?.id ?? DEFAULT_BIN_COLOR_IDS[typeId],
    colorLabel,
    hex,
    description,
    label: description
  };
}

/**
 * @param {HTMLElement | null | undefined} element
 * @param {string} hex
 */
export function applyBinAccentStyles(element, hex) {
  if (!element || !hex) return;
  element.style.setProperty('--bin-accent', hex);
  element.dataset.binAccent = hex;
}
