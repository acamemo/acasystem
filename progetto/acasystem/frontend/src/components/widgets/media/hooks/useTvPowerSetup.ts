import { useState } from 'react';
import { usePowerSetup, type PowerSetupComponent } from '@/hooks/launcher/PowerSetupContext';
import type { Entity } from '../model/entity';
import { testi } from '../testi';
import { refreshTvWake, useTvPowerRecipe } from './useTvWake';

/**
 * «Configura l'accensione» / «Modifica l'accensione» in the TV details: opens the power-on step
 * of the TV in place. Offered only where there is a launcher to host the step, the TV has a
 * config entry and its integration has a recipe; the label says whether the recipe exists. When
 * the step ends, the widgets re-read whether the TV can be woken.
 */
export interface TvPowerSetup {
  /** The step is open: the details show it instead of their sections. */
  open: boolean;
  /** Label of the action, or null when it is not offered (or the recipe is still being read). */
  label: string | null;
  /** True when the recipe does not exist yet: the action is the main one. */
  missing: boolean;
  entryId: string;
  Step: PowerSetupComponent | null;
  show: () => void;
  close: () => void;
}

export function useTvPowerSetup(entity: Entity | undefined): TvPowerSetup {
  const Step = usePowerSetup();
  const { entryId, configured } = useTvPowerRecipe(entity);
  const [open, setOpen] = useState(false);
  const offered = Step !== null && entryId !== '' && configured !== null;
  return {
    open: open && offered,
    label: offered ? (configured ? testi.modificaAccensione : testi.configuraAccensione) : null,
    missing: configured === false,
    entryId,
    Step,
    show: () => setOpen(true),
    close: () => {
      setOpen(false);
      if (entryId) refreshTvWake(entryId);
    },
  };
}
