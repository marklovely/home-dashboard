import { describe, expect, it } from 'vitest';
import {
  getStarterGuideCatalog,
  getStarterGuideTemplate,
  STARTER_GUIDE_BY_USE_CASE
} from '../src/content/houseguide/templates/starterGuideTemplates.js';

describe('starterGuideTemplates', () => {
  it('maps each use case to a distinct catalog', () => {
    const owner = getStarterGuideCatalog('owner');
    const housesitter = getStarterGuideCatalog('housesitter');
    const airbnb = getStarterGuideCatalog('airbnb');
    const both = getStarterGuideCatalog('both');

    expect(owner.categories?.length).toBeGreaterThan(0);
    expect(housesitter.categories?.some((category) => category.id === 'pets')).toBe(true);
    expect(housesitter.categories?.some((category) => category.id === 'children-safety')).toBe(true);
    expect(housesitter.categories?.some((category) => category.id === 'appliance-manuals')).toBe(true);
    expect(airbnb.categories?.some((category) => category.id === 'amenities')).toBe(true);
    expect(airbnb.categories?.some((category) => category.id === 'emergency')).toBe(true);
    expect(both.categories?.some((category) => category.id === 'pets')).toBe(true);
    expect(both.categories?.some((category) => category.id === 'local')).toBe(true);

    expect(owner).not.toBe(housesitter);
    expect(airbnb).not.toBe(housesitter);
  });

  it('includes an empty appliance manuals category for guest templates', () => {
    for (const useCase of ['owner', 'housesitter', 'airbnb', 'both']) {
      const manuals = getStarterGuideCatalog(useCase).categories?.find(
        (category) => category.id === 'appliance-manuals'
      );
      expect(manuals?.topics).toEqual([]);
    }
  });

  it('falls back to owner template for unknown use cases', () => {
    expect(getStarterGuideCatalog('unknown')).toBe(STARTER_GUIDE_BY_USE_CASE.owner.catalog);
  });

  it('exposes human-readable metadata for the wizard', () => {
    const template = getStarterGuideTemplate('airbnb');
    expect(template.label).toMatch(/short-stay/i);
    expect(template.summary.length).toBeGreaterThan(10);
    expect(template.hint.length).toBeGreaterThan(20);
  });
});
