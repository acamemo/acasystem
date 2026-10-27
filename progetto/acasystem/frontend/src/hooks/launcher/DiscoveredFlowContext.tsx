import { createContext, useContext, type ComponentType, type ReactNode } from 'react';
import type { EntryDto } from '@/@types/devices';
import type { DeviceFamily } from '@/utils/devices/classify';

export interface DiscoveredFlowProps {
  /**
   * The flow Home Assistant opened when it found the device; null to start from the catalogue of
   * brands («Non lo trovi? Aggiungi per marca», F4).
   */
  flowId: string | null;
  family: DeviceFamily | null;
  /** The person left; an open flow has been cancelled. */
  onExit: () => void;
  /** The device is added and in the live data. */
  onDone: (entry: EntryDto) => void;
}

/** The screens of «Aggiungi un dispositivo» for a discovered device. */
export type DiscoveredFlowComponent = ComponentType<DiscoveredFlowProps>;

const DiscoveredFlowContext = createContext<DiscoveredFlowComponent | null>(null);

/**
 * The flow lives in the templates; the details of «Rileva dispositivi» (a widget) cannot import
 * them. The launcher screen hands the component over here, like it does for the add sheet.
 */
export function DiscoveredFlowProvider({
  value,
  children,
}: {
  value: DiscoveredFlowComponent;
  children: ReactNode;
}) {
  return <DiscoveredFlowContext.Provider value={value}>{children}</DiscoveredFlowContext.Provider>;
}

/** The flow, or null where there is no launcher (previews, tests of a single widget). */
export function useDiscoveredFlow(): DiscoveredFlowComponent | null {
  return useContext(DiscoveredFlowContext);
}
