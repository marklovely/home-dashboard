const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/**
 * @param {number | null | undefined} degrees
 */
export function degreesToCompass(degrees) {
  if (!Number.isFinite(degrees)) return '';
  const index = Math.round(((degrees % 360) / 45)) % 8;
  return COMPASS[index];
}
