/** PBKDF2 iterations for backup passphrase key derivation (OWASP SHA-256 guidance). */
export const BACKUP_KDF_ITERATIONS = 310_000;

/**
 * @param {Uint8Array} bytes
 */
function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * @param {string} base64
 */
function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * @param {string} password
 * @param {Uint8Array} salt
 * @param {number} iterations
 */
async function deriveBackupKey(password, salt, iterations) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * @param {Record<string, unknown>} doc
 */
export function isEncryptedBackupDocument(doc) {
  return (
    doc?.encrypted === true &&
    doc.cipher === 'AES-GCM' &&
    typeof doc.ciphertext === 'string' &&
    typeof doc.salt === 'string' &&
    typeof doc.iv === 'string'
  );
}

/**
 * @param {Record<string, unknown>} backup
 * @param {string} password
 */
export async function encryptBackupDocument(backup, password) {
  const trimmed = password.trim();
  if (!trimmed) {
    throw new Error('Enter a backup password.');
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveBackupKey(trimmed, salt, BACKUP_KDF_ITERATIONS);
  const plaintext = new TextEncoder().encode(`${JSON.stringify(backup)}\n`);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

  return {
    formatVersion: 1,
    encrypted: true,
    cipher: 'AES-GCM',
    kdf: 'PBKDF2-SHA256',
    kdfIterations: BACKUP_KDF_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encrypted))
  };
}

/**
 * @param {Record<string, unknown>} envelope
 * @param {string} password
 */
export async function decryptBackupDocument(envelope, password) {
  const trimmed = password.trim();
  if (!trimmed) {
    throw new Error('Enter the backup password.');
  }
  if (!isEncryptedBackupDocument(envelope)) {
    throw new Error('File is not an encrypted backup.');
  }

  const iterations =
    typeof envelope.kdfIterations === 'number' && envelope.kdfIterations > 0
      ? envelope.kdfIterations
      : BACKUP_KDF_ITERATIONS;

  try {
    const salt = base64ToBytes(/** @type {string} */ (envelope.salt));
    const iv = base64ToBytes(/** @type {string} */ (envelope.iv));
    const ciphertext = base64ToBytes(/** @type {string} */ (envelope.ciphertext));
    const key = await deriveBackupKey(trimmed, salt, iterations);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    const parsed = JSON.parse(new TextDecoder().decode(decrypted));
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Decrypted backup is not a JSON object.');
    }
    return /** @type {Record<string, unknown>} */ (parsed);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Decrypted backup is invalid JSON.');
    }
    const name = error instanceof Error ? error.name : '';
    const message = error instanceof Error ? error.message : '';
    if (
      name === 'OperationError' ||
      /operation failed for an operation-specific reason/i.test(message) ||
      /decrypt/i.test(message)
    ) {
      throw new Error('Incorrect backup password.');
    }
    throw error;
  }
}
