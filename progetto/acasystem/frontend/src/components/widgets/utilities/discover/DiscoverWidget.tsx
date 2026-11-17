import type { ReactNode } from 'react';
import { Body, Caption } from '@/components/primitives';
import type { WidgetProps } from '@/@types/launcher';
import { useDiscoveryScreenOpener } from '@/hooks/launcher/DiscoveryScreenContext';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { CardMessage, CardSkeleton, IconWell, UtilityCard } from '../shared/UtilityCard';
import { UtilityIcon } from '../shared/UtilityIcon';
import { FAMILY_ICON } from './familyIcon';
import { useDiscoveredDevices } from './useDiscoveredDevices';
import { useTvsOnNetwork } from './useTvsOnNetwork';

export const DISCOVER_NAME = 'Trova dispositivi';

/** How many devices a card taller than one row names. */
const NAMED_DEVICES = 3;

/**
 * «Trova dispositivi» (`rileva_card_*`): how many devices are waiting to be connected, counted
 * like «Da collegare» of the screen it opens (what Home Assistant found, and the televisions it
 * saw), so the card and the screen never give two different numbers (critique of 2026-10-28).
 */
export function DiscoverWidget({ id, size, editMode }: WidgetProps) {
  const runtime = useWidgetRuntime();
  const showDiscovery = useDiscoveryScreenOpener();
  const found = useDiscoveredDevices();
  const tvs = useTvsOnNetwork();
  const row = size.h <= 1;
  const card = (children: ReactNode) => (
    <UtilityCard
      className="discover-widget"
      openLabel={`${DISCOVER_NAME}, apri l’elenco`}
      // The screen over the launcher; without a launcher (previews) the old details open.
      onOpen={() => (showDiscovery ? showDiscovery() : runtime.openDetails(id))}
      editMode={editMode}
      row={row}
    >
      {children}
    </UtilityCard>
  );

  if (found.status === 'loading') {
    return card(<CardSkeleton label={`Caricamento di ${DISCOVER_NAME}…`} />);
  }
  if (found.status === 'unavailable') {
    // The screen says why and offers «Ripara il servizio»; the card only invites the tap.
    return card(
      <CardMessage icon="warning" title={DISCOVER_NAME} detail="Tocca per vedere che cosa fare" />
    );
  }
  const names = [
    // Only what can be connected now, as «Da collegare» of the screen.
    ...found.devices
      .filter((device) => device.addable)
      .map((device) => ({
        key: device.flowId,
        name: device.name,
        icon: device.family ? FAMILY_ICON[device.family] : ('wifi' as const),
      })),
    ...(tvs.status === 'ready'
      ? tvs.tvs
          .filter((tv) => tv.collegabile)
          .map((tv) => ({ key: tv.id, name: tv.name, icon: FAMILY_ICON.tv }))
      : []),
  ];
  if (names.length === 0) {
    return card(<CardMessage icon="ok" title={DISCOVER_NAME} detail="Nessun dispositivo nuovo" />);
  }
  const count = `${names.length} da collegare`;
  if (row) {
    return card(
      <>
        <IconWell icon="wifi" tone="active" />
        <div className="utility-stack utility-grow">
          <Body as="span" size="sm" tone="ink" className="utility-truncate">
            {DISCOVER_NAME}
          </Body>
          <Caption className="utility-truncate">{count}</Caption>
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
          <Caption className="utility-truncate">{count}</Caption>
        </div>
      </div>
      <ul className="utility-stack utility-grow" aria-label="Primi dispositivi">
        {names.slice(0, NAMED_DEVICES).map((device) => (
          <li key={device.key} className="aca-icon-text">
            <UtilityIcon name={device.icon} size="sm" />
            <Caption className="utility-truncate">{device.name}</Caption>
          </li>
        ))}
      </ul>
    </>
  );
}
