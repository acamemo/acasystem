import { IconText } from '@/components/primitives';
import { isMotionState, type CameraSettings } from '../../model/camera';
import type { Entity } from '../../model/entity';
import { testi } from '../../testi';

export const isOffline = (entity: Entity | undefined) =>
  !entity || entity.state === 'unavailable' || entity.state === 'unknown' || entity.state === 'off';

export const formatTime = (at: number) =>
  new Date(at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

export function MotionCue({
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
