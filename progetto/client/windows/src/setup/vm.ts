import { readFile } from 'node:fs/promises';
import { join, win32 } from 'node:path';
import { INSTALL_INFO_FILE, SCRIPT_NAME } from './constants.ts';
import type { SetupDeps } from './deps.ts';

/** VirtualBox e creazione della VM tramite Installa-Centrale.ps1. */

/** VBoxManage.exe in %ProgramW6432% (o %ProgramFiles%); null se VirtualBox non è installato. */
export const findVBoxManage = async (deps: SetupDeps): Promise<string | null> => {
  const bases = [deps.env.ProgramW6432, deps.env.ProgramFiles].filter((base): base is string => Boolean(base));
  for (const base of bases) {
    const candidate = win32.join(base, 'Oracle', 'VirtualBox', 'VBoxManage.exe');
    if (await deps.pathExists(candidate)) return candidate;
  }
  return null;
};

export interface VmInfo {
  /** Valore di VMState (es. «running», «poweroff»). */
  state: string | null;
  /** MAC della prima scheda, senza separatori e in minuscolo. */
  mac: string | null;
}

export const parseShowVmInfo = (text: string): VmInfo => {
  const state = /^VMState="([^"]*)"/m.exec(text)?.[1] ?? null;
  const mac = /^macaddress1="([0-9a-fA-F]{12})"/m.exec(text)?.[1]?.toLowerCase() ?? null;
  return { state, mac };
};

/** Stato e MAC della VM; null se VBoxManage non risponde. */
export const readVmInfo = async (deps: SetupDeps, vbox: string, vmId: string): Promise<VmInfo | null> => {
  const result = await deps.exec(vbox, ['showvminfo', vmId, '--machinereadable'], { timeoutMs: 20_000 });
  if (result.code !== 0) return null;
  return parseShowVmInfo(result.stdout);
};

/** Ultimo messaggio «ERRORE: …» dello script: è già scritto per l'utente, in italiano. */
export const extractScriptError = (stdout: string): string | null => {
  let found: string | null = null;
  for (const line of stdout.split(/\r?\n/)) {
    const match = /^\s*ERRORE:\s*(.+?)\s*$/.exec(line);
    if (match?.[1]) found = match[1];
  }
  return found;
};

export interface InstallInfo {
  vmId: string;
  nomeVm: string;
  cartella: string;
  attivita: string;
}

/** installazione.json: PowerShell 5.1 lo scrive con BOM. */
export const readInstallInfo = async (centraleDir: string): Promise<InstallInfo | null> => {
  try {
    const raw = (await readFile(join(centraleDir, INSTALL_INFO_FILE), 'utf8')).replace(/^\uFEFF/, '');
    const data = JSON.parse(raw) as Partial<InstallInfo>;
    if (typeof data.vmId !== 'string' || !data.vmId) return null;
    return {
      vmId: data.vmId,
      nomeVm: String(data.nomeVm ?? ''),
      cartella: String(data.cartella ?? centraleDir),
      attivita: String(data.attivita ?? ''),
    };
  } catch {
    return null;
  }
};

export const GENERIC_CREATE_ERROR =
  'La creazione della centrale non è riuscita. Riprova; se il problema continua, contatta l’assistenza.';

export type CreateVmResult = { ok: true; info: InstallInfo } | { ok: false; message: string };

export const createVm = async (
  deps: SetupDeps,
  options: { scriptsDir: string; centraleDir: string; vdiPath: string; signal?: AbortSignal }
): Promise<CreateVmResult> => {
  const script = join(options.scriptsDir, SCRIPT_NAME);
  const result = await deps.exec(
    'powershell.exe',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      script,
      '-Cartella',
      options.centraleDir,
      '-Disco',
      options.vdiPath,
      '-NonInterattivo',
    ],
    { timeoutMs: deps.tuning.createTimeoutMs, ...(options.signal ? { signal: options.signal } : {}) }
  );
  if (result.code !== 0) {
    return { ok: false, message: extractScriptError(result.stdout) ?? GENERIC_CREATE_ERROR };
  }
  const info = await readInstallInfo(options.centraleDir);
  return info ? { ok: true, info } : { ok: false, message: GENERIC_CREATE_ERROR };
};
