import { Badge } from '@/components/primitives';
import { IconAction } from '@/components/system/edit/IconAction';

export interface SystemGearProps {
  onOpenSystem: () => void;
  /** Updates waiting in Home Assistant: a blue (information) dot and a longer name. */
  updateCount?: number;
  /** Home Assistant is unreachable or the sign-in has expired: a red dot and a longer name. */
  connectionProblem?: boolean;
  /** A widget is being dragged: the gear takes no touch (ADR-0016). */
  inert?: boolean;
}

/** Sistema takes its press at once: it has no action that can be blocked. */
const noop = () => undefined;

/** The accessible name of the gear: Sistema, and why it carries a dot. */
export function systemGearLabel(updateCount: number, connectionProblem: boolean): string {
  const reasons = [
    connectionProblem && 'problema di connessione',
    updateCount > 0 &&
      (updateCount === 1
        ? '1 aggiornamento disponibile'
        : `${updateCount} aggiornamenti disponibili`),
  ].filter(Boolean);
  return reasons.length > 0 ? `Sistema, ${reasons.join(', ')}` : 'Sistema';
}

/**
 * Sistema, the gear at the top right (ADR-0016, C1): always on screen, in every state of the
 * launcher (normal view, edit mode, the page overview), small and quiet. It replaces the one of the
 * status bar. A dot says that something waits in Sistema: red for a connection problem (the notice
 * at the top says which), blue for updates. The gear is not a page control: it never moves, and
 * the pages do not make room for it beyond a few pixels on a tablet (appShell.css).
 */
export function SystemGear({
  onOpenSystem,
  updateCount = 0,
  connectionProblem = false,
  inert = false,
}: SystemGearProps) {
  return (
    <span
      className={['aca-system-gear', connectionProblem && 'aca-system-gear--problem']
        .filter(Boolean)
        .join(' ')}
      inert={inert || undefined}
    >
      <IconAction
        icon="settings"
        iconSize="md"
        label={systemGearLabel(updateCount, connectionProblem)}
        tip="Sistema"
        onBlocked={noop}
        onClick={onOpenSystem}
      />
      {(connectionProblem || updateCount > 0) && <Badge />}
    </span>
  );
}
