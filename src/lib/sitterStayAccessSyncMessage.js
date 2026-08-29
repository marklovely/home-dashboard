/**
 * @param {{ accessSyncOk?: boolean, accessSyncError?: string | null, accessSyncMessage?: string | null }} data
 * @returns {string | null} Warning when stay saved but Access sync failed; null when OK.
 */
export function sitterStayAccessSyncWarning(data) {
  if (!data || data.accessSyncOk !== false) return null;

  if (data.accessSyncError === 'ACCESS_SYNC_NOT_CONFIGURED') {
    return 'Stay saved on the hub, but Cloudflare Access sync is not configured — sitters cannot log in until you enable production Access sync or add their email manually in Zero Trust.';
  }

  if (typeof data.accessSyncMessage === 'string' && data.accessSyncMessage.trim()) {
    return `Stay saved, but Cloudflare Access sync failed: ${data.accessSyncMessage.trim()}`;
  }

  return 'Stay saved, but Cloudflare Access could not be updated — check Worker Access sync configuration.';
}
