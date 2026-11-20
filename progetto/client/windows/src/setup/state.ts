import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { STATE_FILE } from './constants.ts';

/** Stato persistito dell'installazione, in `<userData>\centrale-setup.json`. */
export interface PersistedState {
  schema: 1;
  phase: 'creating' | 'preparing' | 'ready';
  vmId?: string;
  ip?: string;
  startedAt?: number;
  readyAt?: number;
  /** Velocità media del download su questo PC (byte/s); descrive la sua connessione. */
  downloadBytesPerSecond?: number;
}

const PHASES = new Set(['creating', 'preparing', 'ready']);

export const loadState = async (userDataDir: string): Promise<PersistedState | null> => {
  try {
    const data = JSON.parse((await readFile(join(userDataDir, STATE_FILE), 'utf8')).replace(/^\uFEFF/, '')) as Record<
      string,
      unknown
    >;
    if (data.schema !== 1 || typeof data.phase !== 'string' || !PHASES.has(data.phase)) return null;
    const state: PersistedState = { schema: 1, phase: data.phase as PersistedState['phase'] };
    if (typeof data.vmId === 'string') state.vmId = data.vmId;
    if (typeof data.ip === 'string') state.ip = data.ip;
    if (typeof data.startedAt === 'number') state.startedAt = data.startedAt;
    if (typeof data.readyAt === 'number') state.readyAt = data.readyAt;
    if (typeof data.downloadBytesPerSecond === 'number' && data.downloadBytesPerSecond > 0) {
      state.downloadBytesPerSecond = data.downloadBytesPerSecond;
    }
    return state;
  } catch {
    return null;
  }
};

/** Scrittura atomica: file temporaneo e rename. */
export const saveState = async (userDataDir: string, state: PersistedState): Promise<void> => {
  await mkdir(userDataDir, { recursive: true });
  const path = join(userDataDir, STATE_FILE);
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  await rename(temporary, path);
};
