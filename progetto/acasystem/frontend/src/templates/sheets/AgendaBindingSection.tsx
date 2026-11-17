import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CardSettings } from '@/@types/dashboard';
import { Body, Button, Caption } from '@/components/primitives';
import { selectedCalendars } from '@/components/widgets/home/calendar/calendarModel';
import { useAgendaScope } from '@/components/widgets/home/calendar/agendaRead';
import { useOptionalLiveProfiles } from '@/hooks/liveProfiles/LiveProfilesContext';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { EntityPicker, EntitySelect } from './parts/EntityPicker';
import { SheetSection } from './parts/Form';

export type SaveAgendaBinding = (
  patch: Partial<Pick<CardSettings, 'calendars' | 'todoEntityId'>>
) => Promise<void>;
const calendarKey = (value: unknown) => JSON.stringify(selectedCalendars(value).sort());
const todoValue = (value: unknown) => typeof value === 'string' && value ? value : null;
const CHANGED_CONTEXT = 'Il contesto è cambiato. Verifica l’associazione corrente e riprova.';
const NOT_CONFIRMED = 'Associazione non confermata. La scelta è conservata. Riprova.';

interface BindingForm {
  context: object;
  source: string;
  calendars: string[];
  todoId: string | null;
  error: string;
  attemptedSource?: string;
}
interface BindingOperation {
  context: object;
  token: object;
  expectedSource: string;
  adopted: boolean;
  invalid: boolean;
  owner: string;
}

