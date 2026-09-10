import { describe, expect, it } from 'vitest';
import {
  formatArrivalPrepStayLabel,
  getNextArrivalPrepStay
} from '../../src/lib/arrivalPrep/arrivalPrepStays.js';

describe('arrivalPrepStays', () => {
  it('picks the next non-cancelled stay ending today or later', () => {
    const stays = [
      { id: 'old', sitStart: '2026-01-01', sitEnd: '2026-01-10', status: 'completed' },
      { id: 'next', label: 'Spring sit', sitStart: '2026-03-01', sitEnd: '2026-03-14', status: 'scheduled' },
      { id: 'later', sitStart: '2026-04-01', sitEnd: '2026-04-14', status: 'scheduled' }
    ];
    const next = getNextArrivalPrepStay(stays, new Date('2026-02-15T12:00:00'));
    expect(next?.id).toBe('next');
  });

  it('formats stay labels with optional name', () => {
    expect(
      formatArrivalPrepStayLabel(
        { id: '1', sitStart: '2026-03-01', sitEnd: '2026-03-14', label: 'Spring sit' },
        (value) => value
      )
    ).toBe('Spring sit (2026-03-01 – 2026-03-14)');
  });
});
