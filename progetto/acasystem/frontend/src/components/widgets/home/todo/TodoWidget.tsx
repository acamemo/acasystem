import type { ReactNode } from 'react';
import type { WidgetProps } from '@/@types/launcher';
import { Caption, Heading, Numeric } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { attributeString, isUnavailableState, settingString } from '../shared/entity';
import { localeFor } from '../shared/format';
import { HomeIcon } from '../shared/HomeIcon';
import { rowsThatFit, useMeasuredHeight } from '../shared/useMeasuredHeight';
import { CommandError, WidgetLoading, WidgetNotice, WidgetShell } from '../shared/WidgetShell';
import { AddTodoField } from './AddTodoField';
import { TodoItemRow } from './TodoItemRow';
import { confirmedStatus, todoCapabilities } from './todoModel';
import { CARD_REFRESH_MS, useTodoList } from './useTodoList';
import '../calendar/agenda.css';

export function TodoWidget({ id, settings, size, editMode, openDetails }: WidgetProps & { openDetails?: () => void }) {
  const runtime = useWidgetRuntime();
  const { conn, callService, entities, entitiesLoaded, customNames, language } = runtime;
  const locale = localeFor(language);
  const listId = settingString(settings, 'todoEntityId');
  const entity = listId ? entities[listId] : undefined;
  const available = !!entity && !isUnavailableState(entity.state);
  const capabilities = todoCapabilities(entity);
  const name =
    customNames[id] ||
    settingString(settings, 'subtitle') ||
    settingString(settings, 'name') ||
    (listId ? attributeString(entities[listId], 'friendly_name') : undefined) ||
    'Attività';
  const list = useTodoList(conn, callService, listId, CARD_REFRESH_MS, {
    readable: entitiesLoaded && available,
    allowAdd: capabilities.add && !editMode,
    allowUpdate: capabilities.update && !editMode,
    allowRemove: capabilities.remove && !editMode,
  });
  const [bodyRef, bodyHeight] = useMeasuredHeight<HTMLDivElement>();

  const compact = size.h < 2 || size.w < 2 || (bodyHeight !== null &&
    (bodyHeight < 220 || !!list.actionError || list.loadError));
  const short = bodyHeight !== null && bodyHeight <= 64;
  const showAdd = !compact && size.h >= 3 && capabilities.add && (bodyHeight === null || bodyHeight >= 360);
  const groupOf = (item: (typeof list.items)[number]) =>
    confirmedStatus(item, list.togglingIds.has(item.id));
  const pending = list.items.filter((item) => groupOf(item) === 'needs_action');
  const completed = list.items.filter((item) => groupOf(item) === 'completed');
  const unknown = list.items.filter((item) => groupOf(item) === 'unknown');
  const ordered = [...pending, ...unknown, ...completed];
  // Rows of 46 px under a 32 px heading, the add field 56 px, «Altre…» 24 px; by cells in tests.
  const capacity =
    bodyHeight === null
      ? Math.max(1, size.h * 2 - 1 - (showAdd ? 1 : 0))
      : rowsThatFit(bodyHeight - 48 - (showAdd ? 64 : 0) - 24, 72, ordered.length, 32);
  const visible = ordered.slice(0, capacity);
  const hiddenPending = Math.max(
    0,
    pending.length - visible.filter((item) => groupOf(item) === 'needs_action').length
  );
  const summary =
    unknown.length > 0 ? `${pending.length} da fare · ${unknown.length} senza stato` : pending.length > 0
      ? pending.length === 1
        ? '1 da fare'
        : `${pending.length} da fare`
      : list.items.length === 0
        ? 'Lista vuota'
        : 'Tutto fatto';

  let body: ReactNode;
  if (!listId) {
    body = (
      <WidgetNotice
        icon="task"
        title={name}
        message="Scegli una lista di attività nelle impostazioni del widget."
        compact={compact}
      />
    );
  } else if (!entitiesLoaded || list.loading) {
    body = <WidgetLoading size={size} label="Caricamento delle attività…" />;
  } else if (!available) {
    body = <WidgetNotice icon="task" title={name} message="La lista non è disponibile." compact={compact} />;
  } else if (list.loadError && list.items.length === 0) {
    body = (
      <WidgetNotice
        icon="warning"
        tone="danger"
        title={name}
        message="Non riesco a leggere la lista. Apri i dettagli per riprovare."
        compact={compact}
      />
    );
  } else if (compact) {
    body = (
      <div className="home-row home-fill">
        <HomeIcon name="task" size="lg" tone={pending.length > 0 ? 'active' : 'muted'} />
        <div className="home-stack home-grow">
          <Heading level={3} size="sm" className="home-truncate home-todo__name">
            {name}
          </Heading>
          {!short && (list.actionError ? (
            <Caption tone="danger">Apri la lista per verificare l’attività.</Caption>
          ) : (
            <Caption>{list.loadError ? 'Ultima lettura · aggiornamento non riuscito' : summary}</Caption>
          ))}
        </div>
      </div>
    );
  } else {
    body = (
      <>
        <div className="home-row">
          <HomeIcon name="task" size="md" tone={pending.length > 0 ? 'active' : 'muted'} />
          <Heading level={3} size="sm" className="home-truncate home-grow home-todo__name">
            {name}
          </Heading>
          {list.items.length > 0 && (
            <Caption>
              <Numeric aria-hidden="true">
                {completed.length}/{list.items.length}
              </Numeric>
              <span className="sr-only">
                {completed.length} completate su {list.items.length}
              </span>
            </Caption>
          )}
        </div>
        {list.items.length === 0 ? (
          <div className="home-empty">
            <Caption as="p">{capabilities.add ? 'Lista vuota: aggiungi la prima attività.' : 'Lista vuota.'}</Caption>
          </div>
        ) : (
          <ul className="home-todo" aria-label={`Attività di ${name}`}>
            {visible.map((item) => (
              <TodoItemRow
                key={item.id}
                item={item}
                locale={locale}
                pending={list.pendingIds.has(item.id)}
                condensed={bodyHeight !== null}
                disabled={editMode || !list.writable}
                deleting={list.deletingIds.has(item.id)}
                uncertain={list.uncertainIds.has(item.id)}
                allowToggle={capabilities.update}
                onToggle={list.toggle}
              />
            ))}
          </ul>
        )}
        {hiddenPending > 0 && (
          <Caption as="p">
            {hiddenPending === 1 ? 'Un’altra da fare' : `Altre ${hiddenPending} da fare`}
          </Caption>
        )}
        {list.actionError && <CommandError>{list.actionError}</CommandError>}
        {list.loadError && list.items.length > 0 && <Caption>Ultima lettura · aggiornamento non riuscito</Caption>}
        {showAdd && (
          <div className="home-push">
            <AddTodoField key={list.sourceKey} adding={list.adding} disabled={editMode || !list.writable} onAdd={list.add} />
          </div>
        )}
      </>
    );
  }

  return (
    <WidgetShell
      bodyRef={bodyRef}
      name={name}
      className="home-agenda-widget home-todo-widget"
      size={size}
      editMode={editMode}
      error={Boolean(list.actionError)}
      state={!listId ? 'missing' : list.loading ? 'loading' : 'ready'}
      onPress={openDetails ?? (() => runtime.openDetails(id))}
      pressLabel={`Apri la lista ${name}`}
    >
      {body}
    </WidgetShell>
  );
}
