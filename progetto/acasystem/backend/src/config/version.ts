import { readFileSync } from 'node:fs';
import { PACKAGE_JSON_PATH } from './paths.ts';
import { readProperty } from '../helpers/objects.ts';

/** Versione del backend letta da `backend/package.json`; 'unknown' se illeggibile. */
export const resolveAppVersion = (packageJsonPath: string = PACKAGE_JSON_PATH): string => {
  try {
    const pkg: unknown = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    const version = readProperty(pkg, 'version');
    return typeof version === 'string' && version ? version : 'unknown';
  } catch {
    return 'unknown';
  }
};
