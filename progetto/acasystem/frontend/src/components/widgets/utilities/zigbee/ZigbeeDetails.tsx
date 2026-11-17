import { useSyncExternalStore } from 'react';
import { Body, Button, Caption, Disclosure, DisclosureGroup, Numeric } from '@/components/primitives';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { mutateHaConfiguration } from '@/api/commandApi';
import { DetailsBody, Section, StatList, type StatItem } from '../shared/details';
import { Notice } from '../shared/UtilityCard';
import { UtilityIcon } from '../shared/UtilityIcon';
import { useZigbeeJoin, type JoinError } from './useZigbeeJoin';
import { useZigbeeNetwork, type ZigbeeNetworkState } from './useZigbeeNetwork';
import { isZigbeeSessionCurrent, useZigbeeSession, ZIGBEE_COMMAND_TIMEOUT_MS } from './zigbeeSession';
import { gatewayStateText } from './ZigbeeWidget';
import { INTEGRATION_LABEL, countdownText, devicesText, type ZigbeeDevice, type ZigbeeNetwork } from './zigbeeData';
import './zigbee.css';

const JOIN_ERROR: Record<Exclude<JoinError, null>, string> = {
  refused: 'Home Assistant non permette a questo account di aggiungere dispositivi.',
  failed: 'Richiesta non accettata. Controlla il collegamento prima di riprovare.',
  unknown: 'Esito non disponibile. La richiesta non verrà reinviata: controlla la rete in Home Assistant.',
  unconfirmed: 'Richiesta accettata da Home Assistant, ma il gateway non ha confermato il nuovo stato.',
};

function DeviceRows({ devices, battery }: { devices: ZigbeeDevice[]; battery?: boolean }) {
  return <ul className="utility-list">
    {devices.map((device) => <li className="utility-list__row" key={device.id}>
      <UtilityIcon name={battery ? 'batteryLow' : device.offline ? 'warning' : 'sensor'} size="md" />
      <span className="utility-list__main">
        <Body as="span" size="sm" tone="ink">{device.name}</Body>
        <Caption>{device.offline ? 'Non disponibile in Home Assistant'
          : device.availabilityUnknown ? 'Stato non disponibile' : 'Letture disponibili in Home Assistant'}</Caption>
      </span>
      {battery && <span className="utility-list__end">
        <Numeric className="utility-value utility-value--sm">
          {device.battery === null ? 'Scarica' : `${device.battery}%`}
        </Numeric>
      </span>}
    </li>)}
  </ul>;
}

function JoinSection({ network, enabled }: { network: ZigbeeNetwork; enabled: boolean }) {
  const join = useZigbeeJoin(network, enabled);
  const down = network.online === false;
  return <Section title="Aggiungi dispositivi" icon="add">
    {join.open ? <>
      <Notice icon="info" live>{join.remainingMs === null
        ? 'Aggiunta aperta: metti il dispositivo in abbinamento.'
        : `Aggiunta aperta ancora per ${countdownText(join.remainingMs)}: metti il dispositivo in abbinamento.`}</Notice>
      {join.estimated && <Caption>Tempo stimato dalla richiesta accettata da Home Assistant.</Caption>}
      <Button variant="secondary" size="sm" loading={join.pending} disabled={!join.canStop} onClick={join.stop}>
        Chiudi l’aggiunta
      </Button>
    </> : <>
      <Caption>Il gateway accetta nuovi dispositivi per 4 minuti e 14 secondi. Segui le istruzioni di abbinamento del dispositivo.</Caption>
      <Button variant="primary" size="sm" loading={join.pending} disabled={!join.canStart} onClick={join.start}>
        <UtilityIcon name="add" size="sm" />Aggiungi un dispositivo Zigbee
      </Button>
      {join.canStop && <Button variant="secondary" size="sm" onClick={join.stop}>Chiudi l’aggiunta</Button>}
      {down && <Notice icon="warning">Il gateway non è raggiungibile.</Notice>}
      {!down && network.integration === 'zigbee2mqtt' && !network.permitJoinId &&
        <Notice icon="warning">Zigbee2MQTT non offre il comando per aggiungere dispositivi.</Notice>}
      {!down && network.integration === 'zigbee2mqtt' && network.permitJoinId && !join.canStart && !join.error && !join.pending &&
        <Caption>In attesa dello stato del comando in Home Assistant.</Caption>}
    </>}
    {join.newDevices.length > 0 && <ul className="utility-list" aria-label="Nuovi dispositivi in Home Assistant">
      {join.newDevices.map((device) => <li className="utility-list__row" key={device.id}>
        <UtilityIcon name="ok" size="md" />
        <span className="utility-list__main">
          <Body as="span" size="sm" tone="ink">{device.name}</Body>
          <Caption>Comparso in Home Assistant</Caption>
        </span>
      </li>)}
    </ul>}
    {join.error && <Notice tone="danger" icon="warning" live>{JOIN_ERROR[join.error]}</Notice>}
  </Section>;
}

