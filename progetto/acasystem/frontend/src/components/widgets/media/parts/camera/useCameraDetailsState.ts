import { useState } from 'react';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { readCameraSettings } from '../../model/camera';
import { attrString } from '../../model/entity';

export type CameraView = 'stream' | 'snapshot';

/**
 * Everything the sections of the camera details share (sheet and console alike): the camera, the
 * view (live or snapshot) and the refresh key that restarts the feed. The feed is mounted once,
 * by whichever layout is open.
 */
export function useCameraDetailsState({ id, settings }: WidgetDetailsProps) {
  const runtime = useWidgetRuntime();
  const camera = readCameraSettings(settings);
  const entity = camera.cameraId ? runtime.entities[camera.cameraId] : undefined;
  const [view, setView] = useState<CameraView>('stream');
  const [refreshKey, setRefreshKey] = useState(() => Date.now());
  const motionState = camera.motionSensorId
    ? runtime.entities[camera.motionSensorId]?.state
    : undefined;
  const name = entity
    ? runtime.customNames[id] || attrString(entity, 'friendly_name') || camera.cameraId
    : '';
  return {
    runtime,
    camera,
    entity,
    name,
    motionState,
    view,
    refreshKey,
    refresh: () => setRefreshKey(Date.now()),
    changeView: (next: CameraView) => {
      setView(next);
      setRefreshKey(Date.now());
    },
  };
}

export type CameraDetailsState = ReturnType<typeof useCameraDetailsState>;
