import { getHubSecret, getHubSecretsMap } from '../lib/hubSecrets.js';
import { getSiteProfile } from '../lib/siteProfile.js';

/**
 * @param {Record<string, string>} secrets
 * @param {string} key
 * @param {string | undefined} envValue
 */
function pickSecret(secrets, key, envValue) {
  const fromDb = secrets[key]?.trim();
  if (fromDb) return fromDb;
  return envValue?.trim() || '';
}

/**
 * @param {Record<string, string | undefined>} env
 */
export async function buildPrivateConfig(env) {
  const [secrets, profile] = await Promise.all([getHubSecretsMap(env), getSiteProfile(env)]);

  const wifiSsid = pickSecret(secrets, 'wifi_ssid', env.PRIVATE_WIFI_SSID);
  const wifiPassword = pickSecret(secrets, 'wifi_password', env.PRIVATE_WIFI_PASSWORD);
  const primaryPhone = pickSecret(secrets, 'primary_phone', env.PRIVATE_MARK_PHONE);
  const primaryEmail = pickSecret(secrets, 'primary_email', env.PRIVATE_MARK_EMAIL);
  const secondaryPhone = pickSecret(secrets, 'secondary_phone', env.PRIVATE_DONNA_PHONE);
  const secondaryEmail = pickSecret(secrets, 'secondary_email', env.PRIVATE_DONNA_EMAIL);
  const homeAddress = pickSecret(secrets, 'home_address', env.PRIVATE_HOME_ADDRESS);
  const lockboxCode = pickSecret(secrets, 'lockbox_code', env.PRIVATE_LOCKBOX_CODE);

  const primaryName = profile.primaryContact?.name?.trim() || 'Primary contact';
  const secondaryName = profile.secondaryContact?.name?.trim() || 'Secondary contact';

  const payload = {
    wifi: {},
    contacts: {
      mark: { name: primaryName },
      donna: { name: secondaryName }
    },
    home: {},
    lockbox: {}
  };

  if (wifiSsid) payload.wifi.ssid = wifiSsid;
  if (wifiPassword) payload.wifi.password = wifiPassword;
  if (primaryPhone) payload.contacts.mark.phone = primaryPhone;
  if (primaryEmail) payload.contacts.mark.email = primaryEmail;
  if (secondaryPhone) payload.contacts.donna.phone = secondaryPhone;
  if (secondaryEmail) payload.contacts.donna.email = secondaryEmail;
  if (homeAddress) payload.home.address = homeAddress;
  if (lockboxCode) payload.lockbox.code = lockboxCode;

  return payload;
}

/**
 * @param {Record<string, string | undefined>} env
 */
export async function handlePrivateConfig(env) {
  return Response.json(await buildPrivateConfig(env));
}
