import type { HttpClient } from './ports.ts';

export interface CentralUpdateWait {
  kind: 'ready' | 'updating';
  refreshHealth: boolean;
}

/** Il controllore della centrale decide/installera; il guscio non interroga GitHub e non apre WS. */
export async function waitForCentralUpdate(
  http: HttpClient,
  origin: string,
  shellVersion: string,
  installedVersion?: string | null,
): Promise<CentralUpdateWait> {
  // Poll del controllore (2s) + budget GitHub (15s), prima di aprire connessioni che ne impediscono il drain.
  const checkingDeadline = Date.now() + 20_000;
  let updateDeadline: number | null = null;
  let url = `${origin}/api/updates/check?shellVersion=${encodeURIComponent(shellVersion)}`;
  while (true) {
    const remaining = (updateDeadline ?? checkingDeadline) - Date.now();
    if (remaining <= 0) return { kind: updateDeadline === null ? 'ready' : 'updating', refreshHealth: true };
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeoutMs = Math.min(remaining, updateDeadline === null ? 3_000 : 1_000);
      // Il limite vale anche se un adapter difettoso non rispetta il proprio timeout.
      const body = await Promise.race([
        http.getJson(url, timeoutMs),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Update check timeout')), timeoutMs); }),
      ]);
      const state = typeof body === 'object' && body !== null ? body as Record<string, unknown> : null;
      if (state?.status === 'updating') updateDeadline ??= Date.now() + 45_000;
      else if (state?.status !== 'checking') {
        if (updateDeadline === null || state?.enabled === false ||
          ['unconfigured', 'current', 'available', 'deferred', 'failed', 'offline'].includes(String(state?.status))) {
          return { kind: 'ready', refreshHealth: updateDeadline !== null || !state || ['failed', 'offline'].includes(String(state.status)) ||
            (state.status === 'current' && installedVersion !== undefined && typeof state.version === 'string' && state.version !== installedVersion) };
        }
      }
    } catch {
      // Vecchie centrali/404/offline non impediscono l'uso della versione installata sana.
      if (updateDeadline === null) return { kind: 'ready', refreshHealth: true };
      // Durante il riavvio della centrale la porta puo sparire: attendere entro il budget.
    } finally { if (timer !== undefined) clearTimeout(timer); }
    url = `${origin}/api/updates/status`;
    const pause = Math.min(250, Math.max(0, (updateDeadline ?? checkingDeadline) - Date.now()));
    if (pause) await new Promise<void>((resolve) => setTimeout(resolve, pause));
  }
}
