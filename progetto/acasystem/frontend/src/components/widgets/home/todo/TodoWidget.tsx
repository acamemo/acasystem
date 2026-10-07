import type { ReactNode } from 'react';
import type { WidgetProps } from '@/@types/launcher';
import { Caption, Heading, Numeric } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { attributeString, settingString } from '../shared/entity';
import { localeFor } from '../shared/format';
import { HomeIcon } from '../shared/HomeIcon';
import { rowsThatFit, useMeasuredHeight } from '../shared/useMeasuredHeight';
import { CommandError, WidgetLoading, WidgetNotice, WidgetShell } from '../shared/WidgetShell';
import { AddTodoField } from './AddTodoField';
import { TodoItemRow } from './TodoItemRow';
import { confirmedStatus } from './todoModel';
import { CARD_REFRESH_MS, useTodoList } from './useTodoList';

export function TodoWidget({ id, settings, size, editMode }: WidgetProps) {
  const { conn, callService, entities, entitiesLoaded, customNames, openDetails, language } =
    useWidgetRuntime();
  const locale = localeFor(language);
  const listId = settingString(settings, 'todoEntityId');
  const name =
    customNames[id] ||
    settingString(settings, 'name') ||
    (listId ? attributeString(entities[listId], 'friendly_name') : undefined) ||
    'Attività';
  const list = useTodoList(conn, callService, listId, CARD_REFRESH_MS);
  const [bodyRef, bodyHeight] = useMeasuredHeight<HTMLDivElement>();

  const compact = size.h < 2;
  const showAdd = size.h >= 3;
  const groupOf = (item: (typeof list.items)[number]) =>
    confirmedStatus(item, list.pendingIds.has(item.id));
  const pending = list.items.filter((item) => groupOf(item) === 'needs_action');
  const completed = list.items.filter((item) => groupOf(item) === 'completed');
  const ordered = [...pending, ...completed];
  // Rows of 46 px under a 32 px heading, the add field 56 px, «Altre…» 24 px; by cells in tests.
  const capacity =
    bodyHeight === null
      ? Math.max(1, size.h * 2 - 1 - (showAdd ? 1 : 0))
      : rowsThatFit(bodyHeight - 32 - (showAdd ? 56 : 0), 46, ordered.length, 24);
  const visible = ordered.slice(0, capacity);
  const hiddenPending = Math.max(
    0,
    pending.length - visible.filter((item) => groupOf(item) === 'needs_action').length
  );
  const summary =
    pending.length > 0
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
  } else if (list.loadError && list.items.length === 0) {
    body = (
      <WidgetNotice
        icon="warning"
        tone="danger"
        title={name}
        message="Non riesco a leggere la lista da Home Assistant. Riprovo tra poco."
        compact={compact}
      />
    );
  } else if (compact) {
    body = (
      <div className="home-row home-fill">
        <HomeIcon name="task" size="lg" tone={pending.length > 0 ? 'active' : 'muted'} />
        <div className="home-stack home-grow">
          <Heading level={3} size="sm" className="home-truncate">
            {name}
          </Heading>
          {list.actionError ? (
            <CommandError>{list.actionError}</CommandError>
          ) : (
            <Caption>{summary}</Caption>
          )}
        </div>
      </div>
    );
  } else {
    body = (
      <>
        <div className="home-row">
          <HomeIcon name="task" size="md" tone={pending.length > 0 ? 'active' : 'muted'} />
          <Heading level={3} size="sm" className="home-truncate home-grow">
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
            <Caption as="p">Lista vuota: aggiungi la prima attività.</Caption>
          </div>
        ) : (
          <ul className="home-todo" aria-label={`Attività di ${name}`}>
            {visible.map((item) => (
              <TodoItemRow
                key={item.id}
                item={item}
                locale={locale}
                pending={list.pendingIds.has(item.id)}
                disabled={editMode}
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
        {showAdd && (
          <div className="home-push">
            <AddTodoField adding={list.adding} disabled={editMode} onAdd={list.add} />
          </div>
        )}
      </>
    );
  }

  return (
    <WidgetShell
      bodyRef={bodyRef}
      name={name}
      size={size}
      editMode={editMode}
      error={Boolean(list.actionError)}
      state={!listId ? 'missing' : list.loading ? 'loading' : 'ready'}
      onPress={() => openDetails(id)}
      pressLabel={`Apri la lista ${name}`}
    >
      {body}
    </WidgetShell>
  );
}
