import { Body } from '@/components/primitives';
import type { ConnectionSummary } from '@/utils/launcher/connection';
import './statusBar.css';

/**
 * connecting = first connection; reconnecting = lost, retrying; error = unreachable or
 * expired. The label is the short text next to the LED («Collegato», «Sessione scaduta»).
 */
export type ConnectionState = ConnectionSummary;

const TONES = {
  connected: 'muted',
  connecting: 'muted',
  reconnecting: 'muted',
  error: 'danger',
} as const;

/** Name shown in the bar: «Sincronizzato» when connected (REP-20261007-016), else the label. */
export function connectionText(state: ConnectionState): string {
  return state.phase === 'connected' ? 'Sincronizzato' : state.label;
}

/**
 * Connection to Home Assistant: LED and text together (never colour alone).
 * Accent LED when connected, pulsing grey while (re)connecting, red on error. LED and text
 * are separate items of the bar, with the bar's gap (REP-20261007-016).
 */
export function ConnectionStatus({ state }: { state: ConnectionState }) {
  return (
    <span
      className={`aca-connection aca-connection--${state.phase}`}
      role="status"
      aria-live="polite"
    >
      <span className="aca-connection__led" aria-hidden="true" />
      <Body as="span" size="md" tone={TONES[state.phase]} className="aca-connection__label">
        {connectionText(state)}
      </Body>
    </span>
  );
}
