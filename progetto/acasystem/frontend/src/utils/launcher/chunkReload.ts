/**
 * After a deploy, old tabs may ask for code chunks that no longer exist: reload once, as the
 * legacy entry did (same session key, so the two entries never loop).
 */
const RELOAD_KEY = 'tunet_chunk_reload_once';

export function isChunkLoadError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : String((error as { message?: unknown } | null)?.message ?? error ?? '');
  const text = message.toLowerCase();
  return (
    text.includes('failed to fetch dynamically imported module') ||
    text.includes('importing a module script failed') ||
    text.includes('loading chunk')
  );
}

export function reloadForChunkErrorOnce(): void {
  const win = globalThis.window;
  if (!win) return;
  try {
    if (win.sessionStorage.getItem(RELOAD_KEY) === '1') return;
    win.sessionStorage.setItem(RELOAD_KEY, '1');
  } catch {
    return;
  }
  win.history.go(0);
}
