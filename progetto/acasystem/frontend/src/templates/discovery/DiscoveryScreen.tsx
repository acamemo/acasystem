import { useEffect, useRef, useState } from 'react';
import {
  Body,
  Button,
  Caption,
  Disclosure,
  DisclosureGroup,
  Icon,
  Sheet,
} from '@/components/primitives';
import type { DiscoveredDeviceDto, EntryDto, TvInReteDto } from '@/@types/devices';
import type { AddWidgetSelection } from '@/@types/launcher';
import { ignoreDiscovered, toDeviceError } from '@/api/devicesApi';
import { BrandLogo } from '@/components/widgets/utilities/discover/BrandLogo';
import {
  useConnectedDevices,
  type ConnectedDevice,
} from '@/components/widgets/utilities/discover/useConnectedDevices';
import {
  DISCOVERED_POLL_MS,
  SERVICE_NOT_ACTIVE,
  useDiscoveredDevices,
} from '@/components/widgets/utilities/discover/useDiscoveredDevices';
import { useIgnoredDevices } from '@/components/widgets/utilities/discover/useIgnoredDevices';
import { useTvsOnNetwork } from '@/components/widgets/utilities/discover/useTvsOnNetwork';
import { DetailsBody } from '@/components/widgets/utilities/shared/details';
import { Notice } from '@/components/widgets/utilities/shared/UtilityCard';
import { useAddSheetRequest, useAddWidgetRequest } from '@/hooks/launcher/AddWidgetRequestContext';
import { useDiscoveredFlow } from '@/hooks/launcher/DiscoveredFlowContext';
import { useReducedMotion } from '@/hooks/launcher/useViewport';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { FAMILY_ICON } from '@/components/widgets/utilities/discover/familyIcon';
import { UtilityIcon } from '@/components/widgets/utilities/shared/UtilityIcon';
import {
  FAMILY_LABEL,
  FAMILY_ORDER,
  PLATFORM_FAMILY,
  type DeviceFamily,
} from '@/utils/devices/classify';
import { recommendedBrands } from '@/utils/devices/recommendedBrands';
import {
  alikeTvIds,
  nativeTvBrand,
  sameTvModel,
  type NativeTvBrand,
} from '@/utils/devices/tvBrand';
import { usePresence } from '../sheets/parts/hooks';
import { RepairServiceNotice } from '@/components/widgets/utilities/discover/RepairServiceNotice';
import { oneWidgetPerDevice, selectionAfterAdd } from './selectionAfterAdd';
import './discovery.css';

/**
 * How long the screen keeps searching, with skeleton tiles, each time it opens or the service is
 * repaired (the user: «questa animazione sempre presente con uno skeleton loading»).
 * Home Assistant says nothing when it has finished (zeroconf, SSDP and DHCP listen all the time),
 * so the end of the search is decided here. PROVISIONAL: to be measured in the office test, with
 * the time the Home Assistant of the virtual machine took to find the devices (REP-20261028-003).
 */
export const SEARCH_WINDOW_MS = 30_000;
/** How often the devices are read during the search window, instead of the usual 15 s. */
export const SEARCH_POLL_MS = 5_000;
/** Skeleton tiles with nothing found yet, and after the found ones while the search goes on. */
const SKELETONS_EMPTY = 4;
const SKELETONS_MORE = 2;
/** The found devices take the place of the skeleton one at a time, never all at once. */
const FIRST_REVEAL_MS = 600;
const NEXT_REVEAL_MS = 140;
/** How long «Annulla» brings a hidden device back before Home Assistant is told. */
export const UNDO_MS = 8_000;

/** Tiles already shown on this tablet: when the screen opens again they are there at once. */
const shownBefore = new Set<string>();

/** For tests: forget the tiles already shown. */
export function resetShownTiles(): void {
  shownBefore.clear();
}

/**
 * Which tiles are visible. A device already shown is there at once; a new one takes the place of
 * a skeleton one at a time, never all at once (the user, 2026-10-28). With reduced motion all of
 * them are there at once.
 */
