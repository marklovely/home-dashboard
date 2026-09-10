import { describe, expect, it } from 'vitest';
import {
  buildArrivalPrepChecklist,
  getActiveArrivalPrepModules,
  shouldShowArrivalPrepChecklist
} from '../../src/lib/arrivalPrep/buildArrivalPrepChecklist.js';

describe('buildArrivalPrepChecklist', () => {
  it('hides checklist for owner-only use case', () => {
    expect(shouldShowArrivalPrepChecklist({ useCase: 'owner' })).toBe(false);
    expect(buildArrivalPrepChecklist({ useCase: 'owner' })).toBeNull();
  });

  it('builds guest checklist without sitter module for airbnb', () => {
    const checklist = buildArrivalPrepChecklist({ useCase: 'airbnb' });
    expect(checklist?.title).toBe('Getting ready for your guest');
    expect(getActiveArrivalPrepModules({ useCase: 'airbnb' })).toEqual(['home', 'before']);
    expect(checklist?.sections.some((section) => section.id === 'sitter')).toBe(false);
  });

  it('includes sitter module for housesitter use case', () => {
    const checklist = buildArrivalPrepChecklist({ useCase: 'housesitter' });
    expect(checklist?.title).toBe('Getting ready for your sitter');
    expect(checklist?.sections.some((section) => section.id === 'sitter')).toBe(true);
  });

  it('adds one section per pet with scoped task ids', () => {
    const checklist = buildArrivalPrepChecklist({
      useCase: 'housesitter',
      petCare: {
        hasPets: true,
        pets: [
          { id: 'dog1', name: 'Scooter', species: 'Labrador' },
          { id: 'cat1', name: 'Mittens', species: 'Cat' }
        ]
      }
    });
    const scooterSection = checklist?.sections.find((section) => section.id === 'pet-dog1');
    const mittensSection = checklist?.sections.find((section) => section.id === 'pet-cat1');
    expect(scooterSection?.title).toBe('Scooter');
    expect(mittensSection?.title).toBe('Mittens');
    expect(scooterSection?.tasks.some((task) => task.id === 'pet.dog-poo-bags@dog1')).toBe(true);
    expect(mittensSection?.tasks.some((task) => task.id === 'pet.cat-litter@cat1')).toBe(true);
  });

  it('adds garden section when enabled', () => {
    const checklist = buildArrivalPrepChecklist({
      useCase: 'airbnb',
      arrivalPrep: { gardenEnabled: true, checkedTaskIds: [] }
    });
    expect(checklist?.sections.some((section) => section.id === 'garden')).toBe(true);
  });

  it('includes custom tasks in their section', () => {
    const checklist = buildArrivalPrepChecklist({
      useCase: 'airbnb',
      arrivalPrep: {
        gardenEnabled: false,
        checkedTaskIds: [],
        customTasks: [{ id: 'custom.abc', label: 'Buy flowers', sectionId: 'home' }]
      }
    });
    const home = checklist?.sections.find((section) => section.id === 'home');
    expect(home?.tasks.some((task) => task.id === 'custom.abc' && task.custom)).toBe(true);
  });

  it('tracks remaining tasks from saved checks', () => {
    const checklist = buildArrivalPrepChecklist({
      useCase: 'airbnb',
      arrivalPrep: { gardenEnabled: false, checkedTaskIds: ['before.wifi', 'before.guide'] }
    });
    expect(checklist?.completeCount).toBe(2);
    expect(checklist?.remainingCount).toBe((checklist?.totalCount ?? 0) - 2);
  });
});
