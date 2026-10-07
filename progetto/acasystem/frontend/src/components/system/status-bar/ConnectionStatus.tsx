import { Caption, Icon, type IconName } from '@/components/primitives';
import type { ConnectionPhase, ConnectionSummary } from '@/utils/launcher/connection';
import './statusBar.css';

/**
 * connecting = first connection; reconnecting = lost, retrying; error = unreachable or
 * expired. The label is the short text next to the LED («Collegato», «Sessione scaduta»).
 */
export type ConnectionState = ConnectionSummary;

const ICONS: Record<ConnectionPhase, IconName> = {
  connected: 'server',
  connecting: 'refresh',
  reconnecting: 'refresh',
  error: 'warning',
};

const TONES = {
  connected: 'muted',
  connecting: 'muted',
  reconnecting: 'muted',
  error: 'danger',
} as const;

/**
 * Connection to Home Assistant: LED, icon and text together (never colour alone).
 * Blue LED when connected, pulsing grey while (re)connecting, red with a warning on error.
 */
export function ConnectionStatus({ state }: { state: ConnectionState }) {
  return (
    <span
      className={`aca-connection aca-connection--${state.phase}`}
      role="status"
      aria-live="polite"
    >
      <span className="aca-connection__led" aria-hidden="true" />
      <Icon name={ICONS[state.phase]} size="sm" className="aca-connection__icon" />
      <Caption tone={TONES[state.phase]} className="aca-connection__label">
        {state.label}
      </Caption>
    </span>
  );
}
