import { describe, expect, it } from 'vitest';
import { getFallbackGuideCatalog } from '../src/content/houseguide/providers/jsonGuideProvider.js';
import { buildStarterGuideCatalog } from '../src/content/houseguide/templates/buildStarterGuideCatalog.js';

describe('buildStarterGuideCatalog', () => {
  it('removes pets when sitter flow has no pets', () => {
    const catalog = buildStarterGuideCatalog('housesitter', {
      petCare: { hasPets: false }
    });
    expect(catalog.categories?.some((category) => category.id === 'pets')).toBe(false);
  });

  it('injects pet details from the wizard into the starter guide', () => {
    const catalog = buildStarterGuideCatalog('housesitter', {
      petCare: {
        hasPets: true,
        name: 'Bailey',
        species: 'Labrador',
        age: '4',
        feeding: 'Morning: 1 scoop\nEvening: 1 scoop',
        vet: 'Town Vet',
        vetPhone: '01234 567890'
      }
    });
    const pets = catalog.categories?.find((category) => category.id === 'pets');
    expect(pets?.title).toBe('Bailey');
    const feeding = pets?.topics?.find((topic) => topic.id === 'pet-feeding');
    const stepsBlock = feeding?.blocks?.find((block) => block.type === 'steps');
    expect(stepsBlock?.steps).toEqual(['Morning: 1 scoop', 'Evening: 1 scoop']);
  });

  it('never includes Rose Cottage Scooter content in generated catalogs', () => {
    const catalog = buildStarterGuideCatalog('housesitter', {
      petCare: { hasPets: true, name: 'Bailey' }
    });
    const serialized = JSON.stringify(catalog);
    expect(serialized).not.toContain('Scooter');
    expect(serialized).not.toContain('Jack Russell');
  });
});

describe('neutral guide fallback', () => {
  it('does not ship Rose Cottage pet content as the default fallback', () => {
    const fallback = getFallbackGuideCatalog();
    const serialized = JSON.stringify(fallback);
    expect(serialized).not.toContain('Scooter');
    expect(fallback.categories?.some((category) => category.id === 'scooter')).toBe(false);
  });
});
