import { useEffect, useRef, useState } from 'react';
import { Body, Button, Caption, IconText, Numeric, Segmented, Text } from '@/components/primitives';
import type { WidgetDetailsProps, WidgetProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { MediaIcon } from '../icons';
import { isMotionState, readCameraSettings, type CameraSettings } from '../model/camera';
import { attrString, type Entity } from '../model/entity';
import { testi } from '../testi';
import { CameraStream, SnapshotWindow, asCameraConnection, useSnapshotUrl } from '../parts/CameraFeed';
import { OpenButton, WidgetLoading, WidgetMessage, WidgetShell, missingDevice } from '../parts/WidgetShell';

const isOffline = (entity: Entity | undefined) =>
  !entity || entity.state === 'unavailable' || entity.state === 'unknown' || entity.state === 'off';

const formatTime = (at: number) =>
  new Date(at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

/**
 * Snapshot refresh of the legacy CameraCard: every `cameraRefreshInterval` seconds (minimum 2,
 * default 10), or on each new detection of `cameraMotionSensor` in motion mode.
 */
function useSnapshotRefresh(camera: CameraSettings, motionState: string | undefined, active: boolean) {
  const [refreshKey, setRefreshKey] = useState(() => Date.now());
  const previousMotion = useRef(false);
  const wasActive = useRef(active);

  // Back on screen (or online again): a fresh snapshot at once. Not on mount, which already has one.
  useEffect(() => {
    if (active && !wasActive.current) setRefreshKey(Date.now());
    wasActive.current = active;
  }, [active]);

  useEffect(() => {
    if (!active || camera.refreshMode !== 'interval') return undefined;
    const timer = setInterval(() => setRefreshKey(Date.now()), camera.refreshInterval * 1000);
    return () => clearInterval(timer);
  }, [active, camera.refreshMode, camera.refreshInterval]);

  const motion = isMotionState(motionState);
  useEffect(() => {
    if (!active || camera.refreshMode !== 'motion' || !camera.motionSensorId) {
      previousMotion.current = false;
      return;
    }
    if (motion && !previousMotion.current) setRefreshKey(Date.now());
    previousMotion.current = motion;
  }, [active, camera.refreshMode, camera.motionSensorId, motion]);

  return { refreshKey, refresh: () => setRefreshKey(Date.now()) };
}

function MotionCue({
  camera,
  motionState,
  short = false,
}: {
  camera: CameraSettings;
  motionState?: string;
  short?: boolean;
}) {
  if (camera.refreshMode !== 'motion' || !camera.motionSensorId || !isMotionState(motionState)) {
    return null;
  }
  return (
    <IconText icon="activity" iconTone="active" iconSize="sm" tone="ink">
      {short ? testi.movimentoBreve : testi.movimento}
    </IconText>
  );
}

/** `camera_card_*` widget: periodic snapshot preview; the live stream is in the details. */
export function CameraWidget({ id, settings, size, editMode }: WidgetProps) {
  const runtime = useWidgetRuntime();
  const visible = usePageVisible();
  const camera = readCameraSettings(settings);
  const entity = camera.cameraId ? runtime.entities[camera.cameraId] : undefined;
  const offline = isOffline(entity);
  const motionState = camera.motionSensorId ? runtime.entities[camera.motionSensorId]?.state : undefined;
  const active = visible && Boolean(entity) && !offline;
  const { refreshKey, refresh } = useSnapshotRefresh(camera, motionState, active);
  const conn = asCameraConnection(runtime.conn);
  const snapshotUrl = useSnapshotUrl(
    camera.cameraId,
    attrString(entity, 'access_token'),
    conn,
    runtime.getEntityImageUrl,
    refreshKey,
    active
  );
  const [loadedAt, setLoadedAt] = useState<number | null>(null);

  if (!runtime.entitiesLoaded) return <WidgetLoading size={size} label={testi.caricamentoVideocamera} />;
  if (!camera.cameraId || !entity) {
    return <WidgetMessage size={size} editMode={editMode} {...missingDevice(camera.cameraId)} />;
  }

  const name = runtime.customNames[id] || attrString(entity, 'friendly_name') || camera.cameraId;
  const compact = size.h <= 1;
  const status = offline
    ? testi.nonDisponibile
    : loadedAt
      ? testi.aggiornataAlle(formatTime(loadedAt))
      : testi.anteprima;

  const preview = offline ? (
    <div className={compact ? 'aca-media-show-13' : 'aca-media-grow aca-media-widget__state'}>
      <MediaIcon name="cameraOff" size={compact ? 'lg' : 'xl'} tone="muted" />
    </div>
  ) : (
    <SnapshotWindow
      url={snapshotUrl}
      alt={name}
      onLoaded={setLoadedAt}
      onRetry={refresh}
      className={compact ? 'aca-media-snapshot--thumb aca-media-show-13' : 'aca-media-art--window'}
    />
  );

  return (
    <WidgetShell size={size} editMode={editMode} label={name}>
      {preview}
      <div className={compact ? 'aca-media-text aca-media-grow' : 'aca-media-text'}>
        <OpenButton
          editMode={editMode}
          onOpen={() => runtime.openDetails(id)}
          className="aca-media-grow aca-media-text"
        >
          <Text className="aca-type aca-type--heading-sm" tone="ink">
            {name}
          </Text>{' '}
          <Caption tone={offline ? 'danger' : 'muted'}>{status}</Caption>
        </OpenButton>
        <MotionCue camera={camera} motionState={motionState} short={compact} />
      </div>
    </WidgetShell>
  );
}

type CameraView = 'stream' | 'snapshot';

const VIEWS: ReadonlyArray<{ value: CameraView; label: string }> = [
  { value: 'stream', label: testi.diretta },
  { value: 'snapshot', label: testi.istantanea },
];

/** Details of the camera widget: live stream with fallback, snapshot view and refresh. */
export function CameraDetails({ id, settings }: WidgetDetailsProps) {
  const runtime = useWidgetRuntime();
  const camera = readCameraSettings(settings);
  const entity = camera.cameraId ? runtime.entities[camera.cameraId] : undefined;
  const [view, setView] = useState<CameraView>('stream');
  const [refreshKey, setRefreshKey] = useState(() => Date.now());
  const motionState = camera.motionSensorId ? runtime.entities[camera.motionSensorId]?.state : undefined;

  if (!camera.cameraId || !entity) {
    return (
      <div className="aca-media-details">
        <Body tone="muted" role="status">
          {camera.cameraId ? testi.dispositivoNonTrovato : testi.dispositivoNonConfigurato}
        </Body>
      </div>
    );
  }

  const name = runtime.customNames[id] || attrString(entity, 'friendly_name') || camera.cameraId;
  return (
    <div className="aca-media-details">
      <section className="aca-media-section" aria-label={name}>
        <div className="aca-media-row aca-media-row--between">
          <div className="aca-media-text aca-media-grow">
            <Caption translate="no">{camera.cameraId}</Caption>
            {isOffline(entity) && (
              <IconText icon="warning" iconTone="danger" iconSize="sm" tone="danger">
                {testi.videocameraSpenta}
              </IconText>
            )}
            <MotionCue camera={camera} motionState={motionState} />
          </div>
          <Numeric as="time" dateTime={new Date(refreshKey).toISOString()} tone="muted">
            {formatTime(refreshKey)}
          </Numeric>
        </div>
        <div className="aca-media-row aca-media-row--between">
          <Segmented<CameraView>
            options={VIEWS}
            value={view}
            label={testi.vista}
            size="sm"
            onChange={(next) => {
              setView(next);
              setRefreshKey(Date.now());
            }}
          />
          <Button
            variant="control"
            shape="circle"
            size="md"
            aria-label={testi.aggiorna}
            onClick={() => setRefreshKey(Date.now())}
          >
            <MediaIcon name="refresh" size="md" />
          </Button>
        </div>
        <CameraStream
          camera={camera}
          accessToken={attrString(entity, 'access_token')}
          conn={asCameraConnection(runtime.conn)}
          getEntityImageUrl={runtime.getEntityImageUrl}
          refreshKey={refreshKey}
          snapshotOnly={view === 'snapshot'}
          alt={name}
          fit="contain"
          controls={view === 'stream'}
        />
      </section>
    </div>
  );
}
