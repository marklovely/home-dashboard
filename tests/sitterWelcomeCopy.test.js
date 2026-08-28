import { describe, expect, it } from 'vitest';
import {
  buildSitterWelcomeCopy,
  isSitInProgress,
  localIsoDate
} from '../src/lib/sitterWelcomeCopy.js';

describe('sitterWelcomeCopy', () => {
  const formatDate = (iso) => iso;

  it('shows upcoming sit dates before the sit start day', () => {
    const copy = buildSitterWelcomeCopy(
      { sitStart: '2027-05-04', sitEnd: '2027-05-11' },
      null,
      formatDate,
      new Date('2027-05-01T12:00:00')
    );
    expect(copy.lead).toMatch(/begins on 2027-05-04/);
    expect(copy.lead).toMatch(/ends on 2027-05-11/);
    expect(copy.lead).toMatch(/looking forward to welcoming you/i);
    expect(copy.body).toBeNull();
  });

  it('shows in-progress thank-you copy on the sit start day', () => {
    const copy = buildSitterWelcomeCopy(
      { sitStart: '2027-05-04', sitEnd: '2027-05-11' },
      { hasPets: true, name: 'Bailey' },
      formatDate,
      new Date('2027-05-04T09:00:00')
    );
    expect(copy.lead).toMatch(/Bailey/);
    expect(copy.body).toMatch(/Everything you'll need/);
  });

  it('falls back to thank-you copy when no stay is linked', () => {
    const copy = buildSitterWelcomeCopy(null, null, formatDate);
    expect(copy.lead).toBe('Thank you for looking after our home.');
    expect(copy.body).toMatch(/Everything you'll need/);
  });

  it('compares sit progress using local calendar dates', () => {
    expect(isSitInProgress('2027-05-04', new Date('2027-05-03T23:00:00'))).toBe(false);
    expect(isSitInProgress('2027-05-04', new Date('2027-05-04T00:00:00'))).toBe(true);
    expect(localIsoDate(new Date('2027-05-04T23:59:00'))).toBe('2027-05-04');
  });
});
