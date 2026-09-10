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

  it('adds pet section titled with pet name', () => {
    const checklist = buildArrivalPrepChecklist({
      useCase: 'housesitter',
      petCare: { hasPets: true, name: 'Scooter', species: 'Labrador' }
    });
    const petSection = checklist?.sections.find((section) => section.id === 'pet-dog');
    expect(petSection?.title).toBe('Scooter');
    expect(petSection?.tasks.some((task) => task.id === 'pet.dog-poo-bags')).toBe(true);
  });

  it('adds garden section when enabled', () => {
    const checklist = buildArrivalPrepChecklist({
      useCase: 'airbnb',
      arrivalPrep: { gardenEnabled: true, checkedTaskIds: [] }
    });
    expect(checklist?.sections.some((section) => section.id === 'garden')).toBe(true);
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
