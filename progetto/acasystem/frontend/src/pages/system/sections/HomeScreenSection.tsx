import type { GridDensity } from '@/@types/launcher';
import { Body, Button } from '@/components/primitives';
import { ChoiceGroup, ToggleRow } from '@/templates/sheets/parts/Form';

const DENSITIES: ReadonlyArray<{ value: GridDensity; label: string }> = [
  { value: 'compact', label: 'Compatta' },
  { value: 'normal', label: 'Normale' },
  { value: 'wide', label: 'Ampia' },
];

/**
 * «Schermata Home» (REP-20261007-033/034): the options of the whole launcher layout, as the
 * home settings of Android.
 * - «Modifica le pagine» (ADR-0016, C3): the way into the page overview that needs no long press
 *   on an empty place; Sistema closes and the launcher shows the pages as cards (2026-10-23: edit
 *   mode alone exists only with a widget selected).
 * - «Blocca la disposizione» (Samsung One UI «Lock Home screen layout») keeps widgets and
 *   pages where they are: no edit mode, no dragging.
 * - «Griglia» (the home screen grid of Pixel and One UI): compact has fewer, larger cells, wide
 *   more, smaller ones; each density keeps its own arrangement. It is the default of the pages
 *   without their own columns (REP-20261008-001, E9).
 */
export function HomeScreenSection({
  locked,
  onLocked,
  density,
  onDensity,
  disabled = false,
  onEditPages,
}: {
  locked: boolean;
  onLocked: (locked: boolean) => void;
  density: GridDensity;
  onDensity: (density: GridDensity) => void;
  /** The launcher has not created its layout yet: there is nothing to change. */
  disabled?: boolean;
  /** Closes Sistema and enters edit mode; absent when Sistema is not inside the launcher. */
  onEditPages?: () => void;
}) {
  return (
    <div className="aca-system__stack">
      {onEditPages && (
        <>
          <Button variant="secondary" disabled={disabled || locked} onClick={onEditPages}>
            Modifica le pagine
          </Button>
          <Body size="sm" tone="muted">
            {locked
              ? 'La disposizione è bloccata: sbloccala qui sotto per modificare.'
              : 'Cambia nome, ordine e colonne delle pagine. Sullo schermo basta tenere premuto uno spazio vuoto; un widget si sposta tenendolo premuto.'}
          </Body>
        </>
      )}
      <ToggleRow
        label="Blocca la disposizione"
        hint="Widget e pagine restano dove sono: la pressione lunga e «Modifica le pagine» non cambiano nulla."
        checked={locked}
        disabled={disabled}
        onChange={onLocked}
      />
      {!disabled && (
        <ChoiceGroup<GridDensity>
          label="Griglia"
          hint="Vale per le pagine senza una scelta di colonne; ogni pagina può averne una in Modifica le pagine. Compatta: meno celle. Ampia: più celle."
          options={DENSITIES}
          value={density}
          onChange={onDensity}
        />
      )}
    </div>
  );
}
