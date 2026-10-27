import type { ReactNode } from 'react';
import { Body, Caption } from '@/components/primitives';
import type { WidgetProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { CardMessage, CardSkeleton, Chip, IconWell, UtilityCard } from '../shared/UtilityCard';
import { UtilityIcon } from '../shared/UtilityIcon';
import { FAMILY_ICON } from './familyIcon';
import { useUnboundDevices } from './useUnboundDevices';

export const DISCOVER_NAME = 'Rileva dispositivi';

/** How many devices a card taller than one row names. */
const NAMED_DEVICES = 3;

/** Count of the devices of Home Assistant not yet in a widget, with the first ones (`rileva_card_*`). */
export function DiscoverWidget({ id, size, editMode }: WidgetProps) {
  const runtime = useWidgetRuntime();
  const state = useUnboundDevices();
  const row = size.h <= 1;
  const card = (children: ReactNode) => (
    <UtilityCard
      openLabel={`${DISCOVER_NAME}, apri l’elenco`}
      onOpen={() => runtime.openDetails(id)}
      editMode={editMode}
      row={row}
    >
      {children}
    </UtilityCard>
  );

  if (state.status === 'loading') {
    return card(<CardSkeleton label={`Caricamento di ${DISCOVER_NAME}…`} />);
  }
  if (state.status === 'error') {
    return card(
      <CardMessage icon="warning" title={DISCOVER_NAME} detail="Home Assistant non risponde" />
    );
  }
  const { devices } = state;
  if (devices.length === 0) {
    return card(<CardMessage icon="ok" title={DISCOVER_NAME} detail="Nessun dispositivo nuovo" />);
  }
  const count = `${devices.length} ${devices.length === 1 ? 'dispositivo' : 'dispositivi'}`;
  if (row) {
    return card(
      <>
        <IconWell icon="wifi" tone="active" />
        <div className="utility-stack utility-grow">
          <Body as="span" size="sm" tone="ink" className="utility-truncate">
            {DISCOVER_NAME}
          </Body>
          <Caption className="utility-truncate">{count} da aggiungere</Caption>
        </div>
      </>
    );
  }
  return card(
    <>
      <div className="utility-head">
        <IconWell icon="wifi" tone="active" />
        <div className="utility-head__text">
          <Body as="span" size="md" tone="ink" className="utility-truncate">
            {DISCOVER_NAME}
          </Body>
          <Caption className="utility-truncate">{count} da aggiungere</Caption>
        </div>
        <div className="utility-head__aside">
          <Chip tone="active" label={`${devices.length} da aggiungere`}>
            {devices.length}
          </Chip>
        </div>
      </div>
      <ul className="utility-stack utility-grow" aria-label="Primi dispositivi">
        {devices.slice(0, NAMED_DEVICES).map((device) => (
          <li key={device.deviceId} className="aca-icon-text">
            <UtilityIcon name={FAMILY_ICON[device.family]} size="sm" />
            <Caption className="utility-truncate">{device.name}</Caption>
          </li>
        ))}
      </ul>
    </>
  );
}
