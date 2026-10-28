import { createContext, useContext, type ReactNode } from 'react';

/** Opens «Trova dispositivi», the screen of the devices found on the network. */
export type ShowDiscoveryScreen = () => void;

const DiscoveryScreenContext = createContext<ShowDiscoveryScreen | null>(null);

/**
 * The launcher screen owns «Trova dispositivi» (a screen over the launcher); this lets the widget
 * of the same name open it without importing the templates.
 */
export function DiscoveryScreenProvider({
  value,
  children,
}: {
  value: ShowDiscoveryScreen;
  children: ReactNode;
}) {
  return (
    <DiscoveryScreenContext.Provider value={value}>{children}</DiscoveryScreenContext.Provider>
  );
}

/** The opener, or null where there is no launcher (previews, tests of a single widget). */
export function useDiscoveryScreenOpener(): ShowDiscoveryScreen | null {
  return useContext(DiscoveryScreenContext);
}
