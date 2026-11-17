import { useEffect, useState } from 'react';
import type { CardSettings } from '@/@types/dashboard';
import { Button, Caption, Segmented } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { CameraStream, asCameraConnection } from '../../media/parts/CameraFeed';
import { isMotionState } from '../../media/model/camera';
import {
  cameraChannelSettings,
  productCameraView,
  PRODUCT_CAMERA_FEATURE,
} from './productCameraModel';

/** Mounted for one visible lens only; unmounting owns the existing transport cleanup. */
export function ProductCameraFeed({
  entityId,
  label,
  settings,
  settingsKey,
  disabled = false,
  controls = false,
}: {
  entityId: string;
  label: string;
  settings: CardSettings;
  settingsKey: string;
  disabled?: boolean;
  controls?: boolean;
}) {
  const runtime = useWidgetRuntime(),
    visible = usePageVisible();
  const camera = cameraChannelSettings(settings, entityId),
    entity = runtime.entities[entityId];
  const view = productCameraView(entity),
    [snapshot, setSnapshot] = useState(false);
  const [refreshKey, setRefreshKey] = useState(() => Date.now());
  const paused = settings.cameraPaused === true;
  const active =
    visible &&
    !disabled &&
    !runtime.editMode &&
    !paused &&
    runtime.entitiesLoaded &&
    !!runtime.conn &&
    runtime.conn.connected !== false &&
    view.available &&
    view.state !== 'off';
  const refresh = () => setRefreshKey((value) => Math.max(Date.now(), value + 1));
  const snapshotOnly =
    snapshot || !view.has(PRODUCT_CAMERA_FEATURE.stream) || camera.engine === 'snapshot';
  const motion = camera.motionSensorId
    ? isMotionState(runtime.entities[camera.motionSensorId]?.state)
    : false;
  useEffect(() => {
    if (!active || !snapshotOnly || camera.refreshMode !== 'interval') return;
    const timer = setInterval(refresh, camera.refreshInterval * 1000);
    return () => clearInterval(timer);
  }, [active, snapshotOnly, camera.refreshMode, camera.refreshInterval]);
  useEffect(() => {
    if (active && snapshotOnly && camera.refreshMode === 'motion' && motion) refresh();
  }, [active, snapshotOnly, camera.refreshMode, motion]);
  return (
    <div className="product-camera-feed">
      {controls && (
        <div className="product-camera-feed__toolbar">
          {view.has(PRODUCT_CAMERA_FEATURE.stream) && camera.engine !== 'snapshot' && (
            <Segmented
              label={`Vista di ${label}`}
              value={snapshot ? 'snapshot' : 'stream'}
              options={[
                { value: 'stream', label: 'Diretta' },
                { value: 'snapshot', label: 'Istantanea' },
              ]}
              onChange={(value) => {
                setSnapshot(value === 'snapshot');
                refresh();
              }}
            />
          )}
          <Button variant="control" size="sm" disabled={!active} onClick={refresh}>
            Aggiorna immagine
          </Button>
          <Button
            variant="control"
            size="sm"
            disabled={!visible || runtime.editMode}
            onClick={() => runtime.saveCardSetting(settingsKey, 'cameraPaused', !paused)}
          >
            {paused ? 'Riprendi anteprima' : 'Pausa anteprima'}
          </Button>
        </div>
      )}
      <div className="product-camera-feed__viewport">
        {active ? (
          <CameraStream
            key={entityId}
            camera={camera}
            accessToken={
              typeof entity?.attributes.access_token === 'string'
                ? entity.attributes.access_token
                : ''
            }
            conn={asCameraConnection(runtime.conn)}
            getEntityImageUrl={runtime.getEntityImageUrl}
            refreshKey={refreshKey}
            snapshotOnly={snapshotOnly}
            alt={label}
            controls={controls}
            fit="contain"
          />
        ) : (
          <Caption>
            {!view.available
              ? 'Videocamera non disponibile'
              : view.state === 'off'
                ? 'Videocamera spenta'
                : 'Vista in pausa'}
          </Caption>
        )}
      </div>
    </div>
  );
}
