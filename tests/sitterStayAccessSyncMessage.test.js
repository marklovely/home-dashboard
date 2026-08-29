import { describe, expect, it } from 'vitest';
import { sitterStayAccessSyncWarning } from '../src/lib/sitterStayAccessSyncMessage.js';

describe('sitterStayAccessSyncWarning', () => {
  it('returns null when Access sync succeeded', () => {
    expect(sitterStayAccessSyncWarning({ accessSyncOk: true })).toBeNull();
  });

  it('warns when Access sync is not configured', () => {
    expect(sitterStayAccessSyncWarning({ accessSyncOk: false, accessSyncError: 'ACCESS_SYNC_NOT_CONFIGURED' })).toMatch(
      /not configured/i
    );
  });

  it('includes API message when sync failed', () => {
    expect(
      sitterStayAccessSyncWarning({
        accessSyncOk: false,
        accessSyncError: 'ACCESS_SYNC_FAILED',
        accessSyncMessage: 'Access policy update failed (403)'
      })
    ).toContain('403');
  });
});
