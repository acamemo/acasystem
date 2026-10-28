/**
 * Entering and leaving the demo mode (`#/mockup`, REP-20261028-005). `enterDemo` runs before the
 * app mounts and sets up the visit (`session.ts`); `leaveDemo` takes it down, switches the flag
 * off in the real tab storage and reloads the page on the real app.
 */
import { DEMO_FLAG_KEY } from '@/routes/mockupRoutes';
import { openMockupSession, type MockupSession } from './session';

let current: MockupSession | null = null;

/** How the page is reloaded; a test replaces it. */
export const pageControl = { reload: () => window.location.reload() };

export function enterDemo(): MockupSession {
  current ??= openMockupSession();
  return current;
}

export function leaveDemo(): void {
  current?.close();
  current = null;
  try {
    window.sessionStorage.removeItem(DEMO_FLAG_KEY);
  } catch {
    // The flag lives in the tab only: without storage the reload below starts the real app.
  }
  window.location.hash = '#/';
  pageControl.reload();
}
