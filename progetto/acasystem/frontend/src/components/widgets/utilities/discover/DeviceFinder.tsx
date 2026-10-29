import { useState, type ReactNode } from 'react';
import { Body, Button, Caption, Icon } from '@/components/primitives';
import type { DiscoveredDeviceDto, EntryDto, TvInReteDto } from '@/@types/devices';
import { ignoreDiscovered, toDeviceError } from '@/api/devicesApi';
import { IdentifyButton } from '@/components/system/identify/IdentifyButton';
import type { DiscoveredFlowComponent } from '@/hooks/launcher/DiscoveredFlowContext';
import {
  FAMILY_LABEL,
  FAMILY_ORDER,
  PLATFORM_FAMILY,
  type DeviceFamily,
  type DiscoveredDevice,
} from '@/utils/devices/classify';
import { recommendedBrands } from '@/utils/devices/recommendedBrands';
import { alikeTvIds } from '@/utils/devices/tvBrand';
import { DetailsBody, Section } from '../shared/details';
import { Notice } from '../shared/UtilityCard';
import { UtilityIcon } from '../shared/UtilityIcon';
import { FAMILY_ICON } from './familyIcon';
import { RepairServiceNotice } from './RepairServiceNotice';
import { SERVICE_NOT_ACTIVE, useDiscoveredDevices } from './useDiscoveredDevices';
import { useTvsOnNetwork } from './useTvsOnNetwork';
import { useUnboundDevices } from './useUnboundDevices';

const subtitleOf = (device: DiscoveredDevice): string =>
  device.entityIds.length > 1 ? `${device.entityIds.length} entità` : device.primaryEntityId;

/** A device Home Assistant found on the network: its icon, name, model and the two answers. */
function FoundRow({
  device,
  canAdd,
  busy,
  error,
  onAdd,
  onIgnore,
}: {
  device: DiscoveredDeviceDto;
  canAdd: boolean;
  busy: boolean;
  error: string | null;
  onAdd: () => void;
  onIgnore: () => void;
}) {
  return (
    <li className="utility-found-row">
      <UtilityIcon name={device.family ? FAMILY_ICON[device.family] : 'wifi'} size="md" />
      <span className="utility-found-row__text">
        <Body as="span" size="sm" className="utility-truncate">
          {device.name}
        </Body>
        {device.model && <Caption className="utility-truncate">{device.model}</Caption>}
        {!device.addable && device.reason && <Caption>{device.reason}</Caption>}
        {error && (
          <Caption tone="danger" role="alert">
            {error}
          </Caption>
        )}
      </span>
      <span className="utility-found-row__actions">
        {device.addable && (
          <Button
            variant="primary"
            size="sm"
            disabled={!canAdd || busy}
            aria-label={`Aggiungi ${device.name}`}
            onClick={onAdd}
          >
            Aggiungi
          </Button>
        )}
        <Button
          variant="control"
          size="sm"
          disabled={busy}
          aria-label={`Non mi interessa: ${device.name}`}
          onClick={onIgnore}
        >
          Non mi interessa
        </Button>
      </span>
    </li>
  );
}

/** A television Home Assistant saw: its name and maker, and one big «Collega». */
function TvRow({
  tv,
  canConnect,
  alike,
  onConnect,
}: {
  tv: TvInReteDto;
  canConnect: boolean;
  /** Other TVs have a name like this one: the model is always shown. */
  alike: boolean;
  onConnect: () => void;
}) {
  return (
    <li className="utility-found-row">
      <UtilityIcon name="tv" size="md" />
      <span className="utility-found-row__text">
        <Body as="span" size="sm" className="utility-truncate">
          {tv.name}
        </Body>
        <Caption className="utility-truncate">
          {tv.model && (alike || !tv.name.includes(tv.model))
            ? `${tv.brand} · ${tv.model}`
            : tv.brand}
        </Caption>
        {!tv.collegabile && tv.motivo && <Caption>{tv.motivo}</Caption>}
      </span>
      {tv.collegabile && (
        <Button
          variant="primary"
          size="md"
          disabled={!canConnect}
          aria-label={`Collega ${tv.name}`}
          onClick={onConnect}
        >
          Collega
        </Button>
      )}
    </li>
  );
}

