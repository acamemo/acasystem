import { useState } from 'react';
import { Body, Button } from '@/components/primitives';
import { repairService } from '@/api/devicesApi';

/** Texts of the notice; the sentence about the service never names the installer. */
export const repairTexts = {
  serviceNotActive: 'Il servizio dei dispositivi non è attivo.',
  repair: 'Ripara il servizio',
  repairing: 'Sto riparando…',
  failed: 'Non sono riuscito a riparare il servizio. Riprova.',
};

/**
 * «Il servizio dei dispositivi non è attivo» with the button anyone can tap: «Ripara il servizio»
 * asks the server to activate it again. On success `onRepaired` refreshes the screen (the notice
 * goes away with the data); otherwise the server's sentence is shown. Never names the installer.
 */
export function RepairServiceNotice({ onRepaired }: { onRepaired: () => void }) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const repair = () => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    repairService()
      .then((result) => {
        if (result.active) onRepaired();
        else setProblem(result.message);
      })
      .catch(() => setProblem(repairTexts.failed))
      .finally(() => setBusy(false));
  };

  return (
    <div className="aca-device-flow" data-testid="repair-service">
      <Body size="sm" role="alert">
        {repairTexts.serviceNotActive}
      </Body>
      {problem && (
        <Body size="sm" role="status">
          {problem}
        </Body>
      )}
      <Button variant="primary" size="md" disabled={busy} onClick={repair}>
        {busy ? repairTexts.repairing : repairTexts.repair}
      </Button>
    </div>
  );
}
