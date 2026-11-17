import type { ReactNode } from 'react';
import { Body, Caption } from '@/components/primitives';
import type { WidgetProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { Amount } from '../shared/Amount';
import { CardMessage, CardSkeleton, Chip, IconWell, UtilityCard } from '../shared/UtilityCard';
import { useZigbeeJoin } from './useZigbeeJoin';
import { useZigbeeNetwork } from './useZigbeeNetwork';
import {
  countdownText,
  devicesText,
  lowBatteryText,
  offlineText,
  type ZigbeeNetwork,
} from './zigbeeData';

export const ZIGBEE_DEFAULT_NAME = 'Zigbee';

/** Unknown is a visible state, never evidence that the gateway is healthy. */
export function gatewayStateText(network: ZigbeeNetwork): string | null {
  if (network.online === true) return 'Attivo';
  if (network.online === false) return 'Non raggiungibile';
  return 'Stato non disponibile';
}

/**
 * Zigbee gateway (`zigbee_card_*`, REP-20261029-003): state of the coordinator, how many devices
 * it has, the ones that do not answer or are low on battery, and the time left while it accepts
 * new devices. ZHA or Zigbee2MQTT, found by itself: nothing to link.
 */
export function ZigbeeWidget({ id, size, editMode }: WidgetProps) {
  const runtime = useWidgetRuntime();
  const state = useZigbeeNetwork();
  const network = state.status === 'ready' ? state.network : null;
  const stale = state.status === 'ready' && state.stale;
  const join = useZigbeeJoin(network, !stale);
  const name = runtime.customNames[id] || ZIGBEE_DEFAULT_NAME;
  const row = size.h <= 1;
  const card = (children: ReactNode) => (
    <UtilityCard
      openLabel={`${name}, apri i dettagli del gateway`}
      onOpen={() => runtime.openDetails(id)}
      editMode={editMode}
      row={row}
    >
      {children}
    </UtilityCard>
  );

  if (state.status === 'loading') return card(<CardSkeleton label={`Caricamento di ${name}…`} />);
  if (!network) {
    return card(
      <CardMessage icon="server" title={name} detail={state.status === 'none'
        ? 'Nessun gateway Zigbee in Home Assistant'
        : state.status === 'inactive' ? 'Rete Zigbee in pausa' : 'Rete Zigbee non leggibile'} />
    );
  }

  const offline = network.devices.filter((device) => device.offline).length;
  const lowBattery = network.devices.filter((device) => device.batteryLow).length;
  const down = network.online === false;
  const stateText = stale ? 'Dati precedenti' : down
    ? 'Non raggiungibile'
    : join.open
      ? 'Aggiunta aperta'
      : gatewayStateText(network);
  const tone = down ? 'danger' : join.open ? 'active' : null;
  const joinText =
    join.remainingMs === null
      ? 'Aggiunta aperta'
      : `Aggiunta aperta · ${countdownText(join.remainingMs)}`;

  const chips = (
    <>
      {join.open && (
        <Chip icon="add" tone="active">
          {joinText}
        </Chip>
      )}
      {!down && offline > 0 && (
        <Chip icon="warning" tone="danger">
          {offlineText(offline)}
        </Chip>
      )}
      {!down && lowBattery > 0 && (
        <Chip icon="batteryLow" tone="danger">
          {lowBatteryText(lowBattery)}
        </Chip>
      )}
      {stale && <Chip icon="warning">Dati precedenti</Chip>}
      {!stale && !down && !join.open && offline === 0 && lowBattery === 0 && (
        <Chip icon="info">{network.online === null || network.devices.some((device) => device.availabilityUnknown)
          ? 'Stato incompleto' : 'Nessun avviso rilevato'}</Chip>
      )}
    </>
  );

  if (row) {
    const summary = [
      devicesText(network.devices.length),
      stale ? 'Dati precedenti' : network.online === null ? 'Stato non disponibile' : null,
      down ? 'Non raggiungibile' : null,
      join.open ? joinText : null,
      !down && offline > 0 ? offlineText(offline) : null,
      !down && lowBattery > 0 ? lowBatteryText(lowBattery) : null,
    ]
      .filter(Boolean)
      .join(' · ');
    return card(
      <>
        <IconWell icon="server" tone={tone} className="utility-hide-narrow" />
        <div className="utility-stack utility-grow">
          <Body as="span" size="sm" tone="ink" className="utility-truncate">
            {name}
          </Body>
          <Caption className="utility-truncate" title={summary}>
            {summary}
          </Caption>
        </div>
      </>
    );
  }

  return card(
    <>
      <div className="utility-head">
        <IconWell icon="server" tone={tone} />
        <div className="utility-head__text">
          <Body as="span" size="md" tone="ink" className="utility-truncate">
            {name}
          </Body>
          {stateText && (
            <Caption className="utility-truncate" tone={down ? 'danger' : 'muted'}>
              {stateText}
            </Caption>
          )}
        </div>
      </div>
      <div className="utility-stack utility-bottom">
        <Amount
          value={String(network.devices.length)}
          unit={network.devices.length === 1 ? 'dispositivo' : 'dispositivi'}
        />
        <div className="utility-chips utility-hide-short">{chips}</div>
      </div>
    </>
  );
}
