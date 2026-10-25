import { useMemo, type MouseEvent } from 'react';
import { Body, Button } from '@/components/primitives';
import { Casa3dQualityPicker } from '@/casa3d/Casa3dQualityPicker';
import { CASA3D_OPENER_ATTRIBUTE, useCasa3dHouse } from '@/casa3d/houseContext';
import { isWeakDevice, useCasa3dQuality } from '@/casa3d/quality';

/**
 * The Casa 3D in Sistema (ADR-0014, R1): «Apri la casa» opens the house at full screen (the same
 * as a tap on the page of the launcher), and the quality of the 3D view on this device. Light is the
 * start on every device; Medium and High are for tablets with more hardware. The choice is kept in
 * this browser and, when the settings synchronisation is on, in the device's current settings. The
 * same choice is in the side bar of the house.
 */
export function Casa3dSection() {
  const house = useCasa3dHouse();
  const [quality, setQuality] = useCasa3dQuality();
  const weak = useMemo(() => isWeakDevice(), []);
  return (
    <div className="aca-system__stack">
      {house && (
        <Button
          variant="primary"
          {...{ [CASA3D_OPENER_ATTRIBUTE]: '' }}
          onClick={(event: MouseEvent<HTMLButtonElement>) => house.open(event.currentTarget)}
        >
          Apri la casa
        </Button>
      )}
      <Casa3dQualityPicker value={quality} onChange={setQuality} weak={weak} />
      <Body size="sm" tone="muted">
        La scelta vale per questo dispositivo. Se la vista 3D resta lenta o si interrompe, torna a
        Light.
      </Body>
    </div>
  );
}
