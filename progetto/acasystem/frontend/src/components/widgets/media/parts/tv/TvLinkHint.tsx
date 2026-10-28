import { Body, Button } from '@/components/primitives';
import type { CastPowerGuard } from '../../hooks/useCastPowerGuard';
import { testi } from '../../testi';

/**
 * Said when the power key of a Cast-only TV is pressed: the TV has to be connected with the
 * integration of its brand before it can be turned on and have a remote.
 */
export function TvLinkHint({ guard }: { guard: CastPowerGuard }) {
  if (!guard.shown || !guard.brand) return null;
  return (
    <div className="aca-media-widget__message" role="status">
      <Body size="sm" tone="ink">
        {testi.collegaTv(guard.brand.label)}
      </Body>
      <div className="aca-media-hint-actions">
        {guard.connect && (
          <Button variant="primary" size="sm" onClick={guard.connect}>
            {testi.collegaTvAzione}
          </Button>
        )}
        <Button variant="control" size="sm" onClick={guard.close}>
          {testi.chiudi}
        </Button>
      </div>
    </div>
  );
}
