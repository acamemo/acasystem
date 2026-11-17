export type StartupUpdateResult =
  | { kind: 'ready' | 'updating' | 'unhealthy' }
  | { kind: 'reload'; version: string };

interface StartupUpdateOptions {
  demo: boolean;
  appVersion: string;
  userAgent?: string;
  fetcher?: typeof fetch;
  onUpdating?: () => void;
}

/** Prima dei provider/WS: la centrale coordina l'update, il browser attende entro un limite. */
export async function prepareStartupUpdates({ demo, appVersion, userAgent = '', fetcher = fetch, onUpdating }: StartupUpdateOptions): Promise<StartupUpdateResult> {
  if (demo) return { kind: 'ready' };
  const shellVersion = /\bAcasystemShell\/(\d+\.\d+\.\d+)\b/.exec(userAgent)?.[1];
  let url = shellVersion ? `./api/updates/check?shellVersion=${encodeURIComponent(shellVersion)}` : './api/updates/check?clientKind=browser';
  const checkingDeadline = Date.now() + 20_000;
  let updateDeadline: number | null = null;
  let refreshHealth = false;
  let stillUpdating = false;
  let reportedCurrentVersion: string | null = null;
  const read = async (path: string, timeoutMs: number): Promise<Record<string, unknown>> => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        (async () => {
          const response = await fetcher(path, { signal: controller.signal, cache: 'no-store', credentials: 'same-origin', redirect: 'error' });
          if (!response.ok) throw new Error('Startup endpoint unavailable');
          const body: unknown = await response.json();
          if (typeof body !== 'object' || body === null) throw new Error('Startup response invalid');
          return body as Record<string, unknown>;
        })(),
        new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('Startup timeout')); }, timeoutMs); }),
      ]);
    } finally { if (timer !== undefined) clearTimeout(timer); }
  };
  while (true) {
    const remaining = (updateDeadline ?? checkingDeadline) - Date.now();
    if (remaining <= 0) { refreshHealth = true; stillUpdating = updateDeadline !== null; break; }
    try {
      const state = await read(url, Math.min(remaining, updateDeadline === null ? 3_000 : 1_000));
      if (state.status === 'updating') {
        if (updateDeadline === null) { updateDeadline = Date.now() + 45_000; onUpdating?.(); }
      } else if (state.status !== 'checking' && (updateDeadline === null || state.enabled === false ||
        ['unconfigured', 'current', 'available', 'deferred', 'failed', 'offline'].includes(String(state.status)))) {
        if (state.status === 'current' && typeof state.version === 'string' && /^\d+\.\d+\.\d+$/.test(state.version)) reportedCurrentVersion = state.version;
        refreshHealth = updateDeadline !== null || ['failed', 'offline'].includes(String(state.status)) || (reportedCurrentVersion !== null && reportedCurrentVersion !== appVersion);
        break;
      }
    } catch {
      refreshHealth = true;
      if (updateDeadline === null) break;
    }
    url = './api/updates/status';
    const pause = Math.min(250, Math.max(0, (updateDeadline ?? checkingDeadline) - Date.now()));
    if (pause) await new Promise<void>((resolve) => setTimeout(resolve, pause));
  }
  if (refreshHealth) {
    try {
      const health = await read('./api/health', 3_000);
      if (health.status !== 'ok') return { kind: 'unhealthy' };
      // Updating ancora dichiarato dopo il budget: non aprire connessioni che ostacolano il drain.
      if (stillUpdating) return { kind: 'updating' };
      if ((updateDeadline !== null || reportedCurrentVersion !== null) && typeof health.version === 'string' && /^\d+\.\d+\.\d+$/.test(health.version) && health.version !== appVersion) {
        return { kind: 'reload', version: health.version };
      }
    } catch { return { kind: 'unhealthy' }; }
  }
  return { kind: 'ready' };
}
