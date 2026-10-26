import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isSecretInsideDataDir } from '../config/devices.ts';
import { SOURCE_DIR } from '../config/paths.ts';

/**
 * D1, ADR-0022 point 3 and C-16: the secret of the service identity sits in a volume of its own,
 * not in the data volume that cold copies include. The compose file is the place where that is
 * decided, so it is checked here. The test is skipped where the file is not next to the sources
 * (for example inside the image).
 */
const COMPOSE_PATH = join(SOURCE_DIR, '..', '..', '..', 'compose.tunet.yaml');

const readComposeLines = (): string[] => readFileSync(COMPOSE_PATH, 'utf8').split(/\r?\n/);

const environmentValue = (lines: string[], name: string): string | null => {
  const line = lines.find((entry) => entry.trim().startsWith(`${name}:`));
  return line ? line.slice(line.indexOf(':') + 1).trim().replace(/^"|"$/g, '') : null;
};

const mountPathOf = (lines: string[], volume: string): string | null => {
  const line = lines.find((entry) => entry.trim().startsWith(`- ${volume}:`));
  return line ? line.trim().slice(`- ${volume}:`.length) : null;
};

describe.skipIf(!existsSync(COMPOSE_PATH))('the secret of the service identity in compose', () => {
  it('declares a named volume separate from tunet-data', () => {
    const lines = readComposeLines();
    const top = lines.slice(lines.findIndex((entry) => entry.startsWith('volumes:')) + 1);
    const declared = top
      .filter((entry) => /^ {2}[\w-]+:\s*$/.test(entry))
      .map((entry) => entry.trim().replace(':', ''));
    expect(declared).toContain('tunet-data');
    expect(declared).toContain('tunet-service-secret');
  });

  it('mounts it outside DATA_DIR and points TUNET_SERVICE_SECRET_FILE inside the mount', () => {
    const lines = readComposeLines();
    const dataDir = environmentValue(lines, 'DATA_DIR');
    const secretFile = environmentValue(lines, 'TUNET_SERVICE_SECRET_FILE');
    const dataMount = mountPathOf(lines, 'tunet-data');
    const secretMount = mountPathOf(lines, 'tunet-service-secret');

    expect(dataDir).toBe(dataMount);
    expect(secretMount).toBeTruthy();
    expect(secretFile?.startsWith(`${secretMount}/`)).toBe(true);
    // The check that `activate` makes before saving accepts exactly this location.
    expect(isSecretInsideDataDir(secretFile ?? '', dataDir ?? '')).toBe(false);
  });

  it('does not allow the secret in the data volume as a standing choice', () => {
    expect(readComposeLines().join('\n')).not.toContain('TUNET_SERVICE_SECRET_ALLOW_DATA_DIR');
  });
});
