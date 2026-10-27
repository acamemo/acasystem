import { useEffect, useRef, useState } from 'react';
import { Caption, Text } from '@/components/primitives';
import type { WidgetDetailsProps, WidgetProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { MediaIcon } from '../icons';
import { isMotionState, readCameraSettings, type CameraSettings } from '../model/camera';
import { attrString } from '../model/entity';
import { testi } from '../testi';
import { MotionCue, formatTime, isOffline } from '../parts/camera/cameraShared';
import {
  CameraControlsRow,
  CameraFeedView,
  CameraInfoRow,
  CameraMissing,
} from '../parts/camera/CameraSections';
import { useCameraDetailsState } from '../parts/camera/useCameraDetailsState';
import { SnapshotWindow, asCameraConnection, useSnapshotUrl } from '../parts/CameraFeed';
import {
  OpenButton,
  WidgetLoading,
  WidgetMessage,
  WidgetShell,
  missingDevice,
} from '../parts/WidgetShell';

/**
 * Snapshot refresh of the legacy CameraCard: every `cameraRefreshInterval` seconds (minimum 2,
 * default 10), or on each new detection of `cameraMotionSensor` in motion mode.
 */
function useSnapshotRefresh(
  camera: CameraSettings,
  motionState: string | undefined,
  active: boolean
) {
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

/** `camera_card_*` widget: periodic snapshot preview; the live stream is in the details. */
export function CameraWidget({ id, settings, size, editMode }: WidgetProps) {
  const runtime = useWidgetRuntime();
  const visible = usePageVisible();
  const camera = readCameraSettings(settings);
  const entity = camera.cameraId ? runtime.entities[camera.cameraId] : undefined;
  const offline = isOffline(entity);
  const motionState = camera.motionSensorId
    ? runtime.entities[camera.motionSensorId]?.state
    : undefined;
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

  if (!runtime.entitiesLoaded)
    return <WidgetLoading size={size} label={testi.caricamentoVideocamera} />;
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

/**
 * Details of the camera widget in one column (the sheet): live stream with fallback, snapshot
 * view and refresh. The console (CameraConsole) puts the video in its own column.
 */
export function CameraDetails(props: WidgetDetailsProps) {
  const cam = useCameraDetailsState(props);
  if (!cam.camera.cameraId || !cam.entity) return <CameraMissing cam={cam} />;
  return (
    <div className="aca-media-details">
      <section className="aca-media-section" aria-label={cam.name}>
        <CameraInfoRow cam={cam} />
        <CameraControlsRow cam={cam} />
        <CameraFeedView cam={cam} />
      </section>
    </div>
  );
}
