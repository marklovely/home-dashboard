import { describe, expect, it } from 'vitest';
import { platformPrNeedsRegistryOverlay } from '../scripts/lib/platform-pr-needs-overlay.mjs';

describe('platformPrNeedsRegistryOverlay', () => {
  it('overlays GitHub merge conflicts', () => {
    expect(
      platformPrNeedsRegistryOverlay({
        mergeable: 'CONFLICTING',
        mergeStateStatus: 'DIRTY',
        baseIsAncestorOfHead: false
      })
    ).toBe(true);
  });

  it('overlays a PR that is only behind main (MERGEABLE, not conflicting)', () => {
    expect(
      platformPrNeedsRegistryOverlay({
        mergeable: 'MERGEABLE',
        mergeStateStatus: 'BEHIND',
        baseIsAncestorOfHead: false
      })
    ).toBe(true);
  });

  it('overlays when git ancestry says origin/main is not in the PR head', () => {
    expect(
      platformPrNeedsRegistryOverlay({
        mergeable: 'MERGEABLE',
        mergeStateStatus: 'BLOCKED',
        baseIsAncestorOfHead: false
      })
    ).toBe(true);
  });

  it('does not overlay an up-to-date PR waiting on checks', () => {
    expect(
      platformPrNeedsRegistryOverlay({
        mergeable: 'MERGEABLE',
        mergeStateStatus: 'BLOCKED',
        baseIsAncestorOfHead: true
      })
    ).toBe(false);
  });

  it('does not overlay a clean up-to-date PR', () => {
    expect(
      platformPrNeedsRegistryOverlay({
        mergeable: 'MERGEABLE',
        mergeStateStatus: 'CLEAN',
        baseIsAncestorOfHead: true
      })
    ).toBe(false);
  });
});