function useRevealed(keys: readonly string[], reducedMotion: boolean): ReadonlySet<string> {
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(() => new Set());
  const visible = new Set(
    keys.filter((key) => reducedMotion || revealed.has(key) || shownBefore.has(key))
  );
  const next = keys.find((key) => !visible.has(key));
  const visibleCount = visible.size;
  useEffect(() => {
    if (!next) return undefined;
    const timer = setTimeout(
      () => {
        shownBefore.add(next);
        setRevealed((previous) => new Set(previous).add(next));
      },
      visibleCount === 0 ? FIRST_REVEAL_MS : NEXT_REVEAL_MS
    );
    return () => clearTimeout(timer);
  }, [next, visibleCount]);
  useEffect(() => {
    if (reducedMotion) keys.forEach((key) => shownBefore.add(key));
  }, [keys, reducedMotion]);
  return visible;
}

/**
 * What the body shows: the sections, or the flow of «Aggiungi». A tile starts the flow at once;
 * there is no panel in between (critique of 2026-10-28, user choice «Toglierlo»).
 */
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

function DeviceTile({
  device,
  disabled,
  onOpen,
}: {
  device: DiscoveredDeviceDto;
  disabled: boolean;
  onOpen: () => void;
}) {
  return (
    <Button
      variant="control"
      shape="card"
      size="sm"
      className="aca-m--fill discovery-tile"
      contentClassName="discovery-tile__content"
      aria-label={`Collega ${device.name}`}
      disabled={!device.addable || disabled}
      onClick={onOpen}
    >
      <BrandLogo handler={device.handler} family={device.family} size="lg" />
      <Body as="span" size="sm" className="discovery-tile__name">
        {device.name}
      </Body>
      {device.model && <Caption className="discovery-tile__model">{device.model}</Caption>}
      {!device.addable && device.reason && (
        <Caption className="discovery-tile__model">{device.reason}</Caption>
      )}
    </Button>
  );
}

function TvTile({
  tv,
  disabled,
  alike,
  onOpen,
}: {
  tv: TvInReteDto;
  disabled: boolean;
  /** Other TVs have a name like this one: the model is shown even when the name holds it. */
  alike: boolean;
  onOpen: () => void;
}) {
  // Only what the name does not already say («Samsung UE50J6200» needs no «Samsung» under it);
  // TVs that look alike always show their model, the only thing that tells them apart.
  const parts = [tv.brand, tv.model].filter(
    (part): part is string =>
      Boolean(part) &&
      ((alike && part === tv.model) || !tv.name.toLowerCase().includes(String(part).toLowerCase()))
  );
  const caption = parts.join(' · ');
  return (
    <Button
      variant="control"
      shape="card"
      size="sm"
      className="aca-m--fill discovery-tile"
      contentClassName="discovery-tile__content"
      aria-label={`Collega ${tv.name}`}
      disabled={disabled}
      onClick={onOpen}
    >
      <BrandLogo handler={tv.handler ?? ''} family="tv" size="lg" />
      <Body as="span" size="sm" className="discovery-tile__name">
        {tv.name}
      </Body>
      {caption && <Caption className="discovery-tile__model">{caption}</Caption>}
    </Button>
  );
}

function SkeletonTiles({ count }: { count: number }) {
  return Array.from({ length: count }, (_, index) => (
    <li key={`attesa-${index}`} className="discovery-grid__item" aria-hidden="true">
      <span className="discovery-skeleton" />
    </li>
  ));
}

interface SessionProps {
  open: boolean;
  onClose: () => void;
  /** The current page of the launcher: where a widget made by itself goes. */
  pageId: string;
  searchWindow: boolean;
}

