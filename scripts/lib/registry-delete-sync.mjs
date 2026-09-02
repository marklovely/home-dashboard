/**
 * When to wait for origin/main before deleting a site from the registry.
 *
 * Provision is two PRs: create, then "mark provisioned" (D1 ids +
 * attach_hub_api_binding). Billing deprovision that edits a stale checkout
 * conflicts with that follow-up on the same yaml/toml blocks.
 *
 * @param {Record<string, unknown> | undefined} entry
 * @returns {'absent' | 'ready' | 'wait_for_follow_up'}
 */
export function registryDeleteSyncState(entry) {
  if (!entry) return 'absent';
  if (entry.attach_hub_api_binding === true) return 'ready';
  if (entry.terraform !== true) return 'ready';
  return 'wait_for_follow_up';
}
