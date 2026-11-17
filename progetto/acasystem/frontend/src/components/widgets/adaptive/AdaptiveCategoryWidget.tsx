import { TodoWidget } from '../home/todo/TodoWidget';
import { TodoDetails } from '../home/todo/TodoDetails';
import { RoomWidget } from '../utilities/room/RoomWidget';
import { RoomDetails } from '../utilities/room/RoomDetails';
import { CarWidget } from '../utilities/car/CarWidget';
import { CarDetails } from '../utilities/car/CarDetails';
import { CostWidget } from '../utilities/energy/CostWidget';
import { CostDetails } from '../utilities/energy/CostDetails';
import { NordpoolWidget } from '../utilities/energy/NordpoolWidget';
import { NordpoolDetails } from '../utilities/energy/NordpoolDetails';
import { ProductSensorWidget } from '../home/sensor/ProductSensorWidget';
import { ProductSensorDetails } from '../home/sensor/ProductSensorDetails';
import { ProductTvWidget } from '../home/tv/ProductTvWidget';
import { ProductTvDetails } from '../home/tv/ProductTvDetails';
import { ProductMediaWidget } from '../home/media/ProductMediaWidget';
import { ProductMediaDetails } from '../home/media/ProductMediaDetails';
import { sensorProductBinding, multimediaProductBinding } from '@/utils/devices/productBinding';
import { ProductMowerWidget } from '../home/mower/ProductMowerWidget';
import { ProductMowerDetails } from '../home/mower/ProductMowerDetails';
import { mowerProductBinding } from '../home/mower/productMowerModel';
import { ProductVacuumWidget } from '../home/vacuum/ProductVacuumWidget';
import { ProductVacuumDetails } from '../home/vacuum/ProductVacuumDetails';
import { vacuumProductBinding } from '../home/vacuum/productVacuumModel';
import { ProductCameraWidget } from '../home/camera/ProductCameraWidget';
import { ProductCameraDetails } from '../home/camera/ProductCameraDetails';
import { cameraProductBinding } from '../home/camera/productCameraModel';
import { ProductAlarmWidget } from '../home/alarm/ProductAlarmWidget';
import { ProductAlarmDetails } from '../home/alarm/ProductAlarmDetails';
import { alarmProductBinding } from '../home/alarm/productAlarmModel';
import { ProductLockWidget } from '../home/lock/ProductLockWidget';
import { ProductLockDetails } from '../home/lock/ProductLockDetails';
import { lockProductBinding } from '../home/lock/productLockModel';
import { ProductFanWidget } from '../home/fan/ProductFanWidget';
import { ProductFanDetails } from '../home/fan/ProductFanDetails';
import { fanProductBinding } from '../home/fan/productFanModel';
import { ProductCoverWidget } from '../home/cover/ProductCoverWidget';
import { ProductCoverDetails } from '../home/cover/ProductCoverDetails';
import { coverProductBinding } from '../home/cover/productCoverModel';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CardSettings } from '@/@types/dashboard';
import { isProductDeviceBinding } from '../../../../../contracts/productDevice';
import {
  Body,
  Button,
  Caption,
  Display,
  Field,
  Heading,
  Icon,
  Numeric,
  Skeleton,
} from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { formatReading, unitSuffixBox } from '@/utils/formatting';
import { pagerMoving } from '@/utils/launcher/pagerMoving';
import { useRequestedState } from '../controls/shared/useRequestedState';
import { entityName } from '../controls/shared/entity';
import { callSafely } from '../controls/shared/service';
import { useLockControl } from '../controls/lock/useLockControl';
import { CONFIRM_HINT } from '../controls/lock/LockWidget';
import { GestureControl } from './GestureControl';
import { ProductClimateWidget } from '../home/climate/ProductClimateWidget';
import { ProductClimateDetails } from '../home/climate/ProductClimateDetails';
import { climateProductBinding } from '../home/climate/productClimateModel';
import { PlugWidget } from '../controls/plug/PlugWidget';
import { wantsTrendChart } from './chartPolicy';
import { WidgetDesignChart } from './WidgetDesignChart';
import {
  operationalProfile,
  readControlPreference,
  resolveOperationalEntityId,
  type OperationalProfile,
} from './operationalProfile';
import { useHomeMeasurementKey } from '@/hooks/startup/HomeStartupContext';
import { useServiceCatalog } from './useServiceCatalog';
import { useTvWake } from '../media/hooks/useTvWake';
import { tvMaybeAsleep, tvStateWord } from '../media/model/tv';
import { AdaptiveNameContext, adaptiveStateWord, useControlLabel } from './adaptiveState';
import { AlarmControl, AlarmControlGroup } from './AlarmControl';
import { CameraPreview } from './CameraPreview';
import { SpacerWidget } from '../utilities/spacer/SpacerWidget';
import { roomName } from '../utilities/room/RoomWidget';
import { OptionPicker } from '../utilities/shared/details';
import { TodoContent } from './TodoContent';
import { useMediaResources } from './useMediaResources';
import type { Capability, SampleValue, SampleValues } from './widgetDesignModel';
import './adaptiveWidget.css';