function DiscoverySession({ open, onClose, pageId, searchWindow }: SessionProps) {
  const requestAdd = useAddWidgetRequest();
  const requestSheet = useAddSheetRequest();
  const Flow = useDiscoveredFlow();
  const runtime = useWidgetRuntime();
  const [view, setView] = useState<View>({ kind: 'list' });
  // Every opening searches with skeleton tiles; `searchWindow` is kept for the first one.
  const [windowOn, setWindowOn] = useState(searchWindow || open);
  const reducedMotion = useReducedMotion();
  // The discoveries being hidden (sent to Home Assistant), and the last one hidden: during
  // `UNDO_MS` it is only hidden here and «Annulla» brings it back, then Home Assistant is told.
  const [hiding, setHiding] = useState<ReadonlySet<string>>(new Set());
  const [hiddenName, setHiddenName] = useState<string | null>(null);
  const [pendingHide, setPendingHide] = useState<DiscoveredDeviceDto | null>(null);
  const pendingRef = useRef<{ device: DiscoveredDeviceDto; timer: number } | null>(null);
  const undoRef = useRef<HTMLSpanElement>(null);
  const [error, setError] = useState<string | null>(null);
  // The open section; «Non trovi il tuo dispositivo?» is also opened from «Da collegare».
  const [section, setSection] = useState<string | null>('da-collegare');
  // «Non trovi il tuo dispositivo?»: first the type («Che cos'è?»), then its brands.
  const [brandFamily, setBrandFamily] = useState<DeviceFamily | null>(null);
  const [unplaced, setUnplaced] = useState<Unplaced[]>([]);
  // Devices whose «Crea il widget» was pressed, until the widget shows them as bound.
  const [requested, setRequested] = useState<ReadonlySet<string>>(new Set());
  const [restoreErrors, setRestoreErrors] = useState<Readonly<Record<string, string>>>({});

  useEffect(() => {
    if (!windowOn || !open) return undefined;
    const timer = setTimeout(() => setWindowOn(false), SEARCH_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [windowOn, open]);

  const found = useDiscoveredDevices(
    !open || view.kind === 'flow',
    {},
    windowOn ? SEARCH_POLL_MS : DISCOVERED_POLL_MS
  );
  const tvs = useTvsOnNetwork(!open || view.kind === 'flow');
  const seenTvs = tvs.status === 'ready' ? tvs.tvs.filter((tv) => tv.collegabile) : [];
  const tvKey = seenTvs.map((tv) => `tv-${tv.id}`).join(' ');
  const alike = alikeTvIds(seenTvs);
  // Several TVs of one brand: nothing is guessed, the person picks one from «Da collegare».
  const [choose, setChoose] = useState<string | null>(null);
  // The search ends as soon as a read brings nothing new: skeleton tiles left on would say that
  // more devices are coming (the user, 2026-10-28). With nothing found yet it waits for the
  // whole window, since a Home Assistant just installed may still be searching.
  const readList = found.status === 'ready' ? found.devices : null;
  const lastRead = useRef<string | null>(null);
  // When the search started: two reads a moment apart prove nothing, so a search lasts at least
  // one poll (`SEARCH_POLL_MS`) before an unchanged read can end it (critique of 2026-10-28).
  const searchStart = useRef(0);
  useEffect(() => {
    if (windowOn) searchStart.current = Date.now();
  }, [windowOn]);
  useEffect(() => {
    if (!readList) return;
    const ids = [...readList.map((device) => device.flowId), ...tvKey.split(' ')].sort().join(' ');
    const same = lastRead.current === ids;
    lastRead.current = ids;
    const longEnough = Date.now() - searchStart.current >= SEARCH_POLL_MS;
    if (same && longEnough && readList.length > 0 && windowOn) setWindowOn(false);
  }, [readList, tvKey, windowOn]);
  const connected = useConnectedDevices();
  const ignored = useIgnoredDevices();
  // Discoveries first, then the televisions Home Assistant saw that can be connected. A discovery
  // that cannot be connected now (another person is adding it) is not a tile: it would look
  // tappable and do nothing. It goes in a short list under the grid, with its reason in full.
  const discoveries = (found.status === 'ready' ? found.devices : []).filter(
    (device) => device.flowId !== pendingHide?.flowId
  );
  const notNow = discoveries.filter((device) => !device.addable);
  const toConnect: Candidate[] = [
    ...discoveries
      .filter((device) => device.addable)
      .map((device): Candidate => ({
        kind: 'flow',
        key: device.flowId,
        device,
      })),
    ...seenTvs.map((tv): Candidate => ({ kind: 'tv', key: `tv-${tv.id}`, tv })),
  ];
  const toConnectKeys = toConnect.map((item) => item.key);
  const visibleKeys = useRevealed(toConnectKeys, reducedMotion);
  const shownTiles = toConnect.filter((item) => visibleKeys.has(item.key));
  const allLinked = connected.status === 'ready' ? connected.devices : [];
  // A TV that only Cast shows is the same TV as its native device when both are there: one row.
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
  const linkedCount = linked.length + waiting.length;
  // The counts follow the tiles on screen: never «5 trovati» over an empty grid.
  const foundCount = shownTiles.length + notNow.length + linkedCount;

  // The first answer is awaited, and the window of the first opening keeps the search going.
  const searching = found.status === 'loading' || (windowOn && found.status !== 'unavailable');
  // The search is over: «Salta» becomes «Fatto», whether or not something is left to connect.
  const finished = found.status !== 'loading' && tvs.status !== 'loading' && !windowOn;
  const needsRepair = found.status === 'unavailable' && found.code === SERVICE_NOT_ACTIVE;
  const serverMessage = found.status === 'unavailable' && !needsRepair ? found.message : null;

  /** The widget of the device is made by itself, on the current page at the first free place. */
  const createWidget = (selection: AddWidgetSelection) => {
    requestAdd?.(pageId, oneWidgetPerDevice(selection), { auto: true });
  };

  const finishFlow = async (
    entry: EntryDto,
    family: DeviceFamily | null,
    flowId: string | null
  ) => {
    setView({ kind: 'list' });
    if (flowId) found.remove(flowId);
    const selection = await selectionAfterAdd(runtime, entry, family);
    if (selection) {
      createWidget(selection);
    } else {
      // No widget type fits: «Collegati» offers «Scegli il widget» instead of guessing one.
      setUnplaced((previous) => [
        ...previous,
        {
          key: entry.entryId,
          deviceId: entry.device?.id ?? null,
          name: entry.device?.name ?? entry.title,
        },
      ]);
    }
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
      setSection('da-collegare');
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

  let body;
  if (view.kind === 'flow' && Flow) {
    const { flowId, family, tvId, startDomain, guideFor, deviceName } = view;
    body = (
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
          }}
          onDone={(entry) =>
            // A brand picked from the catalogue has no family yet: the integration gives it.
            void finishFlow(entry, family ?? PLATFORM_FAMILY[entry.domain] ?? null, flowId)
          }
        />
      </DetailsBody>
    );
  } else {
    const empty =
      !searching && toConnect.length === 0 && notNow.length === 0 && !serverMessage && !needsRepair;
    body = (
      <DisclosureGroup value={section} onValueChange={setSection}>
        <Disclosure id="da-collegare" title="Da collegare" count={shownTiles.length}>
          {needsRepair && (
            <RepairServiceNotice
              onRepaired={() => {
                // The service is back: the search starts again, with its skeleton.
                setWindowOn(true);
                found.refresh();
              }}
            />
          )}
          {serverMessage && <Notice icon="warning">{serverMessage}</Notice>}
          {choose && (
            <Notice icon="info" live>
              {choose}
            </Notice>
          )}
          {error && (
            <Notice tone="danger" icon="warning" live>
              {error}
            </Notice>
          )}
          {hiddenName && (
            <div className="discovery-hidden">
              <Notice icon="eyeSlash" live>
                «{hiddenName}» nascosto: non verrà più proposto. Lo ritrovi in «Nascosti».
              </Notice>
              {pendingHide && (
                <span ref={undoRef}>
                  <Button variant="secondary" size="md" onClick={undoHide}>
                    Annulla
                  </Button>
                </span>
              )}
            </div>
          )}
          {found.status !== 'unavailable' && (toConnect.length > 0 || searching) && (
            <>
              <ul className="discovery-grid" aria-label="Dispositivi da collegare">
                {shownTiles.map((item) => (
                  <li key={item.key} className="discovery-grid__item discovery-enter">
                    {item.kind === 'flow' ? (
                      <>
                        <DeviceTile
                          device={item.device}
                          disabled={!Flow || hiding.has(item.device.flowId)}
                          onOpen={() => connect(item)}
                        />
                        <Button
                          variant="control"
                          size="sm"
                          className="discovery-tile__hide"
                          aria-label={`Nascondi ${item.device.name}`}
                          disabled={hiding.has(item.device.flowId)}
                          onClick={() => hide(item.device)}
                        >
                          <Icon name="eyeSlash" size="sm" />
                          Nascondi
                        </Button>
                      </>
                    ) : (
                      <TvTile
                        tv={item.tv}
                        disabled={!Flow}
                        alike={alike.has(item.tv.id)}
                        onOpen={() => connect(item)}
                      />
                    )}
                  </li>
                ))}
                {(searching || shownTiles.length < toConnect.length) && (
                  <SkeletonTiles
                    count={
                      toConnect.length -
                      shownTiles.length +
                      (searching ? (toConnect.length === 0 ? SKELETONS_EMPTY : SKELETONS_MORE) : 0)
                    }
                  />
                )}
              </ul>
              {searching ? (
                <Caption role="status">
                  {toConnect.length > 0
                    ? 'Sto cercando altri dispositivi…'
                    : 'Cerco i dispositivi…'}
                </Caption>
              ) : (
                shownTiles.length === toConnect.length &&
                toConnect.length > 0 && (
                  // The end of the search is said, not only shown by «Fatto».
                  <Caption role="status">
                    {`Ricerca terminata: ${toConnect.length} ${
                      toConnect.length === 1 ? 'dispositivo' : 'dispositivi'
                    } da collegare.`}
                  </Caption>
                )
              )}
            </>
          )}
          {notNow.length > 0 && (
            <div className="discovery-later">
              <Caption as="p">Per ora non si possono collegare</Caption>
              <ul className="discovery-list" aria-label="Dispositivi da collegare più tardi">
                {notNow.map((device) => (
                  <li key={device.flowId} className="discovery-row">
                    <BrandLogo handler={device.handler} family={device.family} size="md" />
                    <span className="discovery-row__text">
                      <Body as="span" size="sm" className="discovery-row__name">
                        {device.name}
                      </Body>
                      {device.reason && (
                        <Body as="span" size="sm">
                          {device.reason}
                        </Body>
                      )}
                    </span>
                    <Button
                      variant="control"
                      size="sm"
                      aria-label={`Nascondi ${device.name}`}
                      disabled={hiding.has(device.flowId)}
                      onClick={() => hide(device)}
                    >
                      <Icon name="eyeSlash" size="sm" />
                      Nascondi
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {empty ? (
            <div className="discovery-empty">
              <Notice icon="info">
                Nessun nuovo dispositivo individuato. Se il tuo non compare, scegli la marca.
              </Notice>
              <Button variant="primary" size="md" onClick={() => setSection('altro')}>
                Scegli la marca
              </Button>
            </div>
          ) : (
            // The way for a device nobody found stays in reach, under the grid.
            <Button
              variant="control"
              size="sm"
              className="discovery-elsewhere"
              onClick={() => setSection('altro')}
            >
              Non lo trovi? Scegli la marca
            </Button>
          )}
        </Disclosure>

        <Disclosure id="collegati" title="Collegati" count={linkedCount}>
          {linkedCount === 0 ? (
            <Notice icon="info">Nessun dispositivo collegato.</Notice>
          ) : (
            <ul className="discovery-list" aria-label="Dispositivi collegati">
              {linked.map((device) => {
                // A Cast-only TV of a brand with its own integration has no remote and no real
                // power: it is connected properly instead of getting a widget.
                const castBrand =
                  device.family === 'tv' && device.platform === 'cast'
                    ? nativeTvBrand(device.manufacturer, device.name)
                    : null;
                return (
                  <li key={device.deviceId} className="discovery-row">
                    <BrandLogo handler={device.platform ?? ''} family={device.family} size="md" />
                    <Body as="span" size="sm" className="discovery-row__name">
                      {device.name}
                    </Body>
                    {castBrand ? (
                      <Button
                        variant="control"
                        size="sm"
                        disabled={!Flow}
                        aria-label={`Collega come TV ${castBrand.label}: ${device.name}`}
                        onClick={() => connectCast(device, castBrand)}
                      >
                        Collega come TV {castBrand.label}
                      </Button>
                    ) : device.bound ? (
                      <Caption tone="active">Nel widget</Caption>
                    ) : (
                      <Button
                        variant="control"
                        size="sm"
                        disabled={!requestAdd || requested.has(device.deviceId)}
                        aria-label={`Crea il widget: ${device.name}`}
                        onClick={() => {
                          setRequested((previous) => new Set(previous).add(device.deviceId));
                          createWidget({
                            type: device.widgetType,
                            entityIds: device.entityIds,
                            ...(device.remoteId ? { remoteId: device.remoteId } : {}),
                          });
                        }}
                      >
                        Crea il widget
                      </Button>
                    )}
                  </li>
                );
              })}
              {waiting.map((item) => (
                <li key={item.key} className="discovery-row">
                  <BrandLogo handler="" family={null} size="md" />
                  <Body as="span" size="sm" className="discovery-row__name">
                    {item.name}
                  </Body>
                  <Button
                    variant="control"
                    size="sm"
                    disabled={!requestSheet}
                    aria-label={`Scegli il widget: ${item.name}`}
                    onClick={() => requestSheet?.(pageId)}
                  >
                    Scegli il widget
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Disclosure>

        {ignored.devices.length > 0 && (
          <Disclosure id="ignorati" title="Nascosti" count={ignored.devices.length}>
            <ul className="discovery-list" aria-label="Dispositivi nascosti">
              {ignored.devices.map((device) => (
                <li key={device.entryId} className="discovery-row">
                  <BrandLogo handler={device.handler} family={device.family} size="md" />
                  <span className="discovery-row__text">
                    <Body as="span" size="sm" className="discovery-row__name">
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
                    size="sm"
                    aria-label={`Mostra di nuovo: ${device.name}`}
                    onClick={() => void restore(device.entryId)}
                  >
                    Mostra di nuovo
                  </Button>
                </li>
              ))}
            </ul>
            <Caption as="p">Torna in «Da collegare» appena si fa rivedere in rete.</Caption>
          </Disclosure>
        )}

        <Disclosure id="altro" title="Non trovi il tuo dispositivo?">
          <div className="discovery-empty">
            {brandFamily === null ? (
              <>
                <Caption as="p">Che cos’è? Scegli il tipo, poi la marca.</Caption>
                <ul
                  className="discovery-grid discovery-grid--brands"
                  aria-label="Tipi di dispositivo"
                >
                  {brandTypes.map((family) => (
                    <li key={family} className="discovery-grid__item">
                      <Button
                        variant="control"
                        shape="card"
                        size="sm"
                        className="aca-m--fill discovery-tile discovery-tile--brand"
                        contentClassName="discovery-tile__content"
                        onClick={() => setBrandFamily(family)}
                      >
                        <UtilityIcon name={FAMILY_ICON[family]} size="md" />
                        <Body as="span" size="sm" className="discovery-tile__name">
                          {FAMILY_LABEL[family]}
                        </Body>
                      </Button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <Button variant="control" size="sm" onClick={() => setBrandFamily(null)}>
                  <Icon name="chevronLeft" size="sm" />
                  Tutti i tipi
                </Button>
                <Caption as="p">
                  {FAMILY_LABEL[brandFamily]}: scegli la marca, Acasystem ti guida passo passo.
                </Caption>
                <ul
                  className="discovery-grid discovery-grid--brands"
                  aria-label="Marche consigliate"
                >
                  {brands.map((brand) => (
                    <li key={brand.handler} className="discovery-grid__item">
                      <Button
                        variant="control"
                        shape="card"
                        size="sm"
                        className="aca-m--fill discovery-tile discovery-tile--brand"
                        contentClassName="discovery-tile__content"
                        disabled={!Flow}
                        onClick={() => startBrand(brand.handler, brandFamily)}
                      >
                        <BrandLogo handler={brand.handler} family={brandFamily} size="md" />
                        <Body as="span" size="sm" className="discovery-tile__name">
                          {brand.label}
                        </Body>
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
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Dispositivi trovati"
      description={`${foundCount} trovati · ${linkedCount} collegati`}
      className="aca-discovery"
      footer={
        view.kind === 'list' ? (
          <Button variant="secondary" size="md" onClick={onClose}>
            {finished ? 'Fatto' : 'Salta'}
          </Button>
        ) : undefined
      }
    >
      {body}
    </Sheet>
  );
}

export interface DiscoveryScreenProps {
  open: boolean;
  onClose: () => void;
  /** The current page of the launcher: the widget made by itself goes there, at the first free place. */
  pageId: string;
  /** The first opening of the app: search with skeleton tiles for `SEARCH_WINDOW_MS`. */
  searchWindow?: boolean;
}

/**
 * «Dispositivi trovati» (REP-20261028-003): what Home Assistant found by itself, as a large sheet
 * over the launcher with four sections that open one at a time. «Da collegare» (open at the start)
 * is a grid of tiles with the logo of the brand; a tile opens the panel of the device with
 * «Collega» (the flow of «Aggiungi un dispositivo», in place) and «Ignora». When a device is
 * connected its widget is made by itself, by type, on the current page (`AddWidgetRequestContext`,
 * `auto`). «Collegati» lists the devices of Home Assistant a widget can show, «Nascosti» lets the
 * person take back an «Ignora», and «Non trovi il tuo dispositivo?» opens the catalogue of brands.
 *
 * It lives inside the providers of the launcher (the flow and the add request come from there). It
 * reads and polls only while it is open.
 */
export function DiscoveryScreen({
  open,
  onClose,
  pageId,
  searchWindow = false,
}: DiscoveryScreenProps) {
  // Mounted while the sheet slides away, so its content stays until it has gone.
  const mounted = usePresence(open);
  if (!mounted) return null;
  return (
    <DiscoverySession open={open} onClose={onClose} pageId={pageId} searchWindow={searchWindow} />
  );
}
