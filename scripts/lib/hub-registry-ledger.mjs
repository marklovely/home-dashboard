/**
 * Commit messages for the hub registry ledger writer.
 * Yaml-push auto provision/deprovision must ignore these commits so a
 * post-infra record/drop does not start a second Terraform run.
 */

export const HUB_REGISTRY_RECORD_PREFIX = 'platform: record ';
export const HUB_REGISTRY_DROP_PREFIX = 'platform: drop ';

/**
 * @param {'record' | 'drop'} action
 * @param {string} siteId
 */
export function hubRegistryLedgerCommitMessage(action, siteId) {
  return action === 'drop'
    ? `${HUB_REGISTRY_DROP_PREFIX}${siteId} from site registry`
    : `${HUB_REGISTRY_RECORD_PREFIX}${siteId} in site registry`;
}

/**
 * @param {string} subject
 */
export function isHubRegistryLedgerCommit(subject) {
  const text = String(subject ?? '').trim();
  return text.startsWith(HUB_REGISTRY_RECORD_PREFIX) || text.startsWith(HUB_REGISTRY_DROP_PREFIX);
}
