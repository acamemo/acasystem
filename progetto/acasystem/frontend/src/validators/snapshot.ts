/**
 * Validatori delle istantanee della dashboard e dei file di importazione dei profili.
 */
import type { LauncherLayout } from '@/@types/launcher';
import type { DashboardSnapshot } from '@/@types/snapshot';
import { isObject, type UnknownRecord } from './guards';
import { sanitizeLauncherLayout } from './launcher';

/**
 * Launcher layout carried by a snapshot layout section: undefined when the snapshot has none
 * (old clients), null when it is present but invalid, the cleaned layout otherwise.
 */
export function snapshotLauncherLayout(layout: UnknownRecord): LauncherLayout | null | undefined {
  if (!('launcherLayout' in layout) || layout.launcherLayout === undefined) return undefined;
  return sanitizeLauncherLayout(layout.launcherLayout);
}

/** Controllo leggero della struttura: versione numerica, layout e aspetto oggetto. */
export function isValidSnapshot(obj: unknown): obj is DashboardSnapshot {
  if (!isObject(obj)) return false;
  if (!obj.version || typeof obj.version !== 'number') return false;
  if (!isObject(obj.layout)) return false;
  if (!isObject(obj.appearance)) return false;
  return true;
}

/**
 * Estrae il contenuto di un file importato: accetta sia l'istantanea diretta
 * sia il formato di esportazione `{ format, version, data }`.
 */
export function unwrapImportedSnapshot(candidate: unknown): UnknownRecord | null {
  if (!isObject(candidate)) {
    return null;
  }

  const payload = isObject(candidate.data) ? candidate.data : candidate;

  if (!isObject(payload)) {
    return null;
  }

  return payload;
}

/** Profilo pronto da applicare: dati presenti e strutturalmente validi. */
export function isApplicableProfileData(data: unknown): data is UnknownRecord {
  return isObject(data);
}
