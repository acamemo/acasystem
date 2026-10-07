// @vitest-environment node

import { describe, expect, it } from 'vitest';
import {
  createDataCrypto,
  deriveEncryptionKey,
  normalizeEncryptionMode,
} from '../helpers/dataCrypto.ts';

const HEX_KEY = '0f'.repeat(32);
const BASE64_KEY = Buffer.alloc(32, 7).toString('base64');

describe('data crypto', () => {
  it('normalizes the mode and falls back to off', () => {
    expect(normalizeEncryptionMode(' DUAL ')).toBe('dual');
    expect(normalizeEncryptionMode('enc_only')).toBe('enc_only');
    expect(normalizeEncryptionMode('aes')).toBe('off');
    expect(normalizeEncryptionMode(undefined)).toBe('off');
  });

  it('derives 32-byte keys from hex, base64 or a salted passphrase', () => {
    expect(deriveEncryptionKey(HEX_KEY, '')).toEqual(Buffer.from(HEX_KEY, 'hex'));
    expect(deriveEncryptionKey(BASE64_KEY, '')).toEqual(Buffer.alloc(32, 7));
    expect(deriveEncryptionKey('a long enough passphrase', 'salt')).toHaveLength(32);
    expect(deriveEncryptionKey('a long enough passphrase', '')).toBeNull();
    expect(deriveEncryptionKey('short', 'salt')).toBeNull();
    expect(deriveEncryptionKey('', 'salt')).toBeNull();
  });

  it('does not encrypt when off', () => {
    const crypto = createDataCrypto({ mode: 'off', key: HEX_KEY, salt: '' });
    expect(crypto.isDataEncryptionEnabled()).toBe(false);
    expect(crypto.encryptDataText('{"a":1}')).toBeNull();
    expect(crypto.shouldPersistPlaintextData()).toBe(true);
    expect(crypto.resolveStoredDataText({ plainText: '{"a":1}', encryptedText: null })).toBe(
      '{"a":1}'
    );
  });

  it('round-trips with AES-GCM in dual mode and prefers the encrypted copy', () => {
    const crypto = createDataCrypto({ mode: 'dual', key: HEX_KEY, salt: '' });
    const encrypted = crypto.encryptDataText('{"a":1}');

    expect(encrypted).toMatch(/^enc:v1:/);
    expect(crypto.isEncryptionWriteRequired()).toBe(false);
    expect(crypto.resolveStoredDataText({ plainText: 'stale', encryptedText: encrypted })).toBe(
      '{"a":1}'
    );
    // A corrupted ciphertext falls back to the plaintext copy in dual mode.
    expect(
      crypto.resolveStoredDataText({ plainText: 'plain', encryptedText: 'enc:v1:AAAA' })
    ).toBe('plain');
  });

  it('never falls back to plaintext in enc_only mode', () => {
    const writer = createDataCrypto({ mode: 'enc_only', key: HEX_KEY, salt: '' });
    const reader = createDataCrypto({ mode: 'enc_only', key: BASE64_KEY, salt: '' });
    const encrypted = writer.encryptDataText('{"a":1}');

    expect(writer.shouldPersistPlaintextData()).toBe(false);
    expect(writer.getEncryptedOnlyPlaintextStub()).toBe('{"_enc_only":true}');
    expect(reader.resolveStoredDataText({ plainText: 'plain', encryptedText: encrypted })).toBeNull();
  });

  it('reads encrypted rows even when the mode was switched off', () => {
    const writer = createDataCrypto({ mode: 'enc_only', key: HEX_KEY, salt: '' });
    const reader = createDataCrypto({ mode: 'off', key: HEX_KEY, salt: '' });
    const encrypted = writer.encryptDataText('{"a":1}');

    expect(
      reader.resolveStoredDataText({ plainText: '{"_enc_only":true}', encryptedText: encrypted })
    ).toBe('{"_enc_only":true}');
    expect(reader.resolveStoredDataText({ plainText: '', encryptedText: encrypted })).toBe(
      '{"a":1}'
    );
  });
});
