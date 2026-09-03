import {
  guessTerraformStackForMissingSite,
  hubSiteIdsFromStateList,
  isTerraformStack,
  siteIdsForTerraformStack,
  terraformStackForSite
} from './terraform-stack.mjs';

/**
 * Fail closed if this backend still looks like the combined hub.tfstate, or is
 * empty while yaml still expects sites on this stack (migration not run).
 *
 * Per-site customer backends (`customers/{siteId}.tfstate`) may be empty — that
 * is a new hub — but must never contain another household's module.hub_site.
 *
 * @param {'platform' | 'customers'} stack
 * @param {string} stateList
 * @param {Record<string, Record<string, unknown>>} registry
 * @param {{ siteId?: string }} [options]
 * @returns {string | null} error message, or null when OK
 */
export function terraformStackStateError(stack, stateList, registry, options = {}) {
  if (!isTerraformStack(stack)) {
    return `terraform_stack must be "platform" or "customers" (got ${JSON.stringify(stack)}).`;
  }

  const siteId = String(options.siteId ?? '').trim();
  const list = String(stateList ?? '');
  const hubIds = hubSiteIdsFromStateList(list);
  const hasPlatformAdmin = /(?:^|\n)module\.platform_admin\b/.test(list);
  const expectedIds = siteIdsForTerraformStack(registry, stack).filter(
    (id) => registry[id]?.terraform !== false
  );

  /** @type {string[]} */
  const foreignHubs = [];
  for (const id of hubIds) {
    const siteStack = registry[id]
      ? terraformStackForSite(id, registry[id])
      : guessTerraformStackForMissingSite(id);
    if (siteStack !== stack) foreignHubs.push(id);
  }

  if (stack === 'customers' && hasPlatformAdmin) {
    return (
      'customers.tfstate still contains module.platform_admin — this looks like the legacy combined hub.tfstate. ' +
      'Run the stack migration (docs/platform-provision.md) before any apply. Do not apply.'
    );
  }

  if (foreignHubs.length > 0) {
    return (
      `${stack}.tfstate still contains hubs from the other stack (${foreignHubs.join(', ')}). ` +
      'Run the stack migration before any apply. Do not apply.'
    );
  }

  if (stack === 'customers' && siteId) {
    const extra = hubIds.filter((id) => id !== siteId);
    if (extra.length > 0) {
      return (
        `customers/${siteId}.tfstate still contains other hubs (${extra.join(', ')}). ` +
        'This looks like the combined customers.tfstate. Run the per-site customer state split ' +
        '(docs/platform-provision.md) before any apply. Do not apply.'
      );
    }
    return null;
  }

  const empty = hubIds.length === 0 && (stack === 'customers' || !hasPlatformAdmin);
  if (empty && expectedIds.length > 0) {
    return (
      `${stack}.tfstate is empty but platform/sites.yaml still has Terraform sites on this stack (${expectedIds.join(', ')}). ` +
      'Run scripts/migrate-terraform-state-stacks.mjs (workflow: Split Terraform state stacks) before any apply. ' +
      'An apply against empty state would recreate live Cloudflare resources.'
    );
  }

  return null;
}
