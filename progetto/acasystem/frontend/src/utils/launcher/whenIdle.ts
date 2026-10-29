/**
 * Runs `task` when the browser is idle (REP-20261029-001, step 9): after the first paint, so that
 * loading the chunks of the sheets does not compete with the launcher's first frames. Falls back
 * to a timer where `requestIdleCallback` is missing (Safari, jsdom). Returns a function that
 * cancels it.
 */
export function whenIdle(task: () => void, timeoutMs = 2000): () => void {
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    const handle = window.requestIdleCallback(task, { timeout: timeoutMs });
    return () => window.cancelIdleCallback(handle);
  }
  const timer = setTimeout(task, 300);
  return () => clearTimeout(timer);
}
