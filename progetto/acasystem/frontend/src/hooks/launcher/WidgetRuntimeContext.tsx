import { createContext, useContext, type ReactNode } from 'react';
import type { WidgetRuntime } from '@/@types/launcher';

const WidgetRuntimeContext = createContext<WidgetRuntime | null>(null);

export function WidgetRuntimeProvider({
  value,
  children,
}: {
  value: WidgetRuntime;
  children: ReactNode;
}) {
  return <WidgetRuntimeContext.Provider value={value}>{children}</WidgetRuntimeContext.Provider>;
}

/** Data and actions for widgets; the launcher provides it from Home Assistant, tests from fixtures. */
export function useWidgetRuntime(): WidgetRuntime {
  const runtime = useContext(WidgetRuntimeContext);
  if (!runtime) throw new Error('useWidgetRuntime must be used inside WidgetRuntimeProvider');
  return runtime;
}
