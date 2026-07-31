/**
 * Escape special characters for the Wi-Fi QR payload format.
 * @param {string} value
 */
export function escapeWifiQrField(value) {
  return value.replace(/([\\;,":])/g, '\\$1');
}

/**
 * Build a standard Wi-Fi QR code payload (WPA/WPA2).
 * @param {string} ssid
 * @param {string} password
 * @param {'WPA' | 'nopass'} [authType]
 * @returns {string | null}
 */
export function buildWifiQrPayload(ssid, password, authType = 'WPA') {
  const normalizedSsid = ssid?.trim();
  if (!normalizedSsid) return null;

  const escapedSsid = escapeWifiQrField(normalizedSsid);
  const normalizedPassword = password?.trim();

  if (!normalizedPassword || authType === 'nopass') {
    return `WIFI:T:nopass;S:${escapedSsid};;`;
  }

  return `WIFI:T:WPA;S:${escapedSsid};P:${escapeWifiQrField(normalizedPassword)};;`;
}
