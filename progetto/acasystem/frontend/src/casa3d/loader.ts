/**
 * Loader of the Casa 3D bundle (ADR-0014, T3).
 *
 * The bundle is not part of the frontend build: the backend serves it from `/casa3d/` (T2b) with
 * file names that carry the content hash. The only fixed address is `manifest.json`, which is never
 * cached and names the entry file. This module reads the manifest, checks that the entry is a
 * file of the same folder (the manifest cannot send the page to another place), imports it and
 * waits until the elements are defined. The elements are registered by the entry itself.
 */

/** The elements the entry registers. */
export const CASA3D_ELEMENTS = ['fp3d-view3d', 'fp3d-room-panel'] as const;

/** Where the entry is looked for, and how long the import may take before it counts as failed. */
const READY_TIMEOUT_MS = 15_000;

/** An entry file name: `casa3d-<hash>.js`, nothing that could leave the folder. */
const ENTRY_NAME = /^casa3d-[A-Za-z0-9]+\.js$/;

export interface Casa3dManifest {
  name: string;
  version: string;
  entry: string;
  bundles: Record<string, { file: string; bytes: number; sha256: string }>;
}

export interface LoadedCasa3d {
  manifest: Casa3dManifest;
  /** Address of the folder the bundle was loaded from. */
  base: string;
}

export interface Casa3dLoaderDeps {
  /** Address of the page: the folder `casa3d/` is resolved against it. */
  documentUrl?: string;
  fetchImpl?: typeof fetch;
  importImpl?: (url: string) => Promise<unknown>;
  whenDefined?: (name: string) => Promise<unknown>;
  timeoutMs?: number;
}

function currentDocumentUrl(): string {
  if (typeof document !== 'undefined' && document.baseURI) return document.baseURI;
  if (typeof location !== 'undefined' && location.href) return location.href;
  return 'http://localhost/';
}

/** Folder of the bundle: next to the app, like the `/ha` proxy (an app in a sub-path keeps working). */
export function resolveCasa3dBase(documentUrl: string): string {
  const url = new URL('./casa3d/', documentUrl);
  return `${url.origin}${url.pathname}`;
}

/** Checks the manifest and returns it; throws a readable error when it is not what the build writes. */
export function parseManifest(raw: unknown): Casa3dManifest {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('Il manifest di Casa 3D non è valido.');
  }
  const record = raw as Record<string, unknown>;
  const { entry, bundles, name, version } = record;
  if (typeof entry !== 'string' || !ENTRY_NAME.test(entry)) {
    throw new Error('Il manifest di Casa 3D indica un file di avvio non valido.');
  }
  if (typeof bundles !== 'object' || bundles === null) {
    throw new Error('Il manifest di Casa 3D non elenca i pacchetti.');
  }
  return {
    name: typeof name === 'string' ? name : 'casa3d',
    version: typeof version === 'string' ? version : '',
    entry,
    bundles: bundles as Casa3dManifest['bundles'],
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    );
  });
}

/** Loads the bundle once per call; use `loadCasa3d` for the shared, cached load. */
export async function fetchAndImportCasa3d(deps: Casa3dLoaderDeps = {}): Promise<LoadedCasa3d> {
  const base = resolveCasa3dBase(deps.documentUrl ?? currentDocumentUrl());
  const doFetch = deps.fetchImpl ?? ((input, init) => fetch(input, init));
  const doImport =
    deps.importImpl ?? ((url: string) => import(/* @vite-ignore */ url) as Promise<unknown>);
  const whenDefined =
    deps.whenDefined ?? ((name: string) => globalThis.customElements.whenDefined(name));

  const response = await doFetch(`${base}manifest.json`, {
    cache: 'no-store',
    credentials: 'same-origin',
  });
  if (!response.ok) {
    throw new Error(`Casa 3D non è disponibile su questo server (${response.status}).`);
  }
  const manifest = parseManifest(await response.json());
  const entryUrl = new URL(manifest.entry, base);
  // Same folder, same origin: whatever the manifest says, nothing else is imported.
  if (
    entryUrl.origin !== new URL(base).origin ||
    !entryUrl.pathname.startsWith(new URL(base).pathname)
  ) {
    throw new Error('Il file di avvio di Casa 3D non è nella cartella prevista.');
  }
  const ms = deps.timeoutMs ?? READY_TIMEOUT_MS;
  await withTimeout(doImport(entryUrl.href), ms, 'Il caricamento di Casa 3D è scaduto.');
  await withTimeout(
    Promise.all(CASA3D_ELEMENTS.map((element) => whenDefined(element))),
    ms,
    'Gli elementi di Casa 3D non sono stati registrati.'
  );
  return { manifest, base };
}

let shared: Promise<LoadedCasa3d> | null = null;

/** The bundle is loaded once; a failed load is forgotten so that a retry starts again. */
export function loadCasa3d(): Promise<LoadedCasa3d> {
  if (!shared) {
    shared = fetchAndImportCasa3d().catch((error: unknown) => {
      shared = null;
      throw error;
    });
  }
  return shared;
}

/** For tests: forgets the shared load and the preload. */
export function resetCasa3dLoader(): void {
  shared = null;
  preloading = null;
}

/** A bundle file name the preload accepts: the entry or the 3D bundle, both of the same folder. */
const PRELOAD_NAME = /^casa3d-(?:3d-)?[A-Za-z0-9]+\.js$/;

export interface Casa3dPreloadDeps {
  documentUrl?: string;
  fetchImpl?: typeof fetch;
  doc?: Document;
}

/**
 * `<link rel="modulepreload">` for the entry and the 3D bundle (ADR-0014, section 2): the browser
 * fetches and compiles the two files, and runs neither, so a page next to the one on screen is
 * ready when it is reached without creating anything of the 3D view. The links name the same
 * addresses the later import uses, so nothing is fetched twice. Returns the addresses; a missing
 * manifest is an error the caller may ignore (the page still opens, with its own message).
 */
export async function fetchAndPreloadCasa3d(deps: Casa3dPreloadDeps = {}): Promise<string[]> {
  const base = resolveCasa3dBase(deps.documentUrl ?? currentDocumentUrl());
  const doFetch = deps.fetchImpl ?? ((input, init) => fetch(input, init));
  const doc = deps.doc ?? document;
  const response = await doFetch(`${base}manifest.json`, {
    cache: 'no-store',
    credentials: 'same-origin',
  });
  if (!response.ok)
    throw new Error(`Casa 3D non è disponibile su questo server (${response.status}).`);
  const manifest = parseManifest(await response.json());
  const files = [manifest.entry, manifest.bundles['3d']?.file].filter(
    (file): file is string => typeof file === 'string' && PRELOAD_NAME.test(file)
  );
  const hrefs: string[] = [];
  for (const file of files) {
    const href = new URL(file, base).href;
    hrefs.push(href);
    const exists = Array.from(doc.head.querySelectorAll('link[rel="modulepreload"]')).some(
      (link) => (link as HTMLLinkElement).href === href
    );
    if (exists) continue;
    const link = doc.createElement('link');
    link.rel = 'modulepreload';
    link.href = href;
    doc.head.appendChild(link);
  }
  return hrefs;
}

let preloading: Promise<string[]> | null = null;

/** The preload happens once; a failed one is forgotten so that a later page start tries again. */
export function preloadCasa3d(): Promise<string[]> {
  if (!preloading) {
    preloading = fetchAndPreloadCasa3d().catch((error: unknown) => {
      preloading = null;
      throw error;
    });
  }
  return preloading;
}
