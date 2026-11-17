import { createContext, useContext, type ComponentType, type ReactNode } from 'react';

export interface PowerSetupProps {
  /** Config entry of the TV whose power-on recipe is set up. */
  entryId: string;
  /** The media player of the TV, for the «Prova ad accenderla» of the last screen. */
  mediaPlayerEntityId: string | null;
  /** The person is done (or left the step). */
  onFinished: () => void;
}

/** The power-on step («Accensione dalla rete») of a TV that is already added. */
export type PowerSetupComponent = ComponentType<PowerSetupProps>;

const PowerSetupContext = createContext<PowerSetupComponent | null>(null);

/**
 * The step lives in the templates; the details of the TV (a widget) cannot import them. The
 * launcher screen hands the component over here, like it does for the add-device flow.
 */
export function PowerSetupProvider({
  value,
  children,
}: {
  value: PowerSetupComponent;
  children: ReactNode;
}) {
  return <PowerSetupContext.Provider value={value}>{children}</PowerSetupContext.Provider>;
}

/** The step, or null where there is no launcher (previews, tests of a single widget). */
export function usePowerSetup(): PowerSetupComponent | null {
  return useContext(PowerSetupContext);
}
