import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { readDataCryptoSettings } from '../config/env.ts';
import type { DataCryptoSettings } from '../config/env.ts';

/**
 * Cifratura opzionale dei payload salvati (AES-256-GCM, prefisso `enc:v1:`).
 * Modalità da TUNET_ENCRYPTION_MODE: `off`, `dual` (testo in chiaro + cifrato),
 * `enc_only` (solo cifrato). Chiave da TUNET_DATA_KEY (32 byte hex/base64 o passphrase
 * con TUNET_DATA_KEY_SALT). Formato invariato rispetto a Tunet.
 */

export type DataEncryptionMode = 'off' | 'dual' | 'enc_only';

const SUPPORTED_MODES: ReadonlySet<string> = new Set(['off', 'dual', 'enc_only']);
const ENCRYPTION_PREFIX = 'enc:v1:';
const ENCRYPTED_ONLY_PLAINTEXT_STUB = '{"_enc_only":true}';
const warnedMessages = new Set<string>();

const warnOnce = (message: string): void => {
  if (warnedMessages.has(message)) return;
  warnedMessages.add(message);
  console.warn(message);
};

const isDataEncryptionMode = (value: string): value is DataEncryptionMode =>
  SUPPORTED_MODES.has(value);

export const normalizeEncryptionMode = (rawMode: unknown): DataEncryptionMode => {
  if (typeof rawMode !== 'string') return 'off';
  const mode = rawMode.trim().toLowerCase();
  return isDataEncryptionMode(mode) ? mode : 'off';
};

const decodeBase64Candidate = (rawKey: string): Buffer | null => {
  try {
    const decoded = Buffer.from(rawKey, 'base64');
    return decoded.length === 32 ? decoded : null;
  } catch {
    return null;
  }
};

const decodeHexCandidate = (rawKey: string): Buffer | null => {
  const cleaned = rawKey.trim();
  if (!/^[0-9a-fA-F]{64}$/.test(cleaned)) return null;
  try {
    const decoded = Buffer.from(cleaned, 'hex');
    return decoded.length === 32 ? decoded : null;
  } catch {
    return null;
  }
};

export const deriveEncryptionKey = (rawKey: unknown, passphraseSalt: string): Buffer | null => {
  if (typeof rawKey !== 'string' || !rawKey.trim()) return null;

  const trimmed = rawKey.trim();
  const fromHex = decodeHexCandidate(trimmed);
  if (fromHex) return fromHex;

  const fromBase64 = decodeBase64Candidate(trimmed);
  if (fromBase64) return fromBase64;

  if (trimmed.length < 16) {
    warnOnce(
      '[data-crypto] TUNET_DATA_KEY is too short. Use a 32-byte base64/hex key or a long passphrase.'
    );
    return null;
  }

  if (!passphraseSalt) {
    warnOnce(
      '[data-crypto] TUNET_DATA_KEY_SALT is required when TUNET_DATA_KEY is a passphrase. Use a 32-byte base64/hex key to avoid salt requirements.'
    );
    return null;
  }

  try {
    return scryptSync(trimmed, passphraseSalt, 32, { N: 16384, r: 8, p: 1 });
  } catch {
    warnOnce('[data-crypto] Failed to derive encryption key from TUNET_DATA_KEY.');
    return null;
  }
};

export interface StoredDataText {
  plainText: unknown;
  encryptedText: unknown;
  context?: string;
}

export interface DataCrypto {
  getDataEncryptionMode(): DataEncryptionMode;
  isDataEncryptionEnabled(): boolean;
  isEncryptionWriteRequired(): boolean;
  shouldPersistPlaintextData(): boolean;
  getEncryptedOnlyPlaintextStub(): string;
  /** Testo cifrato, oppure null se la cifratura è spenta o senza chiave. */
  encryptDataText(plainText: unknown): string | null;
  /** Testo da usare per un payload salvato, secondo la modalità corrente. */
  resolveStoredDataText(stored: StoredDataText): string | null;
}

export const createDataCrypto = ({ mode: rawMode, key: rawKey, salt }: DataCryptoSettings): DataCrypto => {
  const mode = normalizeEncryptionMode(rawMode);
  const key = deriveEncryptionKey(rawKey, salt);

  if (mode !== 'off' && !key) {
    warnOnce(
      '[data-crypto] TUNET_ENCRYPTION_MODE is enabled but TUNET_DATA_KEY is missing. Falling back to plaintext reads/writes.'
    );
  }

  const decryptPayload = (encryptedValue: unknown): string | null => {
    if (!key) return null;
    if (typeof encryptedValue !== 'string' || !encryptedValue.startsWith(ENCRYPTION_PREFIX))
      return null;

    try {
      const payload = Buffer.from(encryptedValue.slice(ENCRYPTION_PREFIX.length), 'base64');
      if (payload.length <= 28) return null;

      const iv = payload.subarray(0, 12);
      const authTag = payload.subarray(12, 28);
      const encrypted = payload.subarray(28);

      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return plain.toString('utf8');
    } catch {
      return null;
    }
  };

  return {
    getDataEncryptionMode: () => mode,
    isDataEncryptionEnabled: () => mode !== 'off',
    isEncryptionWriteRequired: () => mode === 'enc_only',
    shouldPersistPlaintextData: () => mode !== 'enc_only',
    getEncryptedOnlyPlaintextStub: () => ENCRYPTED_ONLY_PLAINTEXT_STUB,

    encryptDataText: (plainText) => {
      if (mode === 'off' || !key) return null;
      if (typeof plainText !== 'string') return null;

      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
      const authTag = cipher.getAuthTag();
      return `${ENCRYPTION_PREFIX}${Buffer.concat([iv, authTag, encrypted]).toString('base64')}`;
    },

    resolveStoredDataText: ({ plainText, encryptedText, context = 'unknown' }) => {
      const plain = typeof plainText === 'string' ? plainText : null;
      const encrypted =
        typeof encryptedText === 'string' && encryptedText.trim() ? encryptedText : null;

      if (mode === 'off') {
        if (plain) return plain;
        return encrypted ? decryptPayload(encrypted) : null;
      }

      if (encrypted) {
        const decrypted = decryptPayload(encrypted);
        if (decrypted !== null) return decrypted;
        if (mode === 'enc_only') {
          warnOnce(`[data-crypto] Failed to decrypt payload in ${context} while in enc_only mode.`);
          return null;
        }
        warnOnce(
          `[data-crypto] Failed to decrypt payload in ${context}. Falling back to plaintext data.`
        );
      }

      return plain;
    },
  };
};

/** Istanza del processo, configurata dalle variabili d'ambiente al caricamento del modulo. */
export const dataCrypto: DataCrypto = createDataCrypto(readDataCryptoSettings());
