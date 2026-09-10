import { describe, expect, it } from 'vitest';
import {
  normalizeArrivalPrepProfile,
  pruneArrivalPrepChecks,
  withArrivalPrepArchivedForStay,
  withArrivalPrepCustomTaskAdded,
  withArrivalPrepGardenEnabled,
  withArrivalPrepReset,
  withArrivalPrepSectionReset,
  withArrivalPrepTaskChecked
} from '../../src/lib/arrivalPrep/arrivalPrepProfile.js';

describe('arrivalPrepProfile', () => {
  it('normalizes defaults', () => {
    expect(normalizeArrivalPrepProfile(null)).toEqual({
      gardenEnabled: false,
      checkedTaskIds: [],
      customTasks: [],
      collapsedSectionIds: [],
      activeStayId: null,
      archivedByStayId: {}
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

  it('adds custom tasks and resets a section', () => {
    const withCustom = withArrivalPrepCustomTaskAdded(normalizeArrivalPrepProfile(null), {
      id: 'custom.1',
      label: 'Extra task',
      sectionId: 'home'
    });
    expect(withCustom.customTasks).toHaveLength(1);
    const checked = withArrivalPrepTaskChecked(withCustom, 'custom.1', true);
    const reset = withArrivalPrepSectionReset(checked, 'home', ['home.bins', 'custom.1']);
    expect(reset.checkedTaskIds).toEqual([]);
    expect(reset.customTasks).toEqual([]);
  });

  it('archives progress for a stay and starts fresh', () => {
    const checked = withArrivalPrepTaskChecked({ checkedTaskIds: [], activeStayId: 'stay-a' }, 'home.bins', true);
    const archived = withArrivalPrepArchivedForStay(checked, 'stay-a', 'stay-b');
    expect(archived.checkedTaskIds).toEqual([]);
    expect(archived.activeStayId).toBe('stay-b');
    expect(archived.archivedByStayId['stay-a']?.checkedTaskIds).toEqual(['home.bins']);
  });
});
