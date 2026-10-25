import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CardSettings } from '@/@types/dashboard';
import {
  Body,
  Button,
  Caption,
  Display,
  Field,
  Heading,
  Icon,
  Numeric,
} from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { pagerMoving } from '@/utils/launcher/pagerMoving';
import { useRequestedState } from '../controls/shared/useRequestedState';
import { callSafely } from '../controls/shared/service';
import { useLockControl } from '../controls/lock/useLockControl';
import { CONFIRM_HINT } from '../controls/lock/LockWidget';
import { GestureControl } from './GestureControl';
import { WidgetDesignChart } from './WidgetDesignChart';
import {
  operationalProfile,
  readControlPreference,
  resolveOperationalEntityId,
  type OperationalProfile,
} from './operationalProfile';
import { useServiceCatalog } from './useServiceCatalog';
import { AlarmControl, AlarmControlGroup } from './AlarmControl';
import { CameraPreview } from './CameraPreview';
import { SpacerWidget } from '../utilities/spacer/SpacerWidget';
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
        aria-label={cap.label}
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

function RequestedControl({
  cap,
  confirmed,
  profile,
  values,
  disabled,
  settingsKey,
  openDetails,
  type,
}: {
  cap: Capability;
  confirmed: SampleValue;
  profile: OperationalProfile;
  values: SampleValues;
  disabled: boolean;
  settingsKey: string;
  openDetails?: () => void;
  type: string;
}) {
  const runtime = useWidgetRuntime();
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
            <Numeric>
              {new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(value)}
            </Numeric>
            <span className="uikw-unit"> {cap.unit}</span>
          </Display>
        ) : (
          <Heading level={3} size="md">
            {String(value ?? '—')}
          </Heading>
        )}
        <Caption tone="muted">{cap.label}</Caption>
      </div>
    );
  } else if (cap.kind === 'options') {
    control = (
      <div className="uikwa-choice">
        <Caption>{cap.label}</Caption>
        <select
          className="aca-adaptive-widget__select"
          aria-label={cap.label}
          disabled={disabled}
          value={String(value)}
          onChange={(event) => commit(event.target.value)}
        >
          {!cap.options.includes(String(value)) && <option value="">Scegli…</option>}
          {cap.options.map((option) => (
            <option key={option} value={option}>
              {cap.labels?.[option] ?? option}
            </option>
          ))}
        </select>
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
          aria-label={cap.label}
          aria-pressed={cap.kind === 'toggle' ? Boolean(value) : undefined}
          onClick={() => commit(cap.kind === 'toggle' ? !value : true)}
        >
          <Icon name={cap.icon} size="lg" />
        </Button>
        <Caption>{cap.label}</Caption>
      </div>
    );
  }
  return (
    <div data-control-id={cap.id} aria-busy={request.pending || undefined}>
      {control}
      {(request.pending || request.message || sent) && (
        <Caption tone={request.failed ? 'danger' : 'muted'} role="status">
          {request.message ||
            (request.pending ? 'Attendo conferma da Home Assistant…' : 'Comando inviato')}
        </Caption>
      )}
    </div>
  );
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
  const tier = calculateWidgetTier(size.w, size.h);
  const host = useRef<HTMLElement>(null);
  const [capacity, setCapacity] = useState<number | null>(null);
  const [showChart, setShowChart] = useState(true);
  useEffect(() => {
    const element = host.current;
    if (
      !element ||
      typeof ResizeObserver === 'undefined' ||
      tier === 'compact' ||
      tier === 'page' ||
      detailsMode
    )
      return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setShowChart(height >= 240);
        setCapacity(
          Math.max(
            1,
            Math.floor(width / 116) *
              Math.max(1, Math.floor((height - (height >= 240 ? 76 : 0)) / 130))
          )
        );
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [tier, detailsMode]);
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
  const available =
    type === 'spacer' || type === 'room'
      ? profile.capabilities.length > 0
      : entity &&
        entity.state !== 'unavailable' &&
        (entity.state !== 'unknown' ||
          ['button', 'input_button', 'scene'].includes(entityId.split('.')[0]!));
  const blocked = editMode || (type !== 'spacer' && !runtime.conn) || !available;
  const configure = onConfigure ?? openDetails;
  const open = useCallback(() => {
    // A tap that only stops the fling of the pager is not a tap on the widget (ADR-0016, Body/Tap).
    if (host.current && pagerMoving(host.current)) return;
    openDetails?.();
  }, [openDetails]);
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
    <article
      ref={host}
      className="aca-adaptive-widget"
      data-details={detailsMode || undefined}
      data-tier={tier}
      data-widget-type={type}
      data-entity-id={entityId}
      aria-label={String(entity?.attributes.friendly_name ?? type)}
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
        <Body role="status">Caricamento del dispositivo…</Body>
      ) : !available ? (
        <div className="aca-adaptive-widget__notice">
          <Body role="status">Dispositivo non disponibile</Body>
          {configure && (
            <Button variant="control" onClick={configure}>
              Configura dispositivo
            </Button>
          )}
        </div>
      ) : (
        <>
          {type === 'camera' && tier !== 'compact' && !detailsMode ? (
            <CameraPreview entityId={entityId} settings={settings} disabled={Boolean(blocked)} />
          ) : (
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
                  operational
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
              <Caption role="status">Connessione a Home Assistant assente</Caption>
            )}
          </div>
        </>
      )}
    </article>
  );
}
