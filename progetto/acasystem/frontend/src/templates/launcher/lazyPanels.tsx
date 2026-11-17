/**
 * The panels the launcher opens on request (REP-20261029-001, step 9): the add-widget sheet, the
 * widget settings, the page kinds, «Trova dispositivi», the details, the console, the stack sheet
 * and the add-device flow. They are not needed for the first paint, so each one is a chunk of its
 * own; the screen asks for all of them when the browser is idle after the first frame
 * (`usePanelsReady`), so on the tablet a sheet opens from memory, with no wait and no blank. A
 * panel opened before that loads on demand, and its fallback is empty because a closed sheet draws
 * nothing and an open one animates in as soon as it exists.
 */
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import type { DiscoveredFlowProps } from '@/hooks/launcher/DiscoveredFlowContext';
import type { PowerSetupProps } from '@/hooks/launcher/PowerSetupContext';
import { whenIdle } from '@/utils/launcher/whenIdle';

// Through the index of the sheets: one chunk for the two, and a single place for the tests to mock.
const loadSheets = () => import('../sheets');
const loadAddWidgetSheet = loadSheets;
const loadWidgetSettingsSheet = loadSheets;
const loadCategoryPageSheet = () => import('../sheets/CategoryPageSheet');
const loadDiscoveryScreen = () => import('../discovery/DiscoveryScreen');
const loadDetailsSheet = () => import('./DetailsSheet');
const loadWidgetConsole = () => import('./WidgetConsole');
const loadUtilityTool = () => import('./UtilityToolScreen');
const loadStackSheet = () => import('./StackSheet');
const loadDiscoveredAddFlow = () => import('../devices/DiscoveredAddFlow');
const loadPowerSetup = () => import('../devices/PowerSetup');

export const LazyAddWidgetSheet = lazy(() =>
  loadAddWidgetSheet().then((m) => ({ default: m.AddWidgetSheet }))
);
export const LazyWidgetSettingsSheet = lazy(() =>
  loadWidgetSettingsSheet().then((m) => ({ default: m.WidgetSettingsSheet }))
);
export const LazyCategoryPageSheet = lazy(() =>
  loadCategoryPageSheet().then((m) => ({ default: m.CategoryPageSheet }))
);
export const LazyDiscoveryScreen = lazy(() =>
  loadDiscoveryScreen().then((m) => ({ default: m.DiscoveryScreen }))
);
export const LazyDetailsSheet = lazy(() =>
  loadDetailsSheet().then((m) => ({ default: m.DetailsSheet }))
);
export const LazyWidgetConsole = lazy(() =>
  loadWidgetConsole().then((m) => ({ default: m.WidgetConsole }))
);
export const LazyUtilityToolScreen = lazy(() => loadUtilityTool().then((m) => ({ default: m.UtilityToolScreen })));
export const LazyStackSheet = lazy(() => loadStackSheet().then((m) => ({ default: m.StackSheet })));
const InnerDiscoveredAddFlow = lazy(() =>
  loadDiscoveredAddFlow().then((m) => ({ default: m.DiscoveredAddFlow }))
);

/** The add-device flow handed to the widgets through `DiscoveredFlowContext`. */
export function DiscoveredAddFlowLazy(props: DiscoveredFlowProps) {
  return (
    <Suspense fallback={null}>
      <InnerDiscoveredAddFlow {...props} />
    </Suspense>
  );
}

const InnerPowerSetup = lazy(() =>
  loadPowerSetup().then((m) => ({ default: m.PowerSetup }))
);

/** The power-on step handed to the TV details through `PowerSetupContext`. */
export function PowerSetupLazy(props: PowerSetupProps) {
  return (
    <Suspense fallback={null}>
      <InnerPowerSetup {...props} />
    </Suspense>
  );
}

/** Loads the chunks of every panel (what `usePanelsReady` does when idle). */
export function preloadLauncherPanels(): Promise<unknown> {
  return Promise.all([
    loadAddWidgetSheet(),
    loadWidgetSettingsSheet(),
    loadCategoryPageSheet(),
    loadDiscoveryScreen(),
    loadDetailsSheet(),
    loadWidgetConsole(),
    loadUtilityTool(),
    loadStackSheet(),
    loadDiscoveredAddFlow(),
    loadPowerSetup(),
  ]);
}

/** True once the browser has been idle after the first paint and the panels' chunks are in. */
export function usePanelsReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    const cancel = whenIdle(() => {
      preloadLauncherPanels().then(
        () => live && setReady(true),
        () => undefined
      );
    });
    return () => {
      live = false;
      cancel();
    };
  }, []);
  return ready;
}

/**
 * Mounts a panel when it is wanted (`when`) or when all of them are in (`ready`), and keeps it
 * mounted afterwards so a sheet that closes runs its exit animation.
 */
export function LazyPanel({
  when,
  ready,
  children,
}: {
  when: boolean;
  ready: boolean;
  children: ReactNode;
}) {
  const [kept, setKept] = useState(false);
  const mounted = kept || when || ready;
  if (mounted && !kept) setKept(true);
  return mounted ? <Suspense fallback={null}>{children}</Suspense> : null;
}