/** A row that opens something: a title, a line under it and, on the right, what a tap does. */
function ChoiceRow({
  title,
  subtitle,
  action,
  disabled,
  onClick,
}: {
  title: string;
  subtitle?: string;
  /** Words on the right (compact lists); without them the «+» icon says it. */
  action?: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="control"
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className="utility-device-row"
      contentClassName="utility-device-row__content"
    >
      <span className="utility-device-row__text">
        <Body as="span" size="sm" className="utility-truncate">
          {title}
        </Body>
        {subtitle && <Caption className="utility-truncate">{subtitle}</Caption>}
      </span>
      {action ? <Caption tone="active">{action}</Caption> : <Icon name="add" size="md" />}
    </Button>
  );
}

/** What is open in place of the lists: a flow to take over, a television, a brand, or the catalogue. */
interface Adding {
  flowId: string | null;
  tvId?: string;
  startDomain?: string;
  guideFor?: string;
  /** The television the request goes to, said by the steps of its connection. */
  deviceName?: string;
  family: DeviceFamily | null;
}

export interface DeviceFinderProps {
  /**
   * The family of the widget that opened the screen: only its devices and brands are shown, in the
   * order in the network, already in Home Assistant, recommended brands, other brand. Without it
   * everything is shown, as «Rileva dispositivi» does.
   */
  family?: DeviceFamily | null;
  /** Narrower than the family: the integrations the widget takes (the Apple TV widget). */
  handlers?: readonly string[];
  /** The flow of «Aggiungi un dispositivo»; null where there is none (the rows are inert). */
  Flow: DiscoveredFlowComponent | null;
  /** Accessible name of the whole screen. */
  label: string;
  /** «Usa questo» / a tap on a device that is already in Home Assistant; null makes it inert. */
  onUse: ((device: DiscoveredDevice) => void) | null;
  /** A device was added and is in the live data; `family` is the one of the integration. */
  onFlowDone: (entry: EntryDto, family: DeviceFamily | null) => void;
  /** Shows «Esci» under the lists, for a screen that opened inside a sheet. */
  onExit?: () => void;
}

/**
 * «Aggiungi un dispositivo», the one screen of every way in (plan REP-20261027-003). «Televisori
 * in rete»: the televisions Home Assistant saw, each with a «Collega» that does the whole
 * connection in one tap (the server fills the address; the person only reads the code or accepts
 * on the television). «Trovati in rete»: what Home Assistant found by itself (SSDP, mDNS, DHCP...),
 * each with «Aggiungi» (the flow opens in place) and «Non mi interessa». Then the devices already
 * in Home Assistant that no widget shows («Usa questo»), the recommended brands of the family (a
 * tap starts that integration, or connects the television of that brand when one was seen), and
 * «Altra marca», the catalogue of brands for a device nobody discovered.
 *
 * The flow, and what «Usa questo» does, belong to the screen that shows this one: the launcher
 * offers them to «Rileva dispositivi» through `DiscoveredFlowContext` (a widget cannot import the
 * templates), and the sheets pass them in. Without a flow the rows are inert.
 */
