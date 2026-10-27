import { Body, Button, Caption, IconText, Numeric, Segmented } from '@/components/primitives';
import { MediaIcon } from '../../icons';
import { attrString } from '../../model/entity';
import { testi } from '../../testi';
import { CameraStream, asCameraConnection } from '../CameraFeed';
import { MotionCue, formatTime, isOffline } from './cameraShared';
import type { CameraDetailsState, CameraView } from './useCameraDetailsState';

const VIEWS: ReadonlyArray<{ value: CameraView; label: string }> = [
  { value: 'stream', label: testi.diretta },
  { value: 'snapshot', label: testi.istantanea },
];

/** What the details show when the camera is not there (not configured, or gone from Home Assistant). */
export function CameraMissing({ cam }: { cam: CameraDetailsState }) {
  return (
    <div className="aca-media-details">
      <Body tone="muted" role="status">
        {cam.camera.cameraId ? testi.dispositivoNonTrovato : testi.dispositivoNonConfigurato}
      </Body>
    </div>
  );
}

/** The camera id, its warnings and the time of the last refresh. */
export function CameraInfoRow({ cam }: { cam: CameraDetailsState }) {
  const { camera, entity, motionState, refreshKey } = cam;
  return (
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
  );
}

/** Live/snapshot switch and the refresh button. */
export function CameraControlsRow({ cam }: { cam: CameraDetailsState }) {
  return (
    <div className="aca-media-row aca-media-row--between">
      <Segmented<CameraView>
        options={VIEWS}
        value={cam.view}
        label={testi.vista}
        size="sm"
        onChange={cam.changeView}
      />
      <Button
        variant="control"
        shape="circle"
        size="md"
        aria-label={testi.aggiorna}
        onClick={cam.refresh}
      >
        <MediaIcon name="refresh" size="md" />
      </Button>
    </div>
  );
}

/** The live stream (or the snapshot) with its fallback chain. */
export function CameraFeedView({ cam }: { cam: CameraDetailsState }) {
  const { runtime, camera, entity, view } = cam;
  return (
    <CameraStream
      camera={camera}
      accessToken={attrString(entity, 'access_token')}
      conn={asCameraConnection(runtime.conn)}
      getEntityImageUrl={runtime.getEntityImageUrl}
      refreshKey={cam.refreshKey}
      snapshotOnly={view === 'snapshot'}
      alt={cam.name}
      fit="contain"
      controls={view === 'stream'}
    />
  );
}
