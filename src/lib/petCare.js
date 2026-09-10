/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   species: string,
 *   age: string,
 *   temperament: string,
 *   feeding: string,
 *   walks: string,
 *   vet: string,
 *   vetPhone: string,
 *   vetEmergency: string
 * }} PetProfile
 */

/**
 * @typedef {{
 *   hasPets: boolean,
 *   pets: PetProfile[]
 * }} PetCareProfile
 */

/**
 * @returns {string}
 */
export function createPetId() {
  return globalThis.crypto?.randomUUID?.() ?? `pet-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * @returns {PetProfile}
 */
export function emptyPetProfile() {
  return {
    id: createPetId(),
    name: '',
    species: '',
    age: '',
    temperament: '',
    feeding: '',
    walks: '',
    vet: '',
    vetPhone: '',
    vetEmergency: ''
  };
}

/**
 * @param {unknown} entry
 * @returns {PetProfile | null}
 */
function normalizePetEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const record = /** @type {Record<string, unknown>} */ (entry);
  const name = String(record.name ?? '').trim();
  const id = String(record.id ?? '').trim() || createPetId();
  return {
    id,
    name,
    species: String(record.species ?? '').trim(),
    age: String(record.age ?? '').trim(),
    temperament: String(record.temperament ?? '').trim(),
    feeding: String(record.feeding ?? '').trim(),
    walks: String(record.walks ?? '').trim(),
    vet: String(record.vet ?? '').trim(),
    vetPhone: String(record.vetPhone ?? '').trim(),
    vetEmergency: String(record.vetEmergency ?? '').trim()
  };
}

/**
 * Normalise pet care, migrating legacy single-pet fields to `pets[]`.
 * @param {unknown} value
 * @returns {PetCareProfile}
 */
export function normalizePetCare(value) {
  if (!value || typeof value !== 'object') {
    return { hasPets: false, pets: [] };
  }

  const record = /** @type {Record<string, unknown>} */ (value);

  if (Array.isArray(record.pets)) {
    const pets = record.pets.map(normalizePetEntry).filter(Boolean);
    return {
      hasPets: record.hasPets === true && pets.length > 0,
      pets
    };
  }

  const hasPets = record.hasPets === true;
  const legacyName = String(record.name ?? '').trim();
  if (!hasPets || !legacyName) {
    return { hasPets: false, pets: [] };
  }

  const migrated = normalizePetEntry({ id: 'legacy', ...record });
  return migrated ? { hasPets: true, pets: [migrated] } : { hasPets: false, pets: [] };
}

/**
 * @param {PetCareProfile | null | undefined} petCare
 * @returns {PetProfile[]}
 */
export function listPets(petCare) {
  const normalized = normalizePetCare(petCare);
  return normalized.hasPets ? normalized.pets : [];
}

/**
 * @param {PetCareProfile | null | undefined} petCare
 * @returns {string}
 */
export function formatPetNames(petCare, fallback = 'your pet') {
  const names = listPets(petCare)
    .map((pet) => pet.name.trim())
    .filter(Boolean);
  if (names.length === 0) return fallback;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names.at(-1)}`;
}

/**
 * Primary pet for guide copy and labels (first listed pet).
 * @param {PetCareProfile | null | undefined} petCare
 * @returns {PetProfile | null}
 */
export function primaryPet(petCare) {
  return listPets(petCare)[0] ?? null;
}
