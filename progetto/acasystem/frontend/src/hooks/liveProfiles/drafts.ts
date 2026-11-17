import type {
  Configuration,
  EditTarget,
  LiveProfile,
  ProfileChange,
  ProfileOperation,
} from '../../../../contracts/collaboration';
import { DRAFT_QUOTA_BYTES } from '../../../../contracts/collaboration';
import { diffConfiguration } from '../../../../contracts/profileResources';

export interface OfflineDraft {
  id: string;
  houseId: string;
  userId: string;
  profileId: string;
  clientId: string;
  target: EditTarget;
  title: string;
  base: Configuration;
  changes: ProfileChange[];
  expected: Record<string, number>;
  updatedAt: string;
  pendingOperation?: ProfileOperation;
  previousDraftIds?: string[];
}
export function exportDraftFile(draft: OfflineDraft): void {
  const href = URL.createObjectURL(
    new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' })
  );
  const link = document.createElement('a');
  link.href = href;
  link.download = 'acasystem-bozza.json';
  link.click();
  URL.revokeObjectURL(href);
}
const DATABASE = 'acasystem-profile-drafts-v2';
const STORE = 'drafts';
const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).byteLength;
let opened: Promise<IDBDatabase> | undefined;
function database(): Promise<IDBDatabase> {
  if (opened) return opened;
  opened = new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error('La memoria delle bozze non è disponibile in questo browser.'));
      return;
    }
    const request = indexedDB.open(DATABASE, 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE))
        request.result.createObjectStore(STORE, { keyPath: 'id' });
      if (!request.result.objectStoreNames.contains('profiles'))
        request.result.createObjectStore('profiles');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      opened = undefined;
      reject(request.error ?? new Error('Memoria delle bozze non disponibile.'));
    };
    request.onblocked = () =>
      reject(new Error('Chiudi le altre schede ACA per aprire la memoria delle bozze.'));
  });
  return opened;
}
const failure = (transaction: IDBTransaction) =>
  transaction.error ?? new Error('La bozza non è stata salvata.');

export async function listDrafts(houseId: string, userId: string): Promise<OfflineDraft[]> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readonly');
    const request = transaction.objectStore(STORE).getAll();
    request.onsuccess = () =>
      resolve(
        (request.result as OfflineDraft[]).filter(
          (draft) => draft.houseId === houseId && draft.userId === userId
        )
      );
    request.onerror = () => reject(failure(transaction));
  });
}

/** Il conteggio e la scrittura sono nella stessa transazione, anche fra due schede. */
export async function saveDraft(draft: OfflineDraft): Promise<void> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    const store = transaction.objectStore(STORE);
    let quota = false;
    store.getAll().onsuccess = (event) => {
      const existing = (event.target as IDBRequest<OfflineDraft[]>).result;
      const total =
        existing
          .filter((item) => item.id !== draft.id)
          .reduce((sum, item) => sum + bytes(item), 0) + bytes(draft);
      if (total > DRAFT_QUOTA_BYTES) {
        quota = true;
        transaction.abort();
        return;
      }
      store.put(draft);
    };
    transaction.oncomplete = () => resolve();
    transaction.onabort = transaction.onerror = () =>
      reject(
        quota
          ? Object.assign(
              new Error(
                'Memoria bozze piena (10 MiB). Esporta o scarta una bozza prima di continuare.'
              ),
              { code: 'DRAFT_QUOTA' }
            )
          : failure(transaction)
      );
  });
}

export async function deleteDraft(id: string): Promise<void> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onabort = transaction.onerror = () => reject(failure(transaction));
  });
}

/** Widget diversi sono indipendenti; sullo stesso campo una modifica remota è un conflitto. */
export function draftConflicts(draft: OfflineDraft, current: Configuration): boolean {
  const remote = diffConfiguration(draft.base, current);
  const touches = (a: string[], b: string[]) =>
    a.slice(0, Math.min(a.length, b.length)).every((part, index) => part === b[index]);
  return draft.changes.some((local) => remote.some((change) => touches(local.path, change.path)));
}

export async function cacheActiveProfile(key: string, profile: LiveProfile): Promise<void> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('profiles', 'readwrite');
    transaction.objectStore('profiles').put(profile, key);
    transaction.oncomplete = () => resolve();
    transaction.onabort = transaction.onerror = () => reject(failure(transaction));
  });
}

export async function readCachedProfile(key: string): Promise<LiveProfile | null> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('profiles', 'readonly');
    const request = transaction.objectStore('profiles').get(key);
    request.onsuccess = () => resolve((request.result as LiveProfile | undefined) ?? null);
    request.onerror = () => reject(failure(transaction));
  });
}
