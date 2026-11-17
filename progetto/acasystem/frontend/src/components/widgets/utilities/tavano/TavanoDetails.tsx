import { useEffect, useId, useRef, useState } from 'react';
import { Body, Button, Caption, Heading, Icon } from '@/components/primitives';
import type { PageKindProps, WidgetDetailsProps } from '@/@types/launcher';
import { downloadActivityExport, previewActivityExport, type ActivityEvent, type ActivityExport, type ActivityQuery } from '@/api/activityApi';
import { useOptionalWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { CLIENT_SESSION_EVENT, getClientSession } from '@/api/clientSession';
import { AccountAvatar } from '@/components/account/AccountAvatar';
import { OptionPicker } from '../shared/details';
import { useActivityPage } from './useActivityPage';
import { activityColor, activityDescription, activityOutcome, buildActivityPrompt } from './activityText';
import '../utilities.css';
import './tavano.css';

function ActivityRow({ event }: { event: ActivityEvent }) {
  const runtime = useOptionalWidgetRuntime();
  const observed = event.targetId ? runtime?.entities[event.targetId] : undefined;
  const targetName = observed?.attributes.friendly_name;
  return <li className="tavano-row" data-outcome={event.outcome}>
    <AccountAvatar userId={event.actor?.userId ?? null} name={event.actor?.userName || 'Sistema'} color={activityColor(event)} />
    <div className="tavano-row__main">
      <div className="tavano-row__heading">
        <Body size="sm" className="tavano-row__action">{activityDescription(event)}</Body>
        <time dateTime={event.at} title={new Date(event.at).toLocaleString('it-IT')} className="tavano-row__time">
          <Caption>{new Date(event.at).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</Caption>
        </time>
      </div>
      <Caption>{event.actor?.userName || 'Sistema'} · {event.actor?.clientName || 'Dispositivo non attribuito'}</Caption>
      {typeof targetName === 'string' && <Caption>{targetName}</Caption>}
      <Caption className="tavano-row__meta">{activityOutcome(event)}</Caption>
    </div>
    <details className="tavano-row__details">
      <summary><Icon name="chevronDown" size="sm" />Dettagli</summary>
      <div className="tavano-row__detail-content">
        <Caption>Azione: {event.action}{event.code ? ` · ${event.code}` : ''}</Caption>
        <Caption>Ricevuto: {new Date(event.at).toLocaleString('it-IT')}</Caption>
        {event.actor?.userId && <Caption>ID persona: {event.actor.userId}</Caption>}
        {event.actor?.clientId && <Caption>ID dispositivo: {event.actor.clientId}</Caption>}
        {event.targetId && <Caption>Risorsa: {event.targetId}</Caption>}
        {event.profileId && <Caption>Profilo: {event.profileId}</Caption>}
        {event.widgetId && <Caption>Widget: {event.widgetId}</Caption>}
        {event.revision !== undefined && <Caption>Revisione {event.revision}</Caption>}
        {event.originAt && <Caption>Ora dichiarata dal client: {new Date(event.originAt).toLocaleString('it-IT')}</Caption>}
        {event.kind === 'command' && <Caption>Un comando accettato non conferma l’effetto fisico.</Caption>}
        {event.kind === 'command' && observed && <Caption>Stato osservato separatamente: {String(observed.state)} · {new Date(observed.last_updated).toLocaleString('it-IT')}</Caption>}
      </div>
    </details>
  </li>;
}

// Both the Console and the fallback Sheet already provide their own title.
export interface TavanoToolProps { onPinUtility?: () => void }
export function TavanoTool({ onPinUtility }: TavanoToolProps) { return <TavanoPanel onPinUtility={onPinUtility} />; }
export function TavanoDetails({ onPinUtility }: WidgetDetailsProps & TavanoToolProps) { return <TavanoTool onPinUtility={onPinUtility} />; }
export function TavanoPage({ pageId, editMode }: PageKindProps) { return <TavanoPanel pageId={pageId} paused={editMode} />; }
type FacetKey = 'userId' | 'clientId' | 'profileId' | 'widgetId';
const facetArea = { userId: 'users', clientId: 'clients', profileId: 'profiles', widgetId: 'widgets' } as const;
const facetLabel = { userId: 'Persona', clientId: 'Dispositivo', profileId: 'Profilo', widgetId: 'Widget' } as const;
const categoryOptions = [
  { value: '', label: 'Tutte' }, { value: 'configuration', label: 'Configurazioni' },
  { value: 'command', label: 'Comandi' }, { value: 'diagnostic', label: 'Diagnostica' },
];
const dayOptions = [{ value: '', label: 'Tutti' }, ...Array.from({ length: 7 }, (_, day) => ({ value: String(day), label: `${day} ${day === 1 ? 'giorno' : 'giorni'}` }))];

function TavanoPanel({ pageId, paused = false, onPinUtility }: { pageId?: string; paused?: boolean } & TavanoToolProps) {
  const runtime = useOptionalWidgetRuntime();
  const session = getClientSession();
  const versions = { aca: __APP_VERSION__, ha: typeof runtime?.haConfig?.version === 'string' ? runtime.haConfig.version : null,
    client: session?.client.platform ?? null };
  const [query, setQuery] = useState<ActivityQuery>({});
  const activity = useActivityPage(query, paused);
  const [showFilters, setShowFilters] = useState(false);
  const [preview, setPreview] = useState<ActivityExport | null>(null);
  const [copyText, setCopyText] = useState('');
  const [copyCount, setCopyCount] = useState(0);
  const [message, setMessage] = useState('');
  const [exporting, setExporting] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const results = useRef<HTMLElement>(null);
  const previousPage = useRef(1);
  const id = useId();
  const scope = `${session?.houseId ?? ''}:${session?.user.id ?? ''}:${session?.client.id ?? ''}`;
  const sessionEpoch = useRef(0);
  const exportRequest = useRef(0);
  const viewKey = `${scope}|${sessionEpoch.current}|${JSON.stringify(query)}|${activity.pageNumber}|${activity.page?.asOf ?? ''}`;
  const currentView = useRef(viewKey);
  currentView.current = viewKey;
  useEffect(() => {
    if (previousPage.current !== activity.pageNumber) results.current?.scrollIntoView?.({ block: 'start' });
    previousPage.current = activity.pageNumber;
  }, [activity.pageNumber]);
  const labels = useRef({ scope, userId: new Map<string, string>(), clientId: new Map<string, string>(), profileId: new Map<string, string>(), widgetId: new Map<string, string>() });
  if (labels.current.scope !== scope) labels.current = { scope, userId: new Map(), clientId: new Map(), profileId: new Map(), widgetId: new Map() };
  useEffect(() => {
    const reset = () => {
      sessionEpoch.current += 1; exportRequest.current += 1; currentView.current = '';
      labels.current = { scope: '', userId: new Map(), clientId: new Map(), profileId: new Map(), widgetId: new Map() };
      setPreview(null); setCopyText(''); setMessage(''); setExporting(false); setQuery({});
    };
    window.addEventListener(CLIENT_SESSION_EVENT, reset);
    return () => window.removeEventListener(CLIENT_SESSION_EVENT, reset);
  }, []);
  const change = (next: Partial<ActivityQuery>) => {
    exportRequest.current += 1; setExporting(false);
    setQuery((current) => ({ ...current, ...next })); setPreview(null); setCopyText(''); setMessage('');
  };
  const values = (key: FacetKey) => {
    const options = new Map<string, string>();
    for (const facet of activity.page?.facets?.[facetArea[key]] ?? []) options.set(facet.id, facet.label);
    for (const event of activity.events) {
      const value = key === 'userId' ? event.actor?.userId : key === 'clientId' ? event.actor?.clientId : event[key];
      if (value && !options.has(value)) options.set(value, key === 'userId' ? event.actor?.userName || value : key === 'clientId' ? event.actor?.clientName || value : value);
    }
    for (const [value, label] of options) {
      const widgetName = key === 'widgetId' ? runtime?.customNames[value] : null;
      const display = widgetName || (label !== value ? label : labels.current[key].get(value))
        || `${facetLabel[key]} ${labels.current[key].size + 1}`;
      options.set(value, display);
      labels.current[key].set(value, display);
    }
    const selected = query[key];
    if (selected && !options.has(selected)) options.set(selected, labels.current[key].get(selected) || `${facetLabel[key]} selezionato`);
    const duplicates = new Map<string, string[]>();
    for (const [value, label] of options) duplicates.set(label, [...(duplicates.get(label) ?? []), value]);
    return [{ value: '', label: 'Tutti' }, ...[...options].map(([value, label]) => {
      const ids = duplicates.get(label)!;
      if (ids.length < 2) return { value, label };
      return { value, label: `${label} (${ids.indexOf(value) + 1})` };
    })];
  };
  const secondaryCount = (['userId', 'clientId', 'profileId', 'widgetId', 'outcome'] as const).filter((key) => query[key] !== undefined).length;
  const hasFilters = secondaryCount > 0 || query.ageDays !== undefined || query.kind !== undefined;
  const copy = async () => {
    const key = viewKey;
    const count = activity.events.length;
    const text = buildActivityPrompt(activity.events, versions);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(text);
      if (key === currentView.current) { setCopyText(''); setMessage(`${count} voci della pagina copiate con il prompt diagnostico. Nomi sostituiti per la condivisione.`); }
    } catch {
      if (key === currentView.current) { setCopyText(text); setCopyCount(count); setMessage('Seleziona e copia il testo della pagina. Nomi sostituiti per la condivisione.'); }
    }
  };
  const prepareExport = async () => {
    const key = viewKey;
    const request = ++exportRequest.current;
    setExporting(true); setMessage('');
    try {
      const result = await previewActivityExport(activity.exportQuery);
      if (key === currentView.current && request === exportRequest.current) setPreview({ ...result, versions: { ...versions, aca: result.versions?.aca ?? versions.aca } });
    } catch { if (key === currentView.current) setMessage('Esportazione non disponibile. Riprova quando la centrale è collegata.'); }
    finally { if (request === exportRequest.current) setExporting(false); }
  };
  const navigate = (direction: 'previous' | 'next') => {
    exportRequest.current += 1; setExporting(false);
    setPreview(null); setCopyText(''); setMessage(''); void activity[direction]();
  };
  return <div className="utility-page tavano-page" data-page={pageId} aria-label="Registro Tavano">
    <header className="tavano-head">
      {pageId ? <Heading level={2} size="md" className="tavano-heading"><Icon name="bug" size="md" />Tavano</Heading>
        : <Body className="tavano-heading"><Icon name="bug" size="md" />Attività della casa</Body>}
      <Button variant="primary" size="sm" disabled={!activity.events.length} onClick={() => void copy()}>Copia pagina ({activity.events.length})</Button>
    </header>
    <div className="tavano-controls">
      <div className="tavano-toolbar">
        <OptionPicker label="Giorni" value={query.ageDays === undefined ? '' : String(query.ageDays)} options={dayOptions} contentClassName="tavano-menu" isolateEscape
          onSelect={(day) => change({ ageDays: day === '' ? undefined : Number(day) as ActivityQuery['ageDays'] })} />
        <OptionPicker label="Categoria" value={query.kind ?? ''} options={categoryOptions} contentClassName="tavano-menu" isolateEscape
          onSelect={(kind) => change({ kind: kind ? kind as ActivityQuery['kind'] : undefined })} />
        <Button variant="control" aria-expanded={showFilters} aria-controls={`${id}-filters`} onClick={() => setShowFilters((value) => !value)}>Filtri{secondaryCount ? ` (${secondaryCount})` : ''}</Button>
        <Button variant="control" loading={activity.loading} aria-label="Aggiorna registro" title="Aggiorna registro" onClick={() => void activity.refresh()}><Icon name="refresh" size="md" /></Button>
      </div>
      <div id={`${id}-filters`} className="tavano-filters" hidden={!showFilters}>
        <OptionPicker label="Persona" value={query.userId ?? ''} options={values('userId')} contentClassName="tavano-menu" isolateEscape onSelect={(userId) => change({ userId: userId || undefined })} />
        <OptionPicker label="Dispositivo" value={query.clientId ?? ''} options={values('clientId')} contentClassName="tavano-menu" isolateEscape onSelect={(clientId) => change({ clientId: clientId || undefined })} />
        <OptionPicker label="Profilo" value={query.profileId ?? ''} options={values('profileId')} contentClassName="tavano-menu" isolateEscape onSelect={(profileId) => change({ profileId: profileId || undefined })} />
        <OptionPicker label="Widget" value={query.widgetId ?? ''} options={values('widgetId')} contentClassName="tavano-menu" isolateEscape onSelect={(widgetId) => change({ widgetId: widgetId || undefined })} />
        <OptionPicker label="Esito" value={query.outcome ?? ''} options={[
          { value: '', label: 'Tutti' }, { value: 'pending', label: 'In attesa' }, { value: 'accepted', label: 'Accettato / confermato' },
          { value: 'error', label: 'Non riuscito' }, { value: 'unknown', label: 'Esito non disponibile' },
        ]} contentClassName="tavano-menu" isolateEscape onSelect={(outcome) => change({ outcome: outcome ? outcome as ActivityQuery['outcome'] : undefined })} />
        {hasFilters && <Button variant="control" onClick={() => { setQuery({}); setPreview(null); setCopyText(''); setMessage(''); }}>Azzera filtri</Button>}
        {activity.page?.facets?.truncated && <Caption className="tavano-filters__note">Elenco filtri parziale. Le voci della pagina e la selezione corrente restano incluse.</Caption>}
      </div>
      {query.ageDays !== undefined && <Caption>Età in intervalli di 24 ore dalla centrale. 0 giorni: ultime 24 ore.</Caption>}
    </div>
    <section ref={results} className="tavano-results" aria-label="Attività della casa" aria-busy={activity.loading}>
      {activity.error && <Body role="status">{activity.unsupportedAge ? 'Aggiorna ACA sulla centrale per filtrare i giorni.' : activity.invalidAnchor ? 'L’elenco va aggiornato. Premi Aggiorna per rileggere le attività.' : 'Registro non disponibile. Riprova con Aggiorna; le voci già caricate restano consultabili.'}</Body>}
      {!activity.events.length && !activity.error && <Body role="status">{activity.loading ? 'Caricamento delle attività…' : 'Nessuna attività con questi filtri.'}</Body>}
      <ul className="tavano-list">{activity.events.map((event) => <ActivityRow key={event.id} event={event} />)}</ul>
    </section>
    <footer className="tavano-footer">
      <nav className="tavano-pagination" aria-label="Pagine del registro">
        <Button variant="control" disabled={!activity.hasPrevious || activity.loading} onClick={() => navigate('previous')}>Precedente</Button>
        <Caption role="status" aria-live="polite">Pagina {activity.pageNumber}</Caption>
        <Button variant="control" disabled={!activity.hasNext || activity.loading} onClick={() => navigate('next')}>Successiva</Button>
      </nav>
      <Caption className="tavano-availability">{activity.events.length} voci · ultimi 7 giorni, entro la quota disponibile{activity.page?.availableFrom ? ` · Dal ${new Date(activity.page.availableFrom).toLocaleString('it-IT')}` : ''}</Caption>
      <div className="tavano-secondary-actions">
        <Button variant="control" size="sm" loading={exporting} disabled={!activity.page} onClick={() => void prepareExport()}>Anteprima JSON dei filtri</Button>
        {onPinUtility && <Button variant="control" size="sm" onClick={onPinUtility}><Icon name="home" size="sm" />Aggiungi alla Home</Button>}
      </div>
    </footer>
    {preview && <section className="tavano-export" aria-label="Anteprima esportazione">
      <Body size="sm">{preview.events.length} eventi dei filtri, con nomi sostituiti. {preview.truncated ? 'Limite di 5.000 voci raggiunto: restringi i filtri per una copia completa.' : 'L’esportazione comprende anche le altre pagine dei filtri.'}</Body>
      <pre className="tavano-preview">{JSON.stringify(preview, null, 2).slice(0, 12000)}</pre>
      <Button variant="primary" size="sm" onClick={() => downloadActivityExport(preview)}>Scarica JSON depurato</Button>
    </section>}
    {message && <Body size="sm" role="status">{message}</Body>}
    {copyText && <section className="tavano-export" aria-label="Testo da copiare">
      <label htmlFor={`${id}-copy`}>Prompt e {copyCount} voci della pagina</label>
      <textarea id={`${id}-copy`} ref={textarea} value={copyText} readOnly rows={10} onFocus={(event) => event.currentTarget.select()} />
      <Button variant="control" onClick={() => { textarea.current?.focus(); textarea.current?.select(); }}>Seleziona tutto il testo</Button>
    </section>}
  </div>;
}