type ActionState = 'pending' | 'accepted' | 'failed' | 'unknown';
const maintenance = new WeakMap<object, Map<string, ActionState>>();
const actionListeners = new Set<() => void>();
const subscribeActions = (listener: () => void) => {
  actionListeners.add(listener); return () => { actionListeners.delete(listener); };
};
const actionState = (scope: object | null, key: string) => scope ? maintenance.get(scope)?.get(key) ?? null : null;
function setAction(scope: object, key: string, state: ActionState) {
  let actions = maintenance.get(scope);
  if (!actions) { actions = new Map(); maintenance.set(scope, actions); }
  actions.set(key, state); actionListeners.forEach((listener) => listener());
}

function MaintenanceButton({ network, backup, enabled }: { network: ZigbeeNetwork; backup?: boolean; enabled: boolean }) {
  const { runtime: { conn, callService, entities, editMode }, visible, connected, scope } = useZigbeeSession();
  const key = `${network.integration}:${network.gatewayId}:${backup ? 'backup' : network.restartId}`;
  const state = useSyncExternalStore(subscribeActions, () => actionState(scope, key), () => null);
  const restart = network.restartId ? entities[network.restartId] : null;
  const disabled = !enabled || !visible || !connected || editMode || network.online === false ||
    (!backup && (!restart || restart.state === 'unavailable')) || state === 'pending' || state === 'unknown';
  const create = () => {
    if (disabled || !scope || !conn || actionState(scope, key) === 'pending' || !isZigbeeSessionCurrent(conn, scope)) return;
    setAction(scope, key, 'pending');
    const valid = () => isZigbeeSessionCurrent(conn, scope) && actionState(scope, key) === 'pending';
    const timer = setTimeout(() => {
      if (actionState(scope, key) === 'pending') setAction(scope, key, 'unknown');
    }, ZIGBEE_COMMAND_TIMEOUT_MS);
    let call: Promise<unknown>;
    try { call = backup ? mutateHaConfiguration('zigbee.backup')
      : callService('button', 'press', { entity_id: network.restartId }); }
    catch (error) { call = Promise.reject(error); }
    Promise.resolve(call).then(() => { if (valid()) setAction(scope, key, 'accepted'); }, (error: unknown) => {
      const code = error && typeof error === 'object' ? (error as { code?: string }).code : null;
      if (valid()) setAction(scope, key, code === 'RESULT_UNKNOWN' ? 'unknown' : 'failed');
    }).finally(() => { clearTimeout(timer); });
  };
  return <div className="utility-stack">
    <Button variant="secondary" size="sm" loading={state === 'pending'} disabled={disabled} onClick={create}>
      {backup ? 'Salva una copia della rete' : 'Riavvia Zigbee2MQTT'}
    </Button>
    {state === 'accepted' && <Notice icon="ok" live>{backup
      ? 'Richiesta di copia accettata da Home Assistant.'
      : 'Riavvio accettato da Home Assistant. Attendi lo stato del gateway.'}</Notice>}
    {state === 'failed' && <Notice tone="danger" icon="warning" live>Richiesta non accettata. Controlla il collegamento prima di riprovare.</Notice>}
    {state === 'unknown' && <Notice tone="danger" icon="warning" live>Esito non disponibile. La richiesta non verrà reinviata: controlla Home Assistant.</Notice>}
  </div>;
}

