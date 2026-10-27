import { ConsoleColumns } from '@/components/primitives';
import type { WidgetDetailsProps } from '@/@types/launcher';
import {
  CameraControlsRow,
  CameraFeedView,
  CameraInfoRow,
  CameraMissing,
} from '../parts/camera/CameraSections';
import { useCameraDetailsState } from '../parts/camera/useCameraDetailsState';

/**
 * Content of the camera console (Console primitive): the video on the left, as large as the
 * column allows, and its info, the live/snapshot switch and the refresh on the right. The feed is
 * mounted once. On a narrow screen the columns stack in that order.
 */
export function CameraConsole(props: WidgetDetailsProps) {
  const cam = useCameraDetailsState(props);
  if (!cam.camera.cameraId || !cam.entity) return <CameraMissing cam={cam} />;
  return (
    <ConsoleColumns
      main={
        <section className="aca-media-section" aria-label={cam.name}>
          <CameraFeedView cam={cam} />
        </section>
      }
      side={
        <section className="aca-media-section">
          <CameraInfoRow cam={cam} />
          <CameraControlsRow cam={cam} />
        </section>
      }
    />
  );
}
