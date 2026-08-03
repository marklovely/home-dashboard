import { geocodeWeatherLocation } from '../api/weatherApi.js';
import { normalizePropertyAddress } from '../lib/propertyAddress.js';
import { setWeatherLocationOverride } from './weatherLocationService.js';

/**
 * Build a geocode query from a structured property address (postcode preferred).
 * @param {import('../lib/propertyAddress.js').PropertyAddress | Record<string, unknown> | null | undefined} propertyAddress
 */
export function buildWeatherGeocodeQuery(propertyAddress) {
  const address = normalizePropertyAddress(propertyAddress);
  if (address.postcode) return address.postcode;
  const parts = [address.line1, address.city, address.county, address.country].filter(Boolean);
  return parts.join(', ');
}

/**
 * Set tablet weather location from the hub property address (wizard / Settings).
 * @param {import('../lib/propertyAddress.js').PropertyAddress | Record<string, unknown> | null | undefined} propertyAddress
 * @param {typeof fetch} [fetchImpl]
 */
export async function syncWeatherLocationFromPropertyAddress(propertyAddress, fetchImpl = fetch) {
  const query = buildWeatherGeocodeQuery(propertyAddress);
  if (!query) {
    return { ok: false, skipped: true, message: 'No postcode or address to look up.' };
  }

  const result = await geocodeWeatherLocation(query, fetchImpl);
  if (!result.ok) {
    return { ok: false, skipped: false, message: result.message || 'Could not look up weather location.' };
  }

  const match = result.results[0];
  if (!match) {
    return { ok: false, skipped: false, message: 'No matching location for that postcode.' };
  }

  setWeatherLocationOverride({
    latitude: match.latitude,
    longitude: match.longitude,
    label: match.label,
    detail: match.detail ?? null
  });

  return { ok: true, skipped: false, label: match.label };
}
