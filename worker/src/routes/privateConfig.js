/**
 * @param {Record<string, string | undefined>} env
 */
export function buildPrivateConfig(env) {
  const wifiSsid = env.PRIVATE_WIFI_SSID?.trim();
  const wifiPassword = env.PRIVATE_WIFI_PASSWORD?.trim();
  const markPhone = env.PRIVATE_MARK_PHONE?.trim();
  const markEmail = env.PRIVATE_MARK_EMAIL?.trim();
  const donnaPhone = env.PRIVATE_DONNA_PHONE?.trim();
  const donnaEmail = env.PRIVATE_DONNA_EMAIL?.trim();
  const homeAddress = env.PRIVATE_HOME_ADDRESS?.trim();

  const payload = {
    wifi: {},
    contacts: {
      mark: { name: 'Mark Lovely' },
      donna: { name: 'Donna Powell' }
    },
    home: {}
  };

  if (wifiSsid) payload.wifi.ssid = wifiSsid;
  if (wifiPassword) payload.wifi.password = wifiPassword;
  if (markPhone) payload.contacts.mark.phone = markPhone;
  if (markEmail) payload.contacts.mark.email = markEmail;
  if (donnaPhone) payload.contacts.donna.phone = donnaPhone;
  if (donnaEmail) payload.contacts.donna.email = donnaEmail;
  if (homeAddress) payload.home.address = homeAddress;

  return payload;
}

/**
 * @param {Record<string, string | undefined>} env
 */
export function handlePrivateConfig(env) {
  return Response.json(buildPrivateConfig(env));
}
