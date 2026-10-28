import { useEffect, useState } from 'react';
import { useDiscoveryScreenOpener } from '@/hooks/launcher/DiscoveryScreenContext';
import type { NativeTvBrand } from '@/utils/devices/tvBrand';

/** How long the «Collega la TV» message stays when nobody closes it. */
export const CAST_HINT_MS = 10000;

/**
 * A TV bound to its Google Cast media player, with no native integration of its brand connected
 * (an LG that HA added through Cast by itself): «turn on» there starts the Home Assistant Cast
 * app on the TV, and «turn off» only quits that app. The power key does not call it; it shows a
 * short message with the way to connect the TV properly. `block()` returns true when it blocked.
 */
export function useCastPowerGuard(brand: NativeTvBrand | null) {
  const [shown, setShown] = useState(false);
  const showDiscovery = useDiscoveryScreenOpener();

  useEffect(() => {
    if (!shown) return undefined;
    const timer = setTimeout(() => setShown(false), CAST_HINT_MS);
    return () => clearTimeout(timer);
  }, [shown]);

  return {
    brand,
    shown: shown && brand !== null,
    block: (): boolean => {
      if (!brand) return false;
      setShown(true);
      return true;
    },
    close: () => setShown(false),
    /** Opens «Trova dispositivi»; null where there is no launcher. */
    connect: showDiscovery
      ? () => {
          setShown(false);
          showDiscovery();
        }
      : null,
  };
}

export type CastPowerGuard = ReturnType<typeof useCastPowerGuard>;
