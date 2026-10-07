import { Body, Caption, Heading, Icon } from '@/components/primitives';
import './launcherStates.css';

export interface WidgetUnavailableProps {
  /** Name of the card (custom name, entity name or id). */
  name?: string;
  /** missing: no definition for this card; error: the widget failed while rendering. */
  reason: 'missing' | 'error';
  /** 1×1 and other small sizes: icon and title only. */
  compact?: boolean;
}

/** Calm placeholder inside the widget frame when a widget cannot be shown. */
export function WidgetUnavailable({ name, reason, compact = false }: WidgetUnavailableProps) {
  return (
    <div
      className={['aca-widget-fallback', compact && 'aca-widget-fallback--compact']
        .filter(Boolean)
        .join(' ')}
    >
      <Icon
        name={reason === 'error' ? 'warning' : 'info'}
        size="lg"
        className="aca-widget-fallback__icon"
      />
      <Body as="span" size="sm" tone="ink" className="aca-widget-fallback__title">
        Widget non disponibile
      </Body>
      {!compact && (
        <Caption className="aca-widget-fallback__text">
          {reason === 'error'
            ? 'Si è verificato un problema nel mostrarlo. Gli altri widget funzionano.'
            : 'Questo tipo di scheda non è ancora disponibile nella nuova interfaccia.'}
        </Caption>
      )}
      {!compact && name && <Caption className="aca-widget-fallback__name">{name}</Caption>}
    </div>
  );
}

/** Special page (luci, batterie, stanze, multimedia) whose view is not available yet. */
export function PageUnavailable({ label }: { label: string }) {
  return (
    <div className="aca-empty-page">
      <Icon name="info" size="lg" className="aca-empty-page__icon" />
      <Heading level={2} size="md" tone="ink">
        Pagina non disponibile
      </Heading>
      <Body size="sm" tone="muted" className="aca-empty-page__text">
        {`La pagina «${label}» non è ancora disponibile nella nuova interfaccia. Le sue impostazioni restano salvate.`}
      </Body>
    </div>
  );
}
