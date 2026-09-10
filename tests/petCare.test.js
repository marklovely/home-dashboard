import { describe, expect, it } from 'vitest';
import {
  formatPetNames,
  normalizePetCare,
  primaryPet
} from '../src/lib/petCare.js';

describe('petCare', () => {
  it('normalizes empty profile', () => {
    expect(normalizePetCare(null)).toEqual({ hasPets: false, pets: [] });
  });

  it('migrates legacy single pet fields', () => {
    const migrated = normalizePetCare({
      hasPets: true,
      name: 'Scooter',
      species: 'Labrador'
    });
    expect(migrated.hasPets).toBe(true);
    expect(migrated.pets).toHaveLength(1);
    expect(migrated.pets[0].name).toBe('Scooter');
    expect(migrated.pets[0].id).toBe('legacy');
  });

  it('formats one, two, and many pet names', () => {
    expect(formatPetNames({ hasPets: true, pets: [{ id: '1', name: 'Bailey' }] })).toBe('Bailey');
    expect(
      formatPetNames({
        hasPets: true,
        pets: [
          { id: '1', name: 'Bailey' },
          { id: '2', name: 'Milo' }
        ]
      })
    ).toBe('Bailey and Milo');
    expect(
      formatPetNames({
        hasPets: true,
        pets: [
          { id: '1', name: 'Bailey' },
          { id: '2', name: 'Milo' },
          { id: '3', name: 'Pip' }
        ]
      })
    ).toBe('Bailey, Milo, and Pip');
  });

  it('returns primary pet', () => {
    const normalized = normalizePetCare({
      hasPets: true,
      pets: [{ id: 'a', name: 'First' }, { id: 'b', name: 'Second' }]
    });
    expect(primaryPet(normalized)?.name).toBe('First');
  });
});
