import { useState } from 'react';
import { Caption } from '@/components/primitives';
import type { CardSettings } from '@/@types/dashboard';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { CameraStream, asCameraConnection } from '../media/parts/CameraFeed';
import { readCameraSettings } from '../media/model/camera';

export function CameraPreview({
  entityId,
  settings,
  disabled,
}: {
  entityId: string;
  settings: CardSettings;
  disabled: boolean;
}) {
  const runtime = useWidgetRuntime();
  const visible = usePageVisible();
  const [refreshKey] = useState(() => Date.now());
  if (!visible || disabled || settings.cameraPaused === true)
    return <Caption>Vista in pausa</Caption>;
  const entity = runtime.entities[entityId];
  return (
    <div className="aca-adaptive-camera">
      <CameraStream
        camera={readCameraSettings({ ...settings, cameraId: entityId })}
        accessToken={
          typeof entity?.attributes.access_token === 'string' ? entity.attributes.access_token : ''
        }
        conn={asCameraConnection(runtime.conn)}
        getEntityImageUrl={runtime.getEntityImageUrl}
        refreshKey={refreshKey}
        snapshotOnly={false}
        alt={String(entity?.attributes.friendly_name ?? 'Videocamera')}
        controls={false}
      />
    </div>
  );
}
