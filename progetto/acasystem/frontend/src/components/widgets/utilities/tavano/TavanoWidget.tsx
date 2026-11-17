import { Body, Caption, Icon } from '@/components/primitives';
import type { WidgetProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { AccountAvatar } from '@/components/account/AccountAvatar';
import { UtilityCard } from '../shared/UtilityCard';
import { useActivity } from './useActivity';
import { activityColor, activityDescription, activityOutcome } from './activityText';
import './tavano.css';

export function TavanoWidget({ id, editMode, size }: WidgetProps) {
  const runtime = useWidgetRuntime();
  const activity = useActivity({}, editMode);
  const recent = activity.events.slice(0, size.h <= 1 ? 1 : 3);
  return <UtilityCard className="tavano-widget" editMode={editMode} row={size.h <= 1} openLabel="Tavano, apri tutte le attività" onOpen={() => runtime.openDetails(id)}>
    <div className="tavano-summary-list utility-grow">
      <Body className="tavano-summary-heading"><Icon name="bug" size="sm" />Tavano</Body>
      {recent.length ? recent.map((event) => <div key={event.id} className="tavano-summary" data-outcome={event.outcome}>
        <AccountAvatar userId={event.actor?.userId ?? null} name={event.actor?.userName || 'Sistema'} color={activityColor(event)} size="sm" />
        <div className="tavano-summary__text">
          <Caption className="tavano-summary__action utility-truncate">{activityDescription(event)}</Caption>
          <Caption className="tavano-summary__meta utility-truncate">{event.actor?.userName || 'Sistema'} · {event.actor?.clientName || 'Dispositivo non attribuito'}</Caption>
          <Caption className="tavano-summary__meta utility-truncate"><time dateTime={event.at}>{new Date(event.at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</time> · {activityOutcome(event)}</Caption>
        </div>
      </div>) : <Caption>{activity.error ? 'Registro non disponibile' : activity.loading ? 'Caricamento delle attività…' : 'Nessuna attività recente'}</Caption>}
    </div>
  </UtilityCard>;
}