export function DeviceFinder({
  family = null,
  handlers,
  Flow,
  label,
  onUse,
  onFlowDone,
  onExit,
}: DeviceFinderProps) {
  const state = useUnboundDevices(family);
  // The flow is open: a discovery to take over, a television, a brand, or the catalogue.
  const [adding, setAdding] = useState<Adding | null>(null);
  // Several TVs of the brand that was tapped: none is picked for the person.
  const [choose, setChoose] = useState<string | null>(null);
  const [working, setWorking] = useState<ReadonlySet<string>>(new Set());
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({});
  const filter = { family, ...(handlers ? { handlers } : {}) };
  const found = useDiscoveredDevices(adding !== null, filter);
  const tvs = useTvsOnNetwork(adding !== null, filter);
  // With a family the lists are short and only what is there is said; without one every section
  // keeps its place, with its own line when it is empty.
  const compact = family !== null;
  const brands = recommendedBrands(family, handlers);

  const ignore = (device: DiscoveredDeviceDto) => {
    setWorking((previous) => new Set(previous).add(device.flowId));
    setErrors(({ [device.flowId]: _gone, ...rest }) => rest);
    ignoreDiscovered(device.flowId)
      .then(() => found.remove(device.flowId))
      .catch((failure: unknown) => {
        setErrors((previous) => ({ ...previous, [device.flowId]: toDeviceError(failure).message }));
      })
      .finally(() => {
        setWorking((previous) => {
          const next = new Set(previous);
          next.delete(device.flowId);
          return next;
        });
      });
  };

  if (adding && Flow) {
    return (
      <DetailsBody label={label}>
        <Flow
          flowId={adding.flowId}
          {...(adding.tvId ? { tvId: adding.tvId } : {})}
          {...(adding.startDomain ? { startDomain: adding.startDomain } : {})}
          {...(adding.guideFor ? { guideFor: adding.guideFor } : {})}
          {...(adding.deviceName ? { deviceName: adding.deviceName } : {})}
          family={adding.family}
          onExit={() => {
            setAdding(null);
            found.refresh();
            tvs.refresh();
          }}
          onDone={(entry) =>
            // A brand picked from the catalogue has no family yet: the integration gives it.
            onFlowDone(entry, adding.family ?? PLATFORM_FAMILY[entry.domain] ?? null)
          }
        />
      </DetailsBody>
    );
  }

  // «Televisori in rete» appears only when there is one to connect; errors are said by the
  // section below, which reads the same service.
  const tvList = tvs.status === 'ready' && tvs.tvs.length > 0 ? tvs.tvs : null;
  const alikeIds = alikeTvIds(tvList ?? []);

  let network: ReactNode = null;
  if (found.status === 'unavailable') {
    network =
      found.code === SERVICE_NOT_ACTIVE ? (
        <RepairServiceNotice onRepaired={found.refresh} />
      ) : found.message ? (
        <Notice icon="warning">{found.message}</Notice>
      ) : null;
  } else if (found.status === 'ready') {
    network =
      found.devices.length === 0 ? (
        compact ? null : (
          <Notice icon="ok">Nessun dispositivo nuovo trovato in rete.</Notice>
        )
      ) : (
        <ul className="utility-stack" aria-label="Dispositivi trovati in rete">
          {found.devices.map((device) => (
            <FoundRow
              key={device.flowId}
              device={device}
              canAdd={Flow !== null}
              busy={working.has(device.flowId)}
              error={errors[device.flowId] ?? null}
              onAdd={() => setAdding({ flowId: device.flowId, family: device.family })}
              onIgnore={() => ignore(device)}
            />
          ))}
        </ul>
      );
  }

  let body: ReactNode = null;
  if (state.status === 'loading') {
    body = <Notice icon="refresh">Cerco i dispositivi della casa…</Notice>;
  } else if (state.status === 'error') {
    body = (
      <Notice tone="danger" icon="warning">
        Non riesco a leggere i dispositivi della casa.
      </Notice>
    );
  } else if (state.devices.length === 0) {
    body = compact ? null : (
      <Notice icon="ok">
        Nessun dispositivo nuovo: quelli della casa sono già nei widget.
      </Notice>
    );
  } else {
    const { devices, identify, unreachable } = state;
    // A device that does not answer (all its entities `unavailable`) is still addable, but it goes
    // after the ones that do, with a tag (ISSUE-120).
    const reachable = devices.filter((device) => !unreachable.has(device.deviceId));
    const silent = devices.filter((device) => unreachable.has(device.deviceId));
    const deviceLine = (device: DiscoveredDevice, tag: boolean) => (
      <div key={device.deviceId} className="utility-device-line">
        <ChoiceRow
          title={device.name}
          subtitle={tag ? `Non raggiungibile · ${subtitleOf(device)}` : subtitleOf(device)}
          {...(compact ? { action: 'Usa questo' } : {})}
          disabled={!onUse}
          onClick={() => onUse?.(device)}
        />
        <IdentifyButton action={identify.get(device.deviceId)} name={device.name} />
      </div>
    );
    body = (
      <>
        {FAMILY_ORDER.map((group) => {
          const inFamily = reachable.filter((device) => device.family === group);
          if (inFamily.length === 0) return null;
          return (
            <div
              key={group}
              role="group"
              aria-label={FAMILY_LABEL[group]}
              className="utility-stack"
            >
              <Caption as="p">{FAMILY_LABEL[group]}</Caption>
              {inFamily.map((device) => deviceLine(device, false))}
            </div>
          );
        })}
        {silent.length > 0 && (
          <div role="group" aria-label="Non raggiungibili" className="utility-stack">
            <Caption as="p">Non raggiungibili</Caption>
            {silent.map((device) => deviceLine(device, true))}
          </div>
        )}
      </>
    );
  }

  // Nothing new in the network and nothing waiting in Home Assistant: said once, in plain words,
  // with the brands right below.
  const nothingYet =
    compact &&
    !tvList &&
    state.status === 'ready' &&
    state.devices.length === 0 &&
    (found.status === 'unavailable' || (found.status === 'ready' && found.devices.length === 0)) &&
    tvs.status !== 'loading';
  const noun = family ? FAMILY_LABEL[family].toLowerCase() : '';

  const brandRows = brands.map((brand) => {
    // A device of this brand that Home Assistant already found by itself (its own flow is open,
    // so the television is no longer in «Televisori in rete»): the tap takes that flow over.
    const discovered =
      found.status === 'ready'
        ? found.devices.find((device) => device.addable && device.handler === brand.handler)
        : undefined;
    // A television of this brand that Home Assistant saw: the tap connects it, but only when it
    // is the only one; with two or more the person picks one from «Televisori in rete».
    const seenOfBrand =
      !discovered && tvs.status === 'ready'
        ? tvs.tvs.filter((tv) => tv.collegabile && tv.handler === brand.handler)
        : [];
    const seen = seenOfBrand.length === 1 ? seenOfBrand[0] : undefined;
    const several = seenOfBrand.length > 1;
    const name = discovered?.name ?? seen?.name;
    return (
      <li key={brand.handler}>
        <ChoiceRow
          title={brand.label}
          {...(name ? { subtitle: `Trovata in rete: ${name}` } : {})}
          {...(several ? { subtitle: `${seenOfBrand.length} TV trovate in rete` } : {})}
          disabled={Flow === null}
          onClick={() => {
            setChoose(null);
            if (several) {
              setChoose(
                `Ci sono ${seenOfBrand.length} TV ${brand.label} in rete: tocca quella da collegare.`
              );
              return;
            }
            setAdding(
              discovered
                ? { flowId: discovered.flowId, guideFor: brand.handler, family }
                : seen
                  ? {
                      flowId: null,
                      tvId: seen.id,
                      guideFor: brand.handler,
                      deviceName: seen.name,
                      family,
                    }
                  : { flowId: null, startDomain: brand.handler, guideFor: brand.handler, family }
            );
          }}
        />
      </li>
    );
  });

  return (
    <DetailsBody label={label}>
      {nothingYet && (
        <Notice icon="ok">
          Non trovo {noun} nuovi in rete né già collegati alla casa. Scegli la marca qui sotto.
        </Notice>
      )}
      {tvList && (
        <Section title="Televisori in rete" icon="tv">
          {choose && (
            <Notice icon="info" live>
              {choose}
            </Notice>
          )}
          <ul className="utility-stack" aria-label="Televisori trovati in rete">
            {tvList.map((tv) => (
              <TvRow
                key={tv.id}
                tv={tv}
                canConnect={Flow !== null}
                alike={alikeIds.has(tv.id)}
                onConnect={() => {
                  setChoose(null);
                  setAdding({
                    flowId: null,
                    tvId: tv.id,
                    ...(tv.handler ? { guideFor: tv.handler } : {}),
                    deviceName: tv.name,
                    family: 'tv',
                  });
                }}
              />
            ))}
          </ul>
        </Section>
      )}
      {network && (
        <Section title="Trovati in rete" icon="wifi">
          {network}
        </Section>
      )}
      {body && (
        <Section
          title={compact ? 'Già collegati alla casa' : 'Pronti da aggiungere'}
          icon="widgetAdd"
        >
          {body}
        </Section>
      )}
      {brands.length > 0 && (
        <Section title="Marche consigliate" icon={family ? FAMILY_ICON[family] : 'add'}>
          <ul className="utility-stack" aria-label="Marche consigliate">
            {brandRows}
          </ul>
        </Section>
      )}
      <Section title={compact ? 'Altra marca' : 'Per marca'} icon="add">
        <ChoiceRow
          title={compact ? 'Altra marca' : 'Non lo trovi? Aggiungi per marca'}
          subtitle="Scegli la marca dall’elenco e segui i passi."
          disabled={Flow === null}
          onClick={() => setAdding({ flowId: null, family })}
        />
      </Section>
      {onExit && (
        <Button variant="secondary" size="md" onClick={onExit}>
          Esci
        </Button>
      )}
    </DetailsBody>
  );
}
