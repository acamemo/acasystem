/**
 * Entering and leaving the demo mode (`#/mockup`, REP-20261028-005). `enterDemo` runs before the
 * app mounts and sets up the visit (`session.ts`); `leaveDemo` takes it down, switches the flag
 * off in the real tab storage and reloads the page on the real app.
 */
import { DEMO_FLAG_KEY } from '@/routes/mockupRoutes';
import type { MockScenario } from './mockData';
import {
  DISCOVERY_MARK_KEY,
  SCENARIO_KEY,
  openMockupSession,
  storedScenario,
  tabSet,
  type MockupSession,
} from './session';

let current: MockupSession | null = null;

/** How the page is reloaded; a test replaces it. */
export const pageControl = { reload: () => window.location.reload() };

export function enterDemo(): MockupSession {
  current ??= openMockupSession();
  return current;
}

/** The scenario of this visit (the one the demo bar shows). */
export function currentScenario(): MockScenario {
  return current?.scenario ?? storedScenario();
}

/**
 * Switches the state of the house: the choice is kept in the tab, the simulated store is rebuilt
 * by the reload and the demo opens again with it. The storage of the real app is not touched.
 */
export function switchScenario(next: MockScenario): void {
  if (next === currentScenario()) return;
  tabSet(SCENARIO_KEY, next);
  current?.close();
  current = null;
  pageControl.reload();
}

export function leaveDemo(): void {
  current?.close();
  current = null;
  tabSet(SCENARIO_KEY, null);
  tabSet(DISCOVERY_MARK_KEY, null);
  try {
    window.sessionStorage.removeItem(DEMO_FLAG_KEY);
  } catch {
    // The flag lives in the tab only: without storage the reload below starts the real app.
  }
  window.location.hash = '#/';
  pageControl.reload();
}
