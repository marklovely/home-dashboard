import { describe, expect, it, beforeEach } from 'vitest';
import { getFallbackGuideCatalog } from '../src/content/houseguide/providers/jsonGuideProvider.js';
import {
  buildStarterGuideCatalog,
  FREE_STARTER_MAX_CATEGORIES
} from '../src/content/houseguide/templates/buildStarterGuideCatalog.js';
import { setHubPlanFeaturesForTests } from '../src/services/hubPlanFeatures.js';

describe('buildStarterGuideCatalog', () => {
  beforeEach(() => {
    setHubPlanFeaturesForTests(null);
  });

  it('keeps only two starter areas on Free', () => {
    setHubPlanFeaturesForTests({
      plan: 'free',
      planLabel: 'Free',
      features: { bins: false, smartHome: false, weather: true },
      upgradeUrl: 'https://lovely-home.co.uk/account'
    });
    const catalog = buildStarterGuideCatalog('owner', {});
    expect(catalog.categories).toHaveLength(FREE_STARTER_MAX_CATEGORIES);
    expect(catalog.categories?.map((category) => category.id)).toEqual([
      'getting-started',
      'home-notes'
    ]);
  });

  it('keeps every starter area on Lovely Home+', () => {
    setHubPlanFeaturesForTests({
      plan: 'plus',
      planLabel: 'Lovely Home+',
      features: { bins: true, smartHome: true, weather: true },
      upgradeUrl: 'https://lovely-home.co.uk/account'
    });
    const catalog = buildStarterGuideCatalog('owner', {});
    expect(catalog.categories?.length ?? 0).toBeGreaterThan(FREE_STARTER_MAX_CATEGORIES);
    expect(catalog.categories?.some((category) => category.id === 'safety-notes')).toBe(true);
  });

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
