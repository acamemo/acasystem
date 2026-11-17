import { useEffect, useRef, useState } from 'react';
import {
  Body,
  Button,
  Caption,
  Disclosure,
  DisclosureGroup,
  Field,
  Icon,
  Segmented,
  Skeleton,
} from '@/components/primitives';
import type { DiscoveredDeviceDto, EntryDto, TvInReteDto } from '@/@types/devices';
import type { AddWidgetSelection } from '@/@types/launcher';
import { ignoreDiscovered, toDeviceError } from '@/api/devicesApi';
import { useAddSheetRequest, useAddWidgetRequest } from '@/hooks/launcher/AddWidgetRequestContext';
import { useDiscoveredFlow } from '@/hooks/launcher/DiscoveredFlowContext';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import {
  FAMILY_LABEL,
  FAMILY_ORDER,
  PLATFORM_FAMILY,
  type DeviceFamily,
} from '@/utils/devices/classify';
import { recommendedBrands } from '@/utils/devices/recommendedBrands';
import { nativeTvBrand, sameTvModel, type NativeTvBrand } from '@/utils/devices/tvBrand';
import {
  devicesAfterAdd,
  oneWidgetPerDevice,
  selectionAfterAdd,
} from '@/utils/devices/selectionAfterAdd';
import { DetailsBody } from '../shared/details';
import { Notice } from '../shared/UtilityCard';
import { UtilityIcon } from '../shared/UtilityIcon';
import { BrandLogo } from './BrandLogo';
import { FAMILY_ICON } from './familyIcon';
import { RepairServiceNotice } from './RepairServiceNotice';
import { useConnectedDevices, type ConnectedDevice } from './useConnectedDevices';
import { SERVICE_NOT_ACTIVE, useDiscoveredDevices } from './useDiscoveredDevices';
import { useIgnoredDevices } from './useIgnoredDevices';
import { useTvsOnNetwork } from './useTvsOnNetwork';
import './discovery.css';

export const UNDO_MS = 8_000;
type DeviceFilter = 'connect' | 'ready' | 'added';
export interface DiscoveryContentProps {
  open?: boolean;
  pageId: string;
  onPlaceDevice?: (deviceId: string) => void | Promise<void>;
  onOpenDevice?: (deviceId: string) => void | Promise<void>;
  onPinUtility?: () => void;
}
type View =
  | { kind: 'list' }
  | {
      kind: 'flow';
      flowId: string | null;
      family: DeviceFamily | null;
      /** A television seen on the network: «Collega» does the whole connection. */
      tvId?: string;
      /** A recommended brand: its integration starts at once. */
      startDomain?: string;
      /** Integration whose guide is shown before the flow starts. */
      guideFor?: string;
      /** The television the request goes to, said by the steps of its connection. */
      deviceName?: string;
    };

/** One tile of «Da collegare»: a discovery of Home Assistant, or a television seen on the network. */
type Candidate =
  | { kind: 'flow'; key: string; device: DiscoveredDeviceDto }
  | { kind: 'tv'; key: string; tv: TvInReteDto };

/** A device added here that no widget type fits: it waits in «Collegati» for a choice. */
interface Unplaced {
  key: string;
  deviceId: string | null;
  name: string;
}

