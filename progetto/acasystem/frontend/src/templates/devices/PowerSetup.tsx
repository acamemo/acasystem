import { PowerStep } from './PowerStep';
import type { PowerSetupProps } from '@/hooks/launcher/PowerSetupContext';
import './devices.css';

/**
 * The power-on step of a TV that is already added, opened in place from its details. It is the
 * same step the add-device flow shows after a new TV, without the address typed there.
 */
export function PowerSetup({ entryId, mediaPlayerEntityId, onFinished }: PowerSetupProps) {
  return (
    <PowerStep
      entryId={entryId}
      mediaPlayerEntityId={mediaPlayerEntityId}
      typedHost={null}
      onFinished={onFinished}
    />
  );
}
