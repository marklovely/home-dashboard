/**
 * Parse the platform health Access service token out of `terraform state pull` JSON.
 *
 * @param {string} raw
 * @returns {{ clientId: string, clientSecret: string } | null}
 */
export function parsePlatformHealthServiceTokenFromState(raw) {
  let state;
  try {
    state = JSON.parse(raw);
  } catch {
    return null;
  }
  const resources = Array.isArray(state?.resources) ? state.resources : [];
  const resource = resources.find(
    (row) =>
      row?.type === 'cloudflare_zero_trust_access_service_token' &&
      String(row?.module ?? '').includes('platform_admin') &&
      String(row?.name ?? '') === 'platform_health'
  );
  const attrs = resource?.instances?.[0]?.attributes ?? {};
  const clientId = String(attrs.client_id ?? '').trim();
  const clientSecret = String(attrs.client_secret ?? '').trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}