/** One operative view shared by the utility details and the launcher's discovery screen. */
export function DiscoveryContent({
  open = true,
  pageId,
  onPlaceDevice,
  onOpenDevice,
  onPinUtility,
}: DiscoveryContentProps) {
  const requestAdd = useAddWidgetRequest();
  const requestSheet = useAddSheetRequest();
  const Flow = useDiscoveredFlow();
  const runtime = useWidgetRuntime();
  const [view, setView] = useState<View>({ kind: 'list' });
  const [filter, setFilter] = useState<DeviceFilter>('connect');
  const [query, setQuery] = useState('');
  const [hiding, setHiding] = useState<ReadonlySet<string>>(new Set());
  const [hiddenName, setHiddenName] = useState<string | null>(null);
  const [pendingHide, setPendingHide] = useState<DiscoveredDeviceDto | null>(null);
  const pendingRef = useRef<{ device: DiscoveredDeviceDto; timer: number } | null>(null);
  const undoRef = useRef<HTMLSpanElement>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const [error, setError] = useState<string | null>(null);
  const actionPending = useRef(false);
  const [actionBusy, setActionBusy] = useState(false);
  const runDeviceAction = async (action: () => void | Promise<void>) => {
    if (actionPending.current || !open) return;
    actionPending.current = true;
    setActionBusy(true);
    setError(null);
    try {
      await action();
    } catch (failure) {
      if (alive.current)
        setError(
          failure instanceof Error ? failure.message : 'Non riesco ad aprire il widget. Riprova.'
        );
    } finally {
      actionPending.current = false;
      if (alive.current) setActionBusy(false);
    }
  };
  const [section, setSection] = useState<string | null>(null);
  const [brandFamily, setBrandFamily] = useState<DeviceFamily | null>(null);
  const [unplaced, setUnplaced] = useState<Unplaced[]>([]);
  const [requested, setRequested] = useState<ReadonlySet<string>>(new Set());
  const [restoreErrors, setRestoreErrors] = useState<Readonly<Record<string, string>>>({});
  const paused = !open || view.kind === 'flow';
  const found = useDiscoveredDevices(paused);
  const tvs = useTvsOnNetwork(paused);
  const connected = useConnectedDevices(paused);
  const ignored = useIgnoredDevices();
  // A failed refresh does not erase the last successful reading.
  const foundCache = useRef<DiscoveredDeviceDto[]>([]);
  const tvCache = useRef<TvInReteDto[]>([]);
  const linkedCache = useRef<ConnectedDevice[]>([]);
  if (found.status === 'ready') foundCache.current = found.devices;
  if (tvs.status === 'ready') tvCache.current = tvs.tvs;
  if (connected.status === 'ready') linkedCache.current = connected.devices;
  const seenTvs = tvCache.current.filter((tv) => tv.collegabile);
  const [choose, setChoose] = useState<string | null>(null);
  const discoveries = foundCache.current.filter((device) => device.flowId !== pendingHide?.flowId);
  const toConnect: Candidate[] = [
    ...discoveries.map((device): Candidate => ({ kind: 'flow', key: device.flowId, device })),
    ...seenTvs.map((tv): Candidate => ({ kind: 'tv', key: `tv-${tv.id}`, tv })),
  ];
  const allLinked = linkedCache.current;
  const linked = allLinked.filter(
    (device) =>
      !(
        device.family === 'tv' &&
        device.platform === 'cast' &&
        allLinked.some(
          (other) =>
            other.family === 'tv' && other.platform !== 'cast' && sameTvModel(device, other)
        )
      )
  );
  const linkedIds = new Set(linked.map((device) => device.deviceId));
  const waiting = unplaced.filter((item) => !item.deviceId || !linkedIds.has(item.deviceId));
  const ready = linked.filter((device) => !device.bound);
  const added = linked.filter((device) => device.bound);
  const matches = (name: string) =>
    name.toLocaleLowerCase('it').includes(query.trim().toLocaleLowerCase('it'));
  const shownCandidates = toConnect.filter((item) =>
    matches(item.kind === 'flow' ? item.device.name : item.tv.name)
  );
  const shownLinked = (filter === 'added' ? added : ready).filter((device) => matches(device.name));
  const shownWaiting = filter === 'ready' ? waiting.filter((item) => matches(item.name)) : [];
  const needsRepair = found.status === 'unavailable' && found.code === SERVICE_NOT_ACTIVE;
  const serverMessage = found.status === 'unavailable' && !needsRepair ? found.message : null;
  const loading =
    filter === 'connect'
      ? found.status === 'loading' || tvs.status === 'loading'
      : connected.status === 'loading';
  const failed =
    filter === 'connect'
      ? found.status === 'unavailable'
      : connected.status === 'error' || (connected.status === 'ready' && connected.refreshError);
  const hasResults =
    filter === 'connect'
      ? shownCandidates.length > 0
      : shownLinked.length + shownWaiting.length > 0;

  const createWidget = (selection: AddWidgetSelection) => {
    requestAdd?.(pageId, oneWidgetPerDevice(selection), { auto: true });
  };
  const finishFlow = async (
    entry: EntryDto,
    family: DeviceFamily | null,
    flowId: string | null
  ) => {
    setView({ kind: 'list' });
    setFilter('ready');
    if (flowId) found.remove(flowId);
    found.refresh();
    tvs.refresh();
    connected.refresh();
    // The registry, not the facade's first-device sample, decides whether the entry is one light.
    const entryDevices = await devicesAfterAdd(runtime, entry);
    const devices = entryDevices.devices;
    if (!alive.current) return;
    connected.refresh();
    if (
      onPlaceDevice &&
      entryDevices.singleDevice &&
      devices.length === 1 &&
      ['light', 'plug', 'climate', 'cover', 'fan', 'lock', 'alarm', 'camera', 'vacuum', 'mower', 'tv', 'sonos', 'media', 'sensor'].includes(devices[0]?.family ?? '')
    ) {
      await runDeviceAction(() => onPlaceDevice(devices[0]!.deviceId));
      return;
    }
    if (!entryDevices.singleDevice && devices.length > 0) return; // A hub remains a list of individual devices.
    if (onPlaceDevice && (['light', 'plug', 'climate', 'cover', 'fan', 'lock', 'alarm', 'camera', 'vacuum', 'mower', 'tv', 'sonos', 'media', 'sensor'].includes(family ?? '') || ['light', 'plug', 'climate', 'cover', 'fan', 'lock', 'alarm', 'camera', 'vacuum', 'mower', 'tv', 'sonos', 'media', 'sensor'].includes(devices[0]?.family ?? ''))) {
      setError(
        'Elenco dei dispositivi collegati non ancora disponibile. Aggiorna e scegli il dispositivo.'
      );
      return;
    }
    const selection = await selectionAfterAdd(runtime, entry, family);
    if (!alive.current) return;
    if (selection) createWidget(selection);
    else
      setUnplaced((previous) =>
        previous.some((item) => item.key === entry.entryId)
          ? previous
          : [
              ...previous,
              {
                key: entry.entryId,
                deviceId: entry.device?.id ?? null,
                name: entry.device?.name ?? entry.title,
              },
            ]
      );
  };
  /** Tells Home Assistant to stop proposing the device; «Nascosti» brings it back later. */
  const commitHide = (device: DiscoveredDeviceDto) => {
    setHiding((previous) => new Set(previous).add(device.flowId));
    ignoreDiscovered(device.flowId)
      .then(() => {
        found.remove(device.flowId);
        ignored.refresh();
      })
      .catch((failure: unknown) => {
        setError(toDeviceError(failure).message);
        setHiddenName(null);
      })
      .finally(() =>
        setHiding((previous) => {
          const next = new Set(previous);
          next.delete(device.flowId);
          return next;
        })
      );
  };

  /** The hidden device still waiting for its «Annulla» time goes to Home Assistant now. */
  const flushHide = () => {
    const pending = pendingRef.current;
    if (!pending) return;
    window.clearTimeout(pending.timer);
    pendingRef.current = null;
    setPendingHide(null);
    commitHide(pending.device);
  };

  /** «Nascondi»: the tile goes at once; for `UNDO_MS` «Annulla» brings it back. */
  const hide = (device: DiscoveredDeviceDto) => {
    flushHide();
    setError(null);
    setHiddenName(device.name);
    setPendingHide(device);
    pendingRef.current = { device, timer: window.setTimeout(flushHide, UNDO_MS) };
  };

  const undoHide = () => {
    const pending = pendingRef.current;
    if (!pending) return;
    window.clearTimeout(pending.timer);
    pendingRef.current = null;
    setPendingHide(null);
    setHiddenName(null);
  };

  // «Annulla» takes the focus: the tile that had it is gone (keyboard, screen reader).
  useEffect(() => {
    if (pendingHide) undoRef.current?.querySelector('button')?.focus();
  }, [pendingHide]);

  // Closing the screen does not lose a «Nascondi»: it is sent at once.
  useEffect(
    () => () => {
      const pending = pendingRef.current;
      if (!pending) return;
      window.clearTimeout(pending.timer);
      void ignoreDiscovered(pending.device.flowId).catch(() => undefined);
    },
    []
  );

  /** A tile: the flow of that device starts at once. */
  const connect = (item: Candidate) => {
    setError(null);
    setHiddenName(null);
    setChoose(null);
    setView(
      item.kind === 'flow'
        ? { kind: 'flow', flowId: item.device.flowId, family: item.device.family }
        : {
            kind: 'flow',
            flowId: null,
            tvId: item.tv.id,
            ...(item.tv.handler ? { guideFor: item.tv.handler } : {}),
            deviceName: item.tv.name,
            family: 'tv',
          }
    );
  };

  /**
   * «Collega come TV {Marca}» of a TV that HA knows only through Cast: the TV of the same model
   * among «Televisori in rete» is connected like its tile does; without one the brand starts.
   */
  const connectCast = (device: ConnectedDevice, brand: NativeTvBrand) => {
    setError(null);
    setChoose(null);
    const same = seenTvs.filter((tv) => tv.handler === brand.handler && sameTvModel(tv, device));
    const seen = same.length === 1 ? same[0] : undefined;
    setView(
      seen
        ? {
            kind: 'flow',
            flowId: null,
            tvId: seen.id,
            guideFor: brand.handler,
            deviceName: seen.name,
            family: 'tv',
          }
        : {
            kind: 'flow',
            flowId: null,
            startDomain: brand.handler,
            guideFor: brand.handler,
            family: 'tv',
          }
    );
  };

  const restore = async (entryId: string) => {
    setRestoreErrors(({ [entryId]: _gone, ...rest }) => rest);
    const message = await ignored.restore(entryId);
    if (message) setRestoreErrors((previous) => ({ ...previous, [entryId]: message }));
    else found.refresh();
  };

  const openBrandCatalogue = () => {
    setError(null);
    setView({ kind: 'flow', flowId: null, family: null });
  };

  /** The types that have brands to propose, in the order of the house. */
  const brandTypes = FAMILY_ORDER.filter((family) => recommendedBrands(family).length > 0);
  const brands = brandFamily ? recommendedBrands(brandFamily) : [];

  /** A recommended brand: take over its discovery, else connect a television seen, else start it. */
  const startBrand = (handler: string, family: DeviceFamily) => {
    setError(null);
    setChoose(null);
    const discovered =
      found.status === 'ready'
        ? found.devices.find((device) => device.addable && device.handler === handler)
        : undefined;
    const seenOfBrand = discovered ? [] : seenTvs.filter((tv) => tv.handler === handler);
    if (seenOfBrand.length > 1) {
      // Two TVs of the brand: taking the first would send the request to the wrong TV.
      const label = seenOfBrand[0]?.brand ?? 'TV';
      setChoose(`Ci sono ${seenOfBrand.length} TV ${label} in rete: tocca quella da collegare.`);
      setFilter('connect');
      return;
    }
    const seen = seenOfBrand[0];
    setView(
      discovered
        ? { kind: 'flow', flowId: discovered.flowId, guideFor: handler, family: discovered.family }
        : seen
          ? {
              kind: 'flow',
              flowId: null,
              tvId: seen.id,
              guideFor: handler,
              deviceName: seen.name,
              family: 'tv',
            }
          : { kind: 'flow', flowId: null, startDomain: handler, guideFor: handler, family }
    );
  };

  if (view.kind === 'flow' && Flow) {
    const { flowId, family, tvId, startDomain, guideFor, deviceName } = view;
    return (
      <DetailsBody label="Aggiungi un dispositivo">
        <Flow
          flowId={flowId}
          {...(tvId ? { tvId } : {})}
          {...(startDomain ? { startDomain } : {})}
          {...(guideFor ? { guideFor } : {})}
          {...(deviceName ? { deviceName } : {})}
          family={family}
          onExit={() => {
            setView({ kind: 'list' });
            found.refresh();
            tvs.refresh();
            connected.refresh();
          }}
          onDone={(entry) =>
            void finishFlow(entry, family ?? PLATFORM_FAMILY[entry.domain] ?? null, flowId)
          }
        />
      </DetailsBody>
    );
  }
  const emptyText = query.trim()
    ? 'Nessun dispositivo con questo nome.'
    : filter === 'connect'
      ? 'Nessun dispositivo da collegare.'
      : filter === 'ready'
        ? 'Nessun dispositivo pronto da aggiungere.'
        : 'Nessun dispositivo già aggiunto.';
  return (
    <div className="discovery-content">
      <div className="discovery-toolbar">
        <Field
          type="search"
          label="Cerca dispositivi per nome"
          placeholder="Cerca per nome"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          containerClassName="discovery-search"
        />
        <Button
          variant="control"
          shape="circle"
          size="md"
          aria-label="Aggiorna elenco"
          title="Aggiorna elenco"
          onClick={() => {
            setError(null);
            found.refresh();
            tvs.refresh();
            connected.refresh();
          }}
        >
          <Icon name="refresh" size="md" />
        </Button>
      </div>
      <Segmented
        label="Stato dei dispositivi"
        value={filter}
        onChange={setFilter}
        size="sm"
        className="discovery-filters"
        options={[
          { value: 'connect', label: `Da collegare (${toConnect.length})` },
          { value: 'ready', label: `Pronti (${ready.length + waiting.length})` },
          { value: 'added', label: `Già aggiunti (${added.length})` },
        ]}
      />
      {error && (
        <Notice tone="danger" icon="warning" live>
          {error}
        </Notice>
      )}
      {choose && (
        <Notice icon="info" live>
          {choose}
        </Notice>
      )}
      {hiddenName && (
        <div className="discovery-hidden">
          <Caption role="status">«{hiddenName}» nascosto.</Caption>
          {pendingHide && (
            <span ref={undoRef}>
              <Button variant="secondary" size="md" onClick={undoHide}>
                Annulla
              </Button>
            </span>
          )}
        </div>
      )}
      {hasResults ? (
        <ul
          className="discovery-list"
          aria-label={
            filter === 'connect'
              ? 'Dispositivi da collegare'
              : filter === 'ready'
                ? 'Dispositivi pronti'
                : 'Dispositivi già aggiunti'
          }
        >
          {filter === 'connect'
            ? shownCandidates.map((item) => {
                const device = item.kind === 'flow' ? item.device : item.tv;
                const family = item.kind === 'flow' ? item.device.family : 'tv';
                const disabled =
                  !Flow ||
                  (item.kind === 'flow' &&
                    (!item.device.addable || hiding.has(item.device.flowId)));
                return (
                  <li key={item.key} className="discovery-row">
                    <UtilityIcon name={family ? FAMILY_ICON[family] : 'wifi'} size="md" />
                    <Button
                      variant="control"
                      size="md"
                      className="discovery-row__main"
                      contentClassName="discovery-row__content"
                      aria-label={`Collega ${device.name}`}
                      disabled={disabled}
                      onClick={() => connect(item)}
                    >
                      <Body as="span" size="sm" className="discovery-row__name">
                        {device.name}
                      </Body>
                      <Caption>
                        {family ? FAMILY_LABEL[family] : 'Dispositivo'} ·{' '}
                        {device.model && !device.name.includes(device.model)
                          ? `${device.model} · `
                          : ''}
                        {item.kind === 'flow' && !item.device.addable
                          ? (item.device.reason ?? 'Non disponibile')
                          : 'Da collegare'}
                      </Caption>
                    </Button>
                    {item.kind === 'flow' && (
                      <Button
                        variant="control"
                        size="sm"
                        aria-label={`Nascondi ${device.name}`}
                        disabled={hiding.has(item.device.flowId)}
                        onClick={() => hide(item.device)}
                      >
                        <Icon name="eyeSlash" size="sm" />
                        <span className="discovery-action-label">Nascondi</span>
                      </Button>
                    )}
                  </li>
                );
              })
            : shownLinked.map((device) => {
                const castBrand =
                  device.family === 'tv' && device.platform === 'cast'
                    ? nativeTvBrand(device.manufacturer, device.name)
                    : null;
                const action = device.bound
                  ? 'Apri il widget'
                  : castBrand
                    ? `Collega come TV ${castBrand.label}`
                    : 'Crea il widget';
                const disabled =
                  actionBusy ||
                  (device.bound
                    ? !onOpenDevice
                    : castBrand
                      ? !Flow
                      : ['light', 'plug', 'climate', 'cover', 'fan', 'lock', 'alarm', 'camera', 'vacuum', 'mower', 'tv', 'sonos', 'media', 'sensor'].includes(device.family) && onPlaceDevice
                        ? false
                        : !requestAdd || requested.has(device.deviceId));
                return (
                  <li key={device.deviceId} className="discovery-row">
                    <UtilityIcon name={FAMILY_ICON[device.family]} size="md" />
                    <Button
                      variant="control"
                      size="md"
                      className="discovery-row__main"
                      contentClassName="discovery-row__content"
                      aria-label={`${action}: ${device.name}`}
                      disabled={disabled}
                      onClick={() => {
                        if (device.bound) {
                          void runDeviceAction(() => onOpenDevice?.(device.deviceId));
                          return;
                        }
                        if (castBrand) {
                          connectCast(device, castBrand);
                          return;
                        }
                        if (['light', 'plug', 'climate', 'cover', 'fan', 'lock', 'alarm', 'camera', 'vacuum', 'mower', 'tv', 'sonos', 'media', 'sensor'].includes(device.family) && onPlaceDevice) {
                          void runDeviceAction(() => onPlaceDevice(device.deviceId));
                          return;
                        }
                        setRequested((previous) => new Set(previous).add(device.deviceId));
                        createWidget({
                          type: device.widgetType,
                          entityIds: device.entityIds,
                          ...(device.remoteId ? { remoteId: device.remoteId } : {}),
                        });
                      }}
                    >
                      <Body as="span" size="sm" className="discovery-row__name">
                        {device.name}
                      </Body>
                      <Caption>
                        {[
                          FAMILY_LABEL[device.family],
                          device.areaName,
                          device.bound ? 'Già aggiunto' : 'Pronto',
                          action,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Caption>
                    </Button>
                  </li>
                );
              })}
          {shownWaiting.map((item) => (
            <li key={item.key} className="discovery-row">
              <UtilityIcon name="wifi" size="md" />
              <span className="discovery-row__text">
                <Body as="span" size="sm">
                  {item.name}
                </Body>
                <Caption>Scegli il tipo di widget</Caption>
              </span>
              <Button
                variant="control"
                size="md"
                disabled={!requestSheet}
                aria-label={`Scegli il widget: ${item.name}`}
                onClick={() => requestSheet?.(pageId)}
              >
                Scegli il widget
              </Button>
            </li>
          ))}
        </ul>
      ) : loading ? (
        <div className="discovery-state">
          <Skeleton rows={3} label="Caricamento dei dispositivi…" />
        </div>
      ) : failed ? (
        filter === 'connect' && needsRepair ? (
          <RepairServiceNotice onRepaired={found.refresh} />
        ) : (
          <div className="discovery-state">
            <Body role="alert">
              {filter === 'connect'
                ? (serverMessage ?? 'Non riesco a leggere i dispositivi in rete.')
                : 'Non riesco a leggere i dispositivi della casa.'}
            </Body>
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                found.refresh();
                tvs.refresh();
                connected.refresh();
              }}
            >
              Riprova
            </Button>
          </div>
        )
      ) : error ? null : (
        <Body className="discovery-state" role="status">
          {emptyText}
        </Body>
      )}
      {hasResults && filter === 'connect' && needsRepair ? (
        <RepairServiceNotice onRepaired={found.refresh} />
      ) : (
        hasResults &&
        failed && (
          <Caption role="status">
            Aggiornamento non riuscito. I risultati precedenti sono ancora disponibili.
          </Caption>
        )
      )}
      <DisclosureGroup value={section} onValueChange={setSection}>
        {ignored.devices.length > 0 && (
          <Disclosure id="ignorati" title="Nascosti" count={ignored.devices.length}>
            <ul className="discovery-list" aria-label="Dispositivi nascosti">
              {ignored.devices.map((device) => (
                <li key={device.entryId} className="discovery-row">
                  <UtilityIcon
                    name={device.family ? FAMILY_ICON[device.family] : 'wifi'}
                    size="md"
                  />
                  <span className="discovery-row__text">
                    <Body as="span" size="sm">
                      {device.name}
                    </Body>
                    {restoreErrors[device.entryId] && (
                      <Caption tone="danger" role="alert">
                        {restoreErrors[device.entryId]}
                      </Caption>
                    )}
                  </span>
                  <Button
                    variant="control"
                    size="md"
                    aria-label={`Mostra di nuovo: ${device.name}`}
                    onClick={() => void restore(device.entryId)}
                  >
                    Mostra di nuovo
                  </Button>
                </li>
              ))}
            </ul>
          </Disclosure>
        )}
        <Disclosure id="altro" title="Non trovi il tuo dispositivo?">
          <div className="discovery-empty">
            {brandFamily === null ? (
              <ul
                className="discovery-grid discovery-grid--brands"
                aria-label="Tipi di dispositivo"
              >
                {brandTypes.map((family) => (
                  <li key={family}>
                    <Button variant="control" size="md" onClick={() => setBrandFamily(family)}>
                      <UtilityIcon name={FAMILY_ICON[family]} size="md" />
                      {FAMILY_LABEL[family]}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <Button variant="control" size="md" onClick={() => setBrandFamily(null)}>
                  <Icon name="chevronLeft" size="sm" />
                  Tutti i tipi
                </Button>
                <ul
                  className="discovery-grid discovery-grid--brands"
                  aria-label="Marche consigliate"
                >
                  {brands.map((brand) => (
                    <li key={brand.handler}>
                      <Button
                        variant="control"
                        size="md"
                        disabled={!Flow}
                        onClick={() => startBrand(brand.handler, brandFamily)}
                      >
                        <BrandLogo handler={brand.handler} family={brandFamily} size="md" />
                        {brand.label}
                      </Button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <Button variant="secondary" size="md" disabled={!Flow} onClick={openBrandCatalogue}>
              Altra marca
            </Button>
          </div>
        </Disclosure>
      </DisclosureGroup>
      {onPinUtility && (
        <footer className="discovery-footer">
          <Button variant="control" size="md" onClick={onPinUtility}>
            <Icon name="add" size="sm" /> Aggiungi alla Home
          </Button>
        </footer>
      )}
    </div>
  );
}