export type WidgetTier = 'compact' | 'standard' | 'large' | 'page';
export function calculateWidgetTier(w: number, h: number): WidgetTier {
  const area = w * h;
  if (area <= 2 || w === 1 || h === 1) return 'compact';
  if (area <= 6) return 'standard';
  if (area <= 12) return 'large';
  return 'page';
}
/** Height the name and state lines take above the controls, in px. */
const HEADER_HEIGHT = 44;
/** Height of the trend chart slot and the gap that goes with it, in px (adaptiveWidget.css). */
const CHART_SLOT_HEIGHT = 96;
/** Below this measured side the name and a labelled command cannot share a standard card. */
const COMPACT_PIXEL_SIDE = 112;
const sameValue = (a: SampleValue, b: SampleValue) =>
  typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 0.01 : Object.is(a, b);

function LockControl({
  entityId,
  cap,
  disabled,
  openDetails,
}: {
  entityId: string;
  cap: Capability;
  disabled: boolean;
  openDetails?: () => void;
}) {
  const lock = useLockControl(entityId, disabled);
  const label = useControlLabel(cap.label);
  const run = () => {
    const accepted = cap.id === 'open' ? lock.open() : lock.isLocked ? lock.unlock() : lock.lock();
    if (!accepted) openDetails?.();
  };
  return (
    <div className="uikwa-toggle">
      <Button
        variant="control"
        shape="circle"
        size="lg"
        disabled={lock.actionDisabled}
        aria-label={label}
        aria-pressed={cap.id === 'locked' ? lock.isLocked : undefined}
        aria-busy={lock.command.pending || undefined}
        onClick={run}
      >
        <Icon name={lock.isLocked ? 'lock' : 'unlock'} size="lg" />
      </Button>
      <Caption>{cap.label}</Caption>
      <Caption tone={lock.command.failed ? 'danger' : 'muted'} role="status">
        {lock.confirmUnlock ? CONFIRM_HINT : lock.command.message || lock.label}
      </Caption>
    </div>
  );
}

/** Name of the device and its state in words: the first lines of every card above the smallest. */
function WidgetName({ name, word }: { name: string; word: string | null }) {
  return (
    <div className="aca-adaptive-widget__header">
      <Heading level={3} size="sm" className="aca-adaptive-widget__name">
        {name}
      </Heading>
      {word && (
        <Caption tone="muted" className="aca-adaptive-widget__state">
          {word}
        </Caption>
      )}
    </div>
  );
}