/** Existing gateway, membership and commands; technical data stays away from daily operation. */
export function ZigbeeDetails(_props: WidgetDetailsProps) {
  const state = useZigbeeNetwork();
  if (state.status !== 'ready') return <DetailsBody label="Gateway Zigbee">
    <Notice icon={state.status === 'loading' ? 'info' : 'warning'}>{state.status === 'loading'
      ? 'Lettura della rete Zigbee…' : state.status === 'none'
        ? 'Home Assistant non ha un gateway Zigbee (ZHA o Zigbee2MQTT).'
        : state.status === 'inactive' ? 'Lettura della rete in pausa.' : 'Impossibile leggere la rete Zigbee. Controlla il collegamento.'}</Notice>
    {state.status === 'error' && <Button variant="secondary" size="sm" onClick={state.retry}>Riprova la lettura</Button>}
  </DetailsBody>;
  return <ReadyDetails state={state} />;
}

function ReadyDetails({ state }: { state: Extract<ZigbeeNetworkState, { status: 'ready' }> }) {
  const { network } = state;
  const join = useZigbeeJoin(network, !state.stale);
  const newIds = new Set(join.newDevices.map((device) => device.id));
  const established = network.devices.filter((device) => !newIds.has(device.id));
  const offline = established.filter((device) => device.offline);
  const lowBattery = established.filter((device) => device.batteryLow);
  const others = established.filter((device) => !device.offline && !device.batteryLow);
  const info: StatItem[] = [
    { key: 'stato', label: 'Stato', value: state.stale ? 'Dati precedenti' : gatewayStateText(network) ?? 'Stato non disponibile' },
    { key: 'dispositivi', label: 'Dispositivi', value: devicesText(network.devices.length) },
    { key: 'integrazione', label: 'Integrazione', value: INTEGRATION_LABEL[network.integration] },
  ];
  const about = [
    { label: 'Produttore', value: network.manufacturer },
    { label: 'Modello', value: network.model },
    { label: 'Firmware', value: network.firmware },
    { label: 'Versione di Zigbee2MQTT', value: network.software },
    { label: 'ID del gateway in Home Assistant', value: network.gatewayId },
  ].filter((row): row is { label: string; value: string } => Boolean(row.value));
  return <div className="zigbee-details"><DetailsBody label="Gateway Zigbee">
    <Section title="Rete Zigbee" icon="server"><StatList items={info} />
      {state.stale && <Notice icon="warning" live>Dati precedenti: la lettura della rete non è aggiornata.</Notice>}
      <Button variant="secondary" size="sm" disabled={state.refreshing} onClick={state.retry}>Aggiorna la rete</Button>
    </Section>
    <JoinSection network={network} enabled={!state.stale} />
    {offline.length > 0 && <Section title="Non rispondono" icon="warning"><DeviceRows devices={offline} /></Section>}
    {lowBattery.length > 0 && <Section title="Batterie scariche" icon="batteryLow"><DeviceRows devices={lowBattery} battery /></Section>}
    {others.length > 0 && <Section title="Altri dispositivi" icon="sensor"><DeviceRows devices={others} /></Section>}
    {network.devices.length === 0 && <Caption>Nessun dispositivo nel registro di questa rete.</Caption>}
    <DisclosureGroup>
      <Disclosure id="tecnica" title="Informazioni tecniche">
        <ul className="utility-list">{about.map((row) => <li className="utility-list__row" key={row.label}>
          <span className="utility-list__main"><Caption>{row.label}</Caption><Body as="span" size="sm" tone="ink">{row.value}</Body></span>
        </li>)}</ul>
      </Disclosure>
      <Disclosure id="manutenzione" title="Manutenzione">
        {network.integration === 'zha' ? <>
          <Caption>La copia resta in Home Assistant. L’accettazione della richiesta non verifica che la copia sia completa.</Caption>
          <MaintenanceButton network={network} backup enabled={!state.stale && state.isAdmin === true} />
          {state.isAdmin !== true && <Caption>{state.isAdmin === false
            ? 'La copia della rete richiede un amministratore Home Assistant.'
            : 'Permessi di amministrazione non disponibili: la copia non può essere richiesta.'}</Caption>}
        </> : network.restartId ? <>
          <Caption>Il riavvio interrompe temporaneamente Zigbee2MQTT.</Caption>
          <MaintenanceButton network={network} enabled={!state.stale} />
        </> : <Caption>Nessuna azione di manutenzione disponibile in Home Assistant.</Caption>}
      </Disclosure>
    </DisclosureGroup>
  </DetailsBody></div>;
}
