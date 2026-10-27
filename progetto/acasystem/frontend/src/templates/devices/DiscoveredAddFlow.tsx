import type { DiscoveredFlowProps } from '@/hooks/launcher/DiscoveredFlowContext';
import { AddDeviceFlow } from './AddDeviceFlow';

/**
 * «Aggiungi un dispositivo» from «Rileva dispositivi». With a flow id (F2) the flow Home Assistant
 * opened for a device it found is taken over; without one (F4, «Aggiungi per marca») the person
 * starts from the catalogue of brands, like the installer; with a television id (F5) the server
 * starts the integration of that television by itself and the flow opens on its PIN or «Consenti».
 * At the end the whole entry is handed to the caller, which opens «Aggiungi un widget» on it.
 */
export function DiscoveredAddFlow({
  flowId,
  tvId = null,
  family,
  onExit,
  onDone,
}: DiscoveredFlowProps) {
  return (
    <AddDeviceFlow
      kind={family ?? 'media'}
      discoveredFlowId={flowId}
      tvId={tvId}
      onExit={onExit}
      onDone={() => undefined}
      onEntryDone={onDone}
    />
  );
}