function RequestedControl({
  cap,
  confirmed,
  profile,
  values,
  disabled,
  settingsKey,
  openDetails,
  type,
  stateWord,
  printedName,
}: {
  cap: Capability;
  confirmed: SampleValue;
  profile: OperationalProfile;
  values: SampleValues;
  disabled: boolean;
  settingsKey: string;
  openDetails?: () => void;
  type: string;
  /** The device's state in words, printed in place of the label on the smallest card. */
  stateWord?: string | null;
  /** The name the card prints on top: a reading labelled with the same words does not repeat it. */
  printedName?: string | null;
}) {
  const runtime = useWidgetRuntime();
  const label = useControlLabel(cap.label);
  const request = useRequestedState<SampleValue>({ confirmed, matches: sameValue });
  const clearRequest = request.clear;
  const [preview, setPreview] = useState<SampleValue | undefined>();
  const [sent, setSent] = useState(false);
  const value = preview ?? request.value;
  useEffect(() => {
    setPreview(undefined);
  }, [confirmed]);
  useEffect(() => {
    if (disabled) {
      setPreview(undefined);
      clearRequest();
    }
  }, [disabled, clearRequest]);
  const commit = (next: SampleValue) => {
    setPreview(undefined);
    if (disabled) return;
    const operation = profile.execute(cap.id, next, values);
    if (!operation) return;
    if (operation.setting) {
      runtime.saveCardSetting(settingsKey, operation.setting.key, operation.setting.value);
      return;
    }
    if (!operation.calls.length) return;
    request.request(next);
    setSent(false);
    const pending = Promise.all(
      operation.calls.map((call) => callSafely(runtime, call.domain, call.service, call.data))
    );
    request.track(pending);
    request.settle();
    if ((cap.kind === 'action' && !operation.confirmation) || operation.acknowledgementOnly)
      void pending
        .then(() => {
          request.clear();
          setSent(true);
        })
        .catch(() => undefined);
  };
  if ((type === 'lock' || type === 'car') && ['locked', 'open'].includes(cap.id))
    return (
      <LockControl
        entityId={profile.targets[cap.id]!}
        cap={cap}
        disabled={disabled}
        openDetails={openDetails}
      />
    );
  if (type === 'alarm' && cap.kind === 'action')
    return (
      <AlarmControl
        cap={cap}
        entityId={profile.targets[cap.id]!}
        disabled={disabled}
        openDetails={openDetails}
      />
    );
  let control;
  if (cap.kind === 'range') {
    control = (
      <GestureControl
        capability={cap}
        value={Number(value)}
        saturation={Number(values.saturation ?? 100)}
        disabled={disabled}
        onChange={setPreview}
        onCommit={commit}
        onCancel={() => setPreview(undefined)}
      />
    );
  } else if (cap.kind === 'input') {
    control = (
      <Field
        label={cap.label}
        type={cap.inputType}
        value={String(value)}
        disabled={disabled}
        onChange={(event) => setPreview(event.target.value)}
        onBlur={(event) => {
          if (preview !== undefined && event.target.value !== String(confirmed))
            commit(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') setPreview(undefined);
        }}
      />
    );
  } else if (cap.kind === 'reading') {
    control = (
      <div className="uikw-reading" data-control-id={cap.id}>
        {typeof value === 'number' ? (
          <Display as="span" size="sm">
            <Numeric>{formatReading(value)}</Numeric>
            <span className="uikw-unit">{unitSuffixBox(cap.unit)}</span>
          </Display>
        ) : (
          <Heading level={3} size="md">
            {formatReading(value)}
          </Heading>
        )}
        {cap.label.trim().toLowerCase() !== printedName?.trim().toLowerCase() && (
          <Caption tone="muted">{cap.label}</Caption>
        )}
      </div>
    );
  } else if (cap.kind === 'options') {
    control = (
      <div className="uikwa-choice">
        <Caption>{cap.label}</Caption>
        <OptionPicker
          label={cap.label}
          showLabel={false}
          disabled={disabled}
          value={cap.options.includes(String(value)) ? String(value) : null}
          placeholder="Scegli…"
          options={cap.options.map((option) => ({
            value: option,
            label: cap.labels?.[option] ?? option,
          }))}
          onSelect={commit}
          isolateEscape
        />
      </div>
    );
  } else {
    control = (
      <div className="uikwa-toggle">
        <Button
          variant="control"
          shape="circle"
          size="lg"
          disabled={disabled}
          state={cap.kind === 'toggle' && Boolean(value) && 'on'}
          aria-label={label}
          aria-pressed={cap.kind === 'toggle' ? Boolean(value) : undefined}
          onClick={() => commit(cap.kind === 'toggle' ? !value : true)}
        >
          <Icon name={cap.icon} size="lg" />
        </Button>
        <Caption>
          {stateWord && cap.kind === 'toggle' && ['power', 'playing'].includes(cap.id)
            ? stateWord
            : cap.label}
        </Caption>
      </div>
    );
  }
  return (
    <div className="aca-adaptive-widget__command" data-control-id={cap.id} aria-busy={request.pending || undefined}>
      {control}
      {(request.pending || request.message || sent) && (
        <>
          <Caption className="aca-adaptive-widget__feedback" tone={request.failed ? 'danger' : 'muted'} role="status">
            {request.message ||
              (request.pending ? 'Sto inviando il comando…' : 'Comando inviato')}
          </Caption>
          <Icon
            name={request.pending ? 'refresh' : request.failed ? 'warning' : 'done'}
            size="sm"
            className="aca-adaptive-widget__feedback-marker"
            color={request.failed ? 'var(--aca-danger-ink)' : 'var(--aca-ink)'}
          />
        </>
      )}
    </div>
  );
}

/** The name the person gave the widget, else the device's own (a room has its area name). */
function widgetName(
  runtime: ReturnType<typeof useWidgetRuntime>,
  type: string,
  id: string,
  settings: CardSettings | undefined,
  entityId: string
): string {
  if (type === 'room') return roomName(id, settings ?? EMPTY_SETTINGS, runtime.customNames);
  if (isProductDeviceBinding(settings?.productDevice) && settings.productDevice.primaryEntityId === entityId
    && typeof settings.name === 'string' && settings.name.trim()) return runtime.customNames[id] || settings.name.trim();
  return entityName(runtime, id, runtime.entities[entityId], entityId);
}

export interface AdaptiveCategoryWidgetProps {
  type: string;
  entityId: string;
  id?: string;
  settingsKey?: string;
  settings?: CardSettings;
  size: { w: number; h: number };
  editMode: boolean;
  onConfigure?: () => void;
  openDetails?: () => void;
  detailsMode?: boolean;
}
const EMPTY_SETTINGS: CardSettings = {};
export function AdaptiveCategoryWidget(props: AdaptiveCategoryWidgetProps) {
  const runtime = useWidgetRuntime();
  const resolved = resolveOperationalEntityId(
    props.type,
    props.entityId,
    props.settings ?? EMPTY_SETTINGS,
    runtime.entities
  );
  if (props.type === 'todo' || props.type === 'room') {
    const utilityProps = { id: props.id ?? resolved, settingsKey: props.settingsKey ?? props.id ?? resolved,
      settings: props.settings ?? EMPTY_SETTINGS, size: props.size, editMode: props.editMode };
    if (props.type === 'todo') return props.detailsMode
      ? <TodoDetails {...utilityProps} onClose={() => undefined} />
      : <TodoWidget {...utilityProps} openDetails={props.openDetails} />;
    return props.detailsMode ? <RoomDetails {...utilityProps} onClose={() => undefined} />
      : <RoomWidget {...utilityProps} />;
  }
  if (props.type === 'car') {
    const carProps = { id: props.id ?? resolved, settingsKey: props.settingsKey ?? props.id ?? resolved,
      settings: props.settings ?? EMPTY_SETTINGS, size: props.size, editMode: props.editMode };
    return props.detailsMode ? <CarDetails {...carProps} onClose={() => undefined} />
      : <CarWidget {...carProps} openDetails={props.openDetails} />;
  }
  if (props.type === 'cost' || props.type === 'nordpool') {
    const energyProps = { id: props.id ?? resolved, settingsKey: props.settingsKey ?? props.id ?? resolved,
      settings: props.settings ?? EMPTY_SETTINGS, size: props.size, editMode: props.editMode };
    if (props.type === 'cost') return props.detailsMode ? <CostDetails {...energyProps} onClose={() => undefined} />
      : <CostWidget {...energyProps} openDetails={props.openDetails} />;
    return props.detailsMode ? <NordpoolDetails {...energyProps} onClose={() => undefined} />
      : <NordpoolWidget {...energyProps} openDetails={props.openDetails} />;
  }
  if (props.type === 'sensor' && sensorProductBinding(props.settings ?? EMPTY_SETTINGS)) {
    const productProps = { id: props.id ?? resolved, settingsKey: props.settingsKey ?? props.id ?? resolved,
      settings: props.settings ?? EMPTY_SETTINGS, size: props.size, editMode: props.editMode };
    return props.detailsMode ? <ProductSensorDetails {...productProps} onClose={() => undefined} />
      : <ProductSensorWidget {...productProps} openDetails={props.openDetails} />;
  }
  const multimedia = multimediaProductBinding(props.settings ?? EMPTY_SETTINGS);
  if (multimedia && (multimedia.family === 'tv'
    ? props.type === 'androidtv' || props.type === 'appletv' : props.type === multimedia.family)) {
    const productProps = { id: props.id ?? resolved, settingsKey: props.settingsKey ?? props.id ?? resolved,
      settings: props.settings ?? EMPTY_SETTINGS, size: props.size, editMode: props.editMode };
    if (multimedia.family === 'tv') return props.detailsMode
      ? <ProductTvDetails {...productProps} onClose={() => undefined} />
      : <ProductTvWidget {...productProps} openDetails={props.openDetails} />;
    return props.detailsMode ? <ProductMediaDetails {...productProps} onClose={() => undefined} />
      : <ProductMediaWidget {...productProps} openDetails={props.openDetails} />;
  }
  if (props.type === 'mower' && mowerProductBinding(props.settings ?? EMPTY_SETTINGS)?.primaryEntityId === resolved) {
    const productProps = { id: props.id ?? resolved, settingsKey: props.settingsKey ?? props.id ?? resolved,
      settings: props.settings ?? EMPTY_SETTINGS, size: props.size, editMode: props.editMode };
    return props.detailsMode ? <ProductMowerDetails {...productProps} onClose={() => undefined} />
      : <ProductMowerWidget {...productProps} openDetails={props.openDetails} />;
  }
  if (props.type === 'vacuum' && vacuumProductBinding(props.settings ?? EMPTY_SETTINGS)?.primaryEntityId === resolved) {
    const productProps = { id: props.id ?? resolved, settingsKey: props.settingsKey ?? props.id ?? resolved,
      settings: props.settings ?? EMPTY_SETTINGS, size: props.size, editMode: props.editMode };
    return props.detailsMode ? <ProductVacuumDetails {...productProps} onClose={() => undefined} />
      : <ProductVacuumWidget {...productProps} openDetails={props.openDetails} />;
  }
  if (props.type === 'camera' && cameraProductBinding(props.settings ?? EMPTY_SETTINGS)?.primaryEntityId === resolved) {
    const productProps = { id: props.id ?? resolved, settingsKey: props.settingsKey ?? props.id ?? resolved,
      settings: props.settings ?? EMPTY_SETTINGS, size: props.size, editMode: props.editMode };
    return props.detailsMode ? <ProductCameraDetails {...productProps} onClose={() => undefined} />
      : <ProductCameraWidget {...productProps} openDetails={props.openDetails} />;
  }
  if (props.type === 'alarm' && alarmProductBinding(props.settings ?? EMPTY_SETTINGS)?.primaryEntityId === resolved) {
    const productProps = { id: props.id ?? resolved, settingsKey: props.settingsKey ?? props.id ?? resolved,
      settings: props.settings ?? EMPTY_SETTINGS, size: props.size, editMode: props.editMode };
    return props.detailsMode ? <ProductAlarmDetails {...productProps} onClose={() => undefined} />
      : <ProductAlarmWidget {...productProps} openDetails={props.openDetails} />;
  }
  if (props.type === 'lock' && lockProductBinding(props.settings ?? EMPTY_SETTINGS)?.primaryEntityId === resolved) {
    const productProps = { id: props.id ?? resolved, settingsKey: props.settingsKey ?? props.id ?? resolved,
      settings: props.settings ?? EMPTY_SETTINGS, size: props.size, editMode: props.editMode };
    return props.detailsMode ? <ProductLockDetails {...productProps} onClose={() => undefined} />
      : <ProductLockWidget {...productProps} openDetails={props.openDetails} />;
  }
  if (props.type === 'fan' && fanProductBinding(props.settings ?? EMPTY_SETTINGS)?.primaryEntityId === resolved) {
    const productProps = { id: props.id ?? resolved, settingsKey: props.settingsKey ?? props.id ?? resolved,
      settings: props.settings ?? EMPTY_SETTINGS, size: props.size, editMode: props.editMode };
    return props.detailsMode ? <ProductFanDetails {...productProps} onClose={() => undefined} />
      : <ProductFanWidget {...productProps} openDetails={props.openDetails} />;
  }
  if (props.type === 'cover' && coverProductBinding(props.settings ?? EMPTY_SETTINGS)?.primaryEntityId === resolved) {
    const productProps = { id: props.id ?? resolved, settingsKey: props.settingsKey ?? props.id ?? resolved,
      settings: props.settings ?? EMPTY_SETTINGS, size: props.size, editMode: props.editMode };
    return props.detailsMode ? <ProductCoverDetails {...productProps} onClose={() => undefined} />
      : <ProductCoverWidget {...productProps} openDetails={props.openDetails} />;
  }
  if (props.type === 'climate' && climateProductBinding(props.settings ?? EMPTY_SETTINGS)?.primaryEntityId === resolved) {
    const productProps = { id: props.id ?? resolved, settingsKey: props.settingsKey ?? props.id ?? resolved,
      settings: props.settings ?? EMPTY_SETTINGS, size: props.size, editMode: props.editMode };
    return props.detailsMode ? <ProductClimateDetails {...productProps} onClose={() => undefined} />
      : <ProductClimateWidget {...productProps} openDetails={props.openDetails} />;
  }
  if (props.type === 'plug' && !props.detailsMode) return <PlugWidget id={props.id ?? resolved}
    settingsKey={props.settingsKey ?? props.id ?? resolved} settings={props.settings ?? EMPTY_SETTINGS}
    entityId={resolved} size={props.size} editMode={props.editMode} openDetails={props.openDetails} />;
  return <AdaptiveBody key={props.type + '|' + resolved} {...props} entityId={resolved} />;
}
function AdaptiveBody({
  type,
  entityId,
  id = entityId,
  settingsKey = id,
  settings = EMPTY_SETTINGS,
  size,
  editMode,
  openDetails,
  onConfigure,
  detailsMode = false,
}: AdaptiveCategoryWidgetProps) {
  const runtime = useWidgetRuntime();
  const services = useServiceCatalog();
  const preparationKey = useHomeMeasurementKey();
  const visible = usePageVisible();
  const entity = runtime.entities[entityId];
  const resources = useMediaResources(type, entityId, services, settings.adaptiveMediaBrowse);
  const profile = useMemo(
    () =>
      operationalProfile({
        type,
        entityId,
        settings,
        entities: runtime.entities,
        services,
        haConfig: runtime.haConfig,
        queue: resources.queue,
        content: resources.content,
      }),
    [
      type,
      entityId,
      settings,
      runtime.entities,
      services,
      runtime.haConfig,
      resources.queue,
      resources.content,
    ]
  );
  const preference = readControlPreference(settings, profile.capabilities);
  const nominalTier = calculateWidgetTier(size.w, size.h);
  const [measuredBox, setMeasuredBox] = useState<{ width: number; height: number } | null>(null);
  const pixelCompact = !detailsMode && Boolean(measuredBox &&
    (measuredBox.width < COMPACT_PIXEL_SIDE || measuredBox.height < COMPACT_PIXEL_SIDE));
  const compactNotice = pixelCompact && Boolean(measuredBox &&
    (measuredBox.width < 80 || measuredBox.height < 80));
  const tier = detailsMode || !measuredBox || nominalTier === 'compact'
    ? nominalTier
    : pixelCompact
      ? 'compact'
      : measuredBox.height < 240 && (nominalTier === 'large' || nominalTier === 'page')
        ? 'standard'
        : nominalTier;
  const host = useRef<HTMLElement>(null);
  const [capacity, setCapacity] = useState<number | null>(null);
  const [showChart, setShowChart] = useState(true);
  const trendChart = wantsTrendChart({
    type,
    history: profile.history,
    hasSeries: Boolean(profile.series?.length),
  });
  const [todoRows, setTodoRows] = useState(3);
  const [fitCheck, setFitCheck] = useState(0);
  const recheck = useCallback(() => setFitCheck((count) => count + 1), []);
  useLayoutEffect(() => {
    const element = host.current;
    if (!element || detailsMode) return;
    const measure = (entry?: ResizeObserverEntry) => {
      const border = entry?.borderBoxSize?.[0];
      const width = border?.inlineSize || element.offsetWidth || entry?.contentRect.width || 0;
      const height = border?.blockSize || element.offsetHeight || entry?.contentRect.height || 0;
      if (width <= 0 || height <= 0) return;
      const style = entry ? null : getComputedStyle(element);
      const inset = (a: string | undefined, b: string | undefined) =>
        (parseFloat(a || '0') || 0) + (parseFloat(b || '0') || 0);
      const contentWidth = entry?.contentRect.width ?? Math.max(0, width -
        inset(style?.paddingLeft, style?.paddingRight) - inset(style?.borderLeftWidth, style?.borderRightWidth));
      const contentHeight = entry?.contentRect.height ?? Math.max(0, height -
        inset(style?.paddingTop, style?.paddingBottom) - inset(style?.borderTopWidth, style?.borderBottomWidth));
      if (contentWidth <= 0 || contentHeight <= 0) return;
      // Read layout dimensions before the first paint, not transformed entrance bounds. The
      // observer then keeps the same border/content-box contract for genuine later resizes.
      const box = { width, height };
      setMeasuredBox((previous) => previous?.width === width && previous.height === height ? previous : box);
      setTodoRows(3);
      setShowChart(contentHeight >= 240);
      const chartRoom = trendChart && contentHeight >= 240 ? CHART_SLOT_HEIGHT : 0;
      setCapacity(Math.max(1, Math.floor(contentWidth / 116) *
        Math.max(1, Math.floor((contentHeight - HEADER_HEIGHT - chartRoom) / 130))));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => { if (entry) measure(entry); });
    observer.observe(element, { box: 'border-box' });
    return () => observer.disconnect();
  }, [detailsMode, trendChart, preparationKey]);
  const max = detailsMode
    ? Infinity
    : tier === 'compact'
      ? 1
      : tier === 'standard'
        ? 4
        : tier === 'large'
          ? 6
          : Infinity;
  const displayCaps = preference.order
    .filter(
      (capId) =>
        (detailsMode || preference.visible.includes(capId)) &&
        !(detailsMode && type === 'car' && ['locked', 'open'].includes(capId))
    )
    .map((capId) => profile.capabilities.find((cap) => cap.id === capId)!)
    .filter(Boolean)
    .slice(
      0,
      capacity !== null && !detailsMode && tier !== 'page' && tier !== 'compact'
        ? Math.min(max, capacity)
        : max
    );
  if (tier === 'compact' && !settings.adaptiveControls && !detailsMode) {
    const priority =
      profile.capabilities.find(
        (cap) => preference.visible.includes(cap.id) && cap.kind !== 'reading'
      ) ?? displayCaps[0];
    if (priority) displayCaps.splice(0, displayCaps.length, priority);
  }
  // An LG webOS TV that is off reports `unavailable`: «Spento» when it can be woken.
  const wake = useTvWake(type === 'androidtv' ? entity : undefined);
  const tvAsleep = type === 'androidtv' && tvMaybeAsleep(entity) && wake !== false;
  const available =
    type === 'spacer' || type === 'room'
      ? profile.capabilities.length > 0
      : entity &&
        entity.state !== 'unavailable' &&
        (entity.state !== 'unknown' ||
          ['button', 'input_button', 'scene'].includes(entityId.split('.')[0]!));
  const blocked = editMode || (type !== 'spacer' && !runtime.conn) || !available;
  const name = widgetName(runtime, type, id, settings, entityId);
  const shownIds = new Set(displayCaps.map((cap) => cap.id));
  const stateWord = adaptiveStateWord(type, entity, shownIds);
  const showName = tier !== 'compact' && !detailsMode;
  const configure = onConfigure ?? openDetails;
  const open = useCallback(() => {
    // A tap that only stops the fling of the pager is not a tap on the widget (ADR-0016, Body/Tap).
    if (host.current && pagerMoving(host.current)) return;
    openDetails?.();
  }, [openDetails]);
  // The name takes room the controls count did not reckon with: while the card is cut off, show
  // one task less (down to none) or one control less (never below one) instead of letting it
  // hang out of the card.
  useLayoutEffect(() => {
    const element = host.current;
    if (!element || !measuredBox || detailsMode || tier === 'compact' || tier === 'page') return;
    if (element.scrollHeight <= element.clientHeight + 1) return;
    // The chart goes first: the name and the commands matter more than a trend.
    if (trendChart && showChart) setShowChart(false);
    else if (type === 'todo' && todoRows > 0) setTodoRows(todoRows - 1);
    else if (displayCaps.length > 1) setCapacity(displayCaps.length - 1);
  }, [detailsMode, tier, type, todoRows, displayCaps.length, fitCheck, name, trendChart, showChart, measuredBox, preparationKey]);
  if (type === 'spacer' && !detailsMode)
    return (
      <div
        className="aca-adaptive-spacer"
        style={{ paddingBlock: Number(settings.adaptiveSpacing ?? 32) }}
      >
        <SpacerWidget
          id={id}
          settingsKey={settingsKey}
          settings={settings}
          size={size}
          editMode={editMode}
        />
        {onConfigure && (
          <Button
            variant="control"
            shape="circle"
            size="sm"
            aria-label="Configura separatore"
            onClick={onConfigure}
          >
            <Icon name="settings" />
          </Button>
        )}
      </div>
    );
  return (
    <AdaptiveNameContext value={tier === 'compact' && !detailsMode ? name : null}>
    <article
      ref={host}
      className="aca-adaptive-widget"
      data-details={detailsMode || undefined}
      data-tier={tier}
      data-pixel-compact={pixelCompact || undefined}
      data-widget-type={type}
      data-entity-id={entityId}
      aria-label={name}
    >
      {openDetails && (
        // The body of the widget (ADR-0016, G3): a transparent button under the commands, over
        // the whole widget, so a tap anywhere but on a command opens the details. No dot to aim at.
        <button
          type="button"
          className="aca-adaptive-widget__open"
          aria-label="Apri dettagli"
          data-widget-open=""
          disabled={editMode}
          onClick={open}
        />
      )}
      {!runtime.entitiesLoaded ? (
        <Skeleton variant="compact" rows={1} label="Caricamento del dispositivo…" />
      ) : !available ? (
        <div className="aca-adaptive-widget__notice" data-compact={compactNotice || undefined}>
          {showName && entity && <WidgetName name={name} word={null} />}
          <Body role="status" className={compactNotice ? 'sr-only' : undefined}>
            {tvAsleep
              ? tvStateWord('off')
              : entity
                ? 'Non raggiungibile'
                : 'Dispositivo non disponibile'}
          </Body>
          {compactNotice && (!configure || tvAsleep) && (
            <Icon name={tvAsleep ? 'power' : 'warning'} size="lg" />
          )}
          {configure && !tvAsleep && (
            <Button
              variant="control"
              shape={compactNotice ? 'circle' : undefined}
              size={compactNotice ? 'sm' : undefined}
              aria-label="Configura dispositivo"
              onClick={configure}
            >
              {compactNotice ? <Icon name="warning" /> : 'Configura dispositivo'}
            </Button>
          )}
        </div>
      ) : (
        <>
          {showName && <WidgetName name={name} word={stateWord} />}
          {type === 'camera' && tier !== 'compact' && !detailsMode ? (
            <CameraPreview entityId={entityId} settings={settings} disabled={Boolean(blocked)} />
          ) : (
            trendChart &&
            showChart &&
            tier !== 'compact' &&
            !detailsMode &&
            type !== 'todo' && (
              <div className="aca-adaptive-widget__chart-wrap">
                <WidgetDesignChart
                  type={type}
                  capabilities={profile.capabilities}
                  values={profile.values}
                  status="available"
                  historySource={profile.history}
                  historyPoints={profile.series}
                  seriesLabel={profile.seriesLabel}
                  hours={profile.historyHours}
                  enabled={visible}
                />
              </div>
            )
          )}
          <div className="aca-adaptive-widget__controls-wrap">
            <div className="uikwa-controls" data-size={tier}>
              {type === 'todo' && tier !== 'compact' && (
                <TodoContent
                  entityId={entityId}
                  disabled={Boolean(blocked)}
                  expanded={detailsMode || tier === 'page'}
                  rows={todoRows}
                  onSettle={recheck}
                />
              )}
              {type === 'alarm' ? (
                <AlarmControlGroup entityId={entityId}>
                  {displayCaps.map((cap) => (
                    <RequestedControl
                      key={cap.id}
                      cap={cap}
                      confirmed={profile.values[cap.id] ?? ''}
                      values={profile.values}
                      profile={profile}
                      type={type}
                      disabled={Boolean(blocked)}
                      settingsKey={settingsKey}
                      openDetails={openDetails}
                    />
                  ))}
                </AlarmControlGroup>
              ) : (
                displayCaps.map((cap) => (
                  <RequestedControl
                    key={cap.id + '|' + profile.targets[cap.id]}
                    cap={cap}
                    confirmed={profile.values[cap.id] ?? ''}
                    values={profile.values}
                    profile={profile}
                    type={type}
                    stateWord={tier === 'compact' && !detailsMode ? stateWord : null}
                    printedName={showName ? name : null}
                    disabled={Boolean(
                      blocked ||
                      (type !== 'spacer' &&
                        ['unknown', 'unavailable'].includes(
                          runtime.entities[profile.targets[cap.id]!]?.state ?? 'unknown'
                        ) &&
                        !['button', 'input_button', 'scene'].includes(
                          profile.targets[cap.id]?.split('.')[0] ?? ''
                        ))
                    )}
                    settingsKey={settingsKey}
                    openDetails={openDetails}
                  />
                ))
              )}
            </div>
            {!displayCaps.length && services === null && runtime.conn && type !== 'spacer' ? (
              <Caption role="status">Caricamento dei comandi…</Caption>
            ) : (
              !displayCaps.length && (
                <Caption>
                  Nessun controllo selezionato.
                  {configure && (
                    <Button variant="control" onClick={configure}>
                      Scegli controlli
                    </Button>
                  )}
                </Caption>
              )
            )}
            {detailsMode && resources.error && (
              <Caption role="status">Contenuti o coda non disponibili</Caption>
            )}
            {detailsMode &&
              profile.unavailable.map((message) => <Caption key={message}>{message}</Caption>)}
            {!runtime.conn && type !== 'spacer' && (
              <Caption role="status">Collegamento con la casa assente</Caption>
            )}
          </div>
        </>
      )}
    </article>
    </AdaptiveNameContext>
  );
}
