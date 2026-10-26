import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname } from 'node:path';

/**
 * Secret files (the service-user token). Written atomically with mode 0600 inside a 0700
 * folder; refused on read when a POSIX file is readable by group or others. Windows has no
 * POSIX modes, so the permission check is skipped there (development only).
 */

export type SecretRead =
  { ok: true; content: string } | { ok: false; reason: 'missing' | 'too_open' | 'unreadable' };

export const writeSecretFile = (filePath: string, content: string): void => {
  const folder = dirname(filePath);
  if (!existsSync(folder)) mkdirSync(folder, { recursive: true, mode: 0o700 });

  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  try {
    writeFileSync(temporaryPath, content, { encoding: 'utf8', mode: 0o600, flag: 'w' });
    if (process.platform !== 'win32') chmodSync(temporaryPath, 0o600);
    renameSync(temporaryPath, filePath);
  } catch (error) {
    rmSync(temporaryPath, { force: true });
    throw error;
  }
};

export const readSecretFile = (filePath: string): SecretRead => {
  if (!existsSync(filePath)) return { ok: false, reason: 'missing' };
  try {
    if (process.platform !== 'win32' && (statSync(filePath).mode & 0o077) !== 0) {
      return { ok: false, reason: 'too_open' };
    }
    return { ok: true, content: readFileSync(filePath, 'utf8') };
  } catch {
    return { ok: false, reason: 'unreadable' };
  }
};

export const removeSecretFile = (filePath: string): void => {
  rmSync(filePath, { force: true });
};
