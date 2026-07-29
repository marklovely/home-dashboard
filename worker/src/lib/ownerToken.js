const TOKEN_TTL_MS = 15 * 60 * 1000;

/**
 * @param {Record<string, string | undefined>} env
 */
function getSigningSecret(env) {
  const secret = env.OWNER_SESSION_SECRET?.trim() || env.OWNER_PIN?.trim();
  return secret || null;
}

/**
 * @param {ArrayBuffer} key
 * @param {string} data
 */
async function hmacSign(key, data) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
  return new Uint8Array(signature);
}

/**
 * @param {Uint8Array} bytes
 */
function base64UrlEncode(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * @param {string} input
 */
function base64UrlDecode(input) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

/**
 * @param {Record<string, string | undefined>} env
 * @returns {Promise<{ token: string, expiresAt: string } | null>}
 */
export async function issueOwnerToken(env) {
  const secret = getSigningSecret(env);
  if (!secret) return null;

  const expiresMs = Date.now() + TOKEN_TTL_MS;
  const payload = JSON.stringify({ sub: 'owner', exp: expiresMs });
  const payloadPart = base64UrlEncode(new TextEncoder().encode(payload));
  const keyBytes = new TextEncoder().encode(secret);
  const signature = await hmacSign(keyBytes, payloadPart);
  const token = `${payloadPart}.${base64UrlEncode(signature)}`;
  return { token, expiresAt: new Date(expiresMs).toISOString() };
}

/**
 * @param {string | null | undefined} authorizationHeader
 * @param {Record<string, string | undefined>} env
 */
export async function verifyOwnerBearer(authorizationHeader, env) {
  const secret = getSigningSecret(env);
  if (!secret || !authorizationHeader?.startsWith('Bearer ')) return false;

  const token = authorizationHeader.slice('Bearer '.length).trim();
  const [payloadPart, signaturePart] = token.split('.');
  if (!payloadPart || !signaturePart) return false;

  const keyBytes = new TextEncoder().encode(secret);
  const expected = await hmacSign(keyBytes, payloadPart);
  const provided = base64UrlDecode(signaturePart);
  if (expected.length !== provided.length) return false;
  let diff = 0;
  for (let index = 0; index < expected.length; index += 1) {
    diff |= expected[index] ^ provided[index];
  }
  if (diff !== 0) return false;

  try {
    const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadPart));
    const payload = JSON.parse(payloadJson);
    if (payload.sub !== 'owner') return false;
    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return false;
    return true;
  } catch {
    return false;
  }
}

export { TOKEN_TTL_MS };
