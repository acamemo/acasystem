import { Button } from '@/components/primitives';
import { testi } from '../../testi';
import type { TvDetailsState } from './useTvDetailsState';

/**
 * The action under the face of the TV: «Configura l'accensione» next to the sentence that says
 * the power key needs it, «Modifica l'accensione» (quieter) when the TV already has it.
 */
export function TvPowerSetupAction({ tv }: { tv: TvDetailsState }) {
  const setup = tv.powerSetup;
  if (!setup.label) return null;
  return (
    <section className="aca-media-section aca-media-power-setup">
      <Button variant={setup.missing ? 'secondary' : 'control'} size="md" onClick={setup.show}>
        {setup.label}
      </Button>
    </section>
  );
}

/** The power-on step in place of the sections of the details, with «Indietro». */
export function TvPowerSetupStep({ tv }: { tv: TvDetailsState }) {
  const { Step, entryId, close } = tv.powerSetup;
  if (!Step) return null;
  return (
    <div className="aca-media-details">
      <div className="aca-media-section">
        <Button variant="control" size="md" onClick={close}>
          {testi.indietro}
        </Button>
      </div>
      <Step entryId={entryId} mediaPlayerEntityId={tv.mediaPlayerId} onFinished={close} />
    </div>
  );
}