/** Existing identities; resourceKey identifies the destination, not a render's callback identity. */
export function AgendaBindingSection({
  kind, settings, saveBinding, resourceKey = kind,
}: { kind: 'calendar' | 'todo'; settings: CardSettings; saveBinding: SaveAgendaBinding; resourceKey?: string }) {
  const runtime = useWidgetRuntime();
  const live = useOptionalLiveProfiles();
  const coordinator = live?.coordinator;
  const source = kind === 'calendar' ? calendarKey(settings.calendars) : JSON.stringify(todoValue(settings.todoEntityId));
  const scope = useAgendaScope(runtime.conn, JSON.stringify([kind, resourceKey, source]), runtime.entitiesLoaded);
  const ownerSnapshot = coordinator?.snapshot();
  const ownerKey = JSON.stringify([ownerSnapshot?.profile?.id, ownerSnapshot?.editor?.id]);
  const [ownerEpoch, setOwnerEpoch] = useState(0);
  const context = useMemo(() => ({ kind, resourceKey, conn: runtime.conn,
    owner: scope.owner, coordinator, ownerKey, ownerEpoch }),
    [kind, resourceKey, runtime.conn, scope.owner, coordinator, ownerKey, ownerEpoch]);
  const savedCalendarsKey = JSON.stringify(selectedCalendars(settings.calendars));
  const savedTodoId = todoValue(settings.todoEntityId);
  const initialForm = useCallback((): BindingForm => ({
    context, source, calendars: JSON.parse(savedCalendarsKey) as string[],
    todoId: savedTodoId, error: '',
  }), [context, source, savedCalendarsKey, savedTodoId]);
  const [form, setForm] = useState<BindingForm>(initialForm);
  const [busy, setBusy] = useState(false);
  const [contextWarning, setContextWarning] = useState(false);
  const mounted = useRef(true);
  const pending = useRef<BindingOperation | null>(null);
  const latest = useRef({ scope, context, source, saveBinding, live, initialForm });
  const operation = pending.current;
  if (operation && !operation.invalid && operation.token !== scope.token) {
    // A write may update the local draft before its ACK. Adopt only its exact target once;
    // unrelated changes, visibility/reconnect epochs and A -> B -> A invalidate it.
    const ownTarget = operation.context === context && !operation.adopted &&
      latest.current.scope.token === operation.token && latest.current.source !== source &&
      operation.expectedSource === source && scope.active;
    if (ownTarget) { operation.token = scope.token; operation.adopted = true; }
    else operation.invalid = true;
  }
  if (operation && operation.context !== context) operation.invalid = true;
  latest.current = { scope, context, source, saveBinding, live, initialForm };
  const ownTransition = !!operation && !operation.invalid && operation.context === context;
  const view = form.context === context && (form.source === source || ownTransition || form.attemptedSource === source) ? form : initialForm();

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!coordinator) return;
    let seen = ownerKey;
    const unsubscribe = coordinator.subscribe(() => {
      const snapshot = coordinator.snapshot();
      const next = JSON.stringify([snapshot.profile?.id, snapshot.editor?.id]);
      if (next === seen) return;
      seen = next;
      if (pending.current) pending.current.invalid = true;
      setOwnerEpoch((value) => value + 1);
    });
    return () => { unsubscribe(); };
  }, [coordinator, ownerKey]);
  useEffect(() => {
    setForm((previous) => {
      if (previous.context === context && previous.source === source) return previous;
      const active = pending.current;
      if (previous.context === context && (active?.context === context && !active.invalid || previous.attemptedSource === source))
        return { ...previous, source };
      return { ...initialForm(), error: active ? CHANGED_CONTEXT : '' };
    });
  }, [context, source, initialForm]);
  useEffect(() => {
    if (pending.current?.invalid)
      setForm((previous) => ({ ...(previous.context === context && previous.source === source ? previous : initialForm()), error: CHANGED_CONTEXT }));
  }, [scope.token, context, source, initialForm]);

  const candidates = Object.keys(runtime.entities).filter((id) => id.startsWith(kind === 'calendar' ? 'calendar.' : 'todo.'));
  const ids = [...new Set([...candidates, ...(kind === 'calendar' ? view.calendars : view.todoId ? [view.todoId] : [])])];
  const currentOwner = () => {
    const snapshot = latest.current.live?.coordinator.snapshot();
    return JSON.stringify([snapshot?.profile?.id, snapshot?.editor?.id]);
  };
  const choose = async (patch: Parameters<SaveAgendaBinding>[0]) => {
    if (pending.current || latest.current.context !== context || !scope.current()) return;
    const next: BindingOperation = {
      context, token: scope.token, expectedSource: kind === 'calendar'
        ? calendarKey(patch.calendars) : JSON.stringify(todoValue(patch.todoEntityId)),
      adopted: false, invalid: false, owner: currentOwner(),
    };
    const valid = () => mounted.current && pending.current === next && !next.invalid &&
      latest.current.context === context && latest.current.scope.token === next.token &&
      latest.current.scope.current() && currentOwner() === next.owner;
    pending.current = next;
    setBusy(true);
    setContextWarning(false);
    setForm((previous) => ({ ...(previous.context === context && previous.source === source ? previous : initialForm()),
      ...(kind === 'calendar' ? { calendars: selectedCalendars(patch.calendars) } : { todoId: todoValue(patch.todoEntityId) }),
      attemptedSource: next.expectedSource, error: '' }));
    try {
      // Use the current callback once, at the human gesture. Never call a replacement after await.
      await latest.current.saveBinding(patch);
      if (!valid()) throw new Error(CHANGED_CONTEXT);
      setForm((previous) => ({ ...previous, error: '' }));
    } catch {
      if (mounted.current && pending.current === next) {
        const current = latest.current;
        const message = valid() ? NOT_CONFIRMED : CHANGED_CONTEXT;
        if (message === CHANGED_CONTEXT) setContextWarning(true);
        setForm((previous) => ({
          ...(previous.context === current.context && previous.source === current.source ? previous : current.initialForm()),
          error: message,
        }));
      }
    } finally {
      if (pending.current === next) {
        pending.current = null;
        if (mounted.current) setBusy(false);
      }
    }
  };
  const displayError = view.error || (contextWarning ? CHANGED_CONTEXT : '');
  const dirty = calendarKey(view.calendars) !== source || !!displayError;
  return (
    <SheetSection title={kind === 'calendar' ? 'Calendari' : 'Lista di attività'}>
      {displayError ? <Body role="alert">{displayError}</Body> : busy ? <Body role="status">Associazione in corso.</Body>
        : !runtime.entitiesLoaded ? <Body role="status">Attendo le fonti della casa.</Body>
        : !runtime.conn || runtime.conn.connected === false ? <Caption as="p">Ricollega la casa per modificare l’associazione.</Caption> : null}
      <fieldset disabled={busy || !runtime.entitiesLoaded || !runtime.conn || runtime.conn.connected === false}
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        {kind === 'calendar' ? <>
          <EntityPicker label="Calendari da mostrare" entities={runtime.entities} ids={ids}
            selected={view.calendars} searchable emptyText="Nessun calendario disponibile."
            tags={(id) => candidates.includes(id) ? [] : ['Non disponibile']}
            onToggle={(id) => {
              if (pending.current || latest.current.context !== context || !scope.current()) return;
              setForm((previous) => {
                const current = previous.context === context && previous.source === source ? previous : initialForm();
                return { ...current, calendars: current.calendars.includes(id)
                  ? current.calendars.filter((entry) => entry !== id) : [...current.calendars, id] };
              });
            }} />
          <Button variant="control" size="sm" disabled={!dirty || busy} onClick={() => void choose({ calendars: view.calendars })}>
            Applica i calendari
          </Button>
        </> : <>
          <EntitySelect label="Lista di attività" entities={runtime.entities} ids={ids}
            value={view.todoId} noneLabel="Non collegata" onChange={(id) => {
              if (id && !candidates.includes(id)) return;
              void choose({ todoEntityId: id });
            }} />
          {displayError && <Button variant="control" size="sm" onClick={() => void choose({ todoEntityId: view.todoId })}>Riprova associazione</Button>}
        </>}
        {kind === 'todo' && view.todoId && !candidates.includes(view.todoId) && <Caption as="p">
          La lista precedente non è più disponibile. Scegli un’altra lista o scollegala.
        </Caption>}
      </fieldset>
    </SheetSection>
  );
}
