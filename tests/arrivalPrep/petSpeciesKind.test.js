import { describe, expect, it } from 'vitest';
import { detectPetSpeciesModule } from '../../src/lib/arrivalPrep/petSpeciesKind.js';

describe('detectPetSpeciesModule', () => {
  it('detects dogs', () => {
    expect(detectPetSpeciesModule('Labrador')).toBe('pet-dog');
  });

  it('detects cats', () => {
    expect(detectPetSpeciesModule('Tabby cat')).toBe('pet-cat');
  });

  it('detects small animals', () => {
    expect(detectPetSpeciesModule('Guinea pig')).toBe('pet-small');
  });

  it('falls back to generic', () => {
    expect(detectPetSpeciesModule('')).toBe('pet-generic');
    expect(detectPetSpeciesModule('Iguana')).toBe('pet-generic');
  });
});
