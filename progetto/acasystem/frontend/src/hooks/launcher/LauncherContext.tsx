import { createContext, useContext, type ReactNode } from 'react';
import type { LauncherApi } from '@/@types/launcher';

const LauncherContext = createContext<LauncherApi | null>(null);

export function LauncherProvider({ value, children }: { value: LauncherApi; children: ReactNode }) {
  return <LauncherContext.Provider value={value}>{children}</LauncherContext.Provider>;
}

/** Launcher state and actions (pages, placements, edit mode); see LauncherApi. */
export function useLauncher(): LauncherApi {
  const launcher = useContext(LauncherContext);
  if (!launcher) throw new Error('useLauncher must be used inside LauncherProvider');
  return launcher;
}

/** The launcher when one is provided, null otherwise (previews, tests of a single widget). */
export function useOptionalLauncher(): LauncherApi | null {
  return useContext(LauncherContext);
}
