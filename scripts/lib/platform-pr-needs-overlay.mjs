/**
 * Whether an automated platform registry PR should be replayed onto origin/main.
 *
 * GitHub squash auto-merge with "require up to date" will not land a PR that is
 * only behind — mergeable stays MERGEABLE, mergeStateStatus is BEHIND (or the
 * head is not a descendant of origin/main). Overlay used to run only on
 * CONFLICTING, so teardown PRs sat open while other site merges landed.
 *
 * @param {{
 *   mergeable?: string | null,
 *   mergeStateStatus?: string | null,
 *   baseIsAncestorOfHead?: boolean | null
 * }} input
 */
export function platformPrNeedsRegistryOverlay(input) {
  const mergeable = String(input.mergeable ?? '').toUpperCase();
  const mergeStateStatus = String(input.mergeStateStatus ?? '').toUpperCase();
  if (mergeable === 'CONFLICTING' || mergeStateStatus === 'DIRTY') return true;
  if (mergeStateStatus === 'BEHIND') return true;
  if (input.baseIsAncestorOfHead === false) return true;
  return false;
}
