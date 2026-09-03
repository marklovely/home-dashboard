import { describe, expect, it } from 'vitest';
import {
  BACKUP_KDF_ITERATIONS,
  decryptBackupDocument,
  encryptBackupDocument,
  isEncryptedBackupDocument
} from '../src/utils/backupEncryption.js';

describe('backupEncryption', () => {
  const sampleBackup = {
    formatVersion: 1,
    backupScope: 'full',
    hubSecrets: { wifi_password: 'secret' },
    guide: { seeded: true, catalog: { categories: [] }, uploadedMedia: [] }
  };

  it('encrypts and decrypts a backup document', async () => {
    const envelope = await encryptBackupDocument(sampleBackup, 'hub-backup-pass');
    expect(isEncryptedBackupDocument(envelope)).toBe(true);
    expect(envelope.kdfIterations).toBe(BACKUP_KDF_ITERATIONS);
    expect(envelope).not.toHaveProperty('hubSecrets');

    const restored = await decryptBackupDocument(envelope, 'hub-backup-pass');
    expect(restored).toEqual(sampleBackup);
  });

  it('rejects wrong password', async () => {
    const envelope = await encryptBackupDocument(sampleBackup, 'correct-password');
    await expect(decryptBackupDocument(envelope, 'wrong-password')).rejects.toThrow(
      /Incorrect backup password/i
    );
  });

  it('requires a non-empty password on export', async () => {
    await expect(encryptBackupDocument(sampleBackup, '   ')).rejects.toThrow(/password/i);
  });

  it('detects encrypted envelopes', () => {
    expect(isEncryptedBackupDocument({ encrypted: true, cipher: 'AES-GCM', ciphertext: 'x', salt: 'a', iv: 'b' })).toBe(
      true
    );
    expect(isEncryptedBackupDocument({ formatVersion: 1, backupScope: 'guide' })).toBe(false);
  });

  it('encrypts and decrypts zip backup bytes', async () => {
    const zipBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
    const envelope = await encryptBackupDocument(zipBytes, 'zip-pass', { payloadType: 'zip' });
    expect(envelope.payloadType).toBe('zip');

    const restored = await decryptBackupDocument(envelope, 'zip-pass');
    expect(restored).toBeInstanceOf(Uint8Array);
    expect(restored).toEqual(zipBytes);
  });
});
