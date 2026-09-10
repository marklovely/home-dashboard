import { describe, expect, it } from 'vitest';
import {
  normalizeArrivalPrepProfile,
  pruneArrivalPrepChecks,
  withArrivalPrepGardenEnabled,
  withArrivalPrepReset,
  withArrivalPrepTaskChecked
} from '../../src/lib/arrivalPrep/arrivalPrepProfile.js';

describe('arrivalPrepProfile', () => {
  it('normalizes defaults', () => {
    expect(normalizeArrivalPrepProfile(null)).toEqual({
      gardenEnabled: false,
      checkedTaskIds: []
    });
  });

  it('toggles task checks', () => {
    const next = withArrivalPrepTaskChecked({ checkedTaskIds: [] }, 'home.bins', true);
    expect(next.checkedTaskIds).toEqual(['home.bins']);
    const cleared = withArrivalPrepTaskChecked(next, 'home.bins', false);
    expect(cleared.checkedTaskIds).toEqual([]);
  });

  it('resets checks and toggles garden', () => {
    const checked = withArrivalPrepTaskChecked({ checkedTaskIds: [] }, 'before.wifi', true);
    expect(withArrivalPrepReset(checked).checkedTaskIds).toEqual([]);
    expect(withArrivalPrepGardenEnabled({}, true).gardenEnabled).toBe(true);
  });

  it('prunes stale task ids', () => {
    const pruned = pruneArrivalPrepChecks(
      { checkedTaskIds: ['before.wifi', 'removed.task'] },
      ['before.wifi']
    );
    expect(pruned.checkedTaskIds).toEqual(['before.wifi']);
  });
});
