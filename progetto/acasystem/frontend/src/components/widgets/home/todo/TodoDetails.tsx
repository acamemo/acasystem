import { useId, useState } from 'react';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { Button, Caption, Heading, Numeric, Skeleton } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { attributeString, settingString } from '../shared/entity';
import { localeFor } from '../shared/format';
import { HomeIcon } from '../shared/HomeIcon';
import { CommandError, WidgetNotice } from '../shared/WidgetShell';
import { AddTodoField } from './AddTodoField';
import { TodoItemRow } from './TodoItemRow';
import { confirmedStatus } from './todoModel';
import { DETAILS_REFRESH_MS, useTodoList } from './useTodoList';

/** Whole list with add, complete and delete (legacy TodoModal). */
export function TodoDetails({ settings }: WidgetDetailsProps) {
  const { conn, callService, entities, language, editMode } = useWidgetRuntime();
  const locale = localeFor(language);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const completedId = `completate-${uid}`;
  const listId = settingString(settings, 'todoEntityId');
  const list = useTodoList(conn, callService, listId, DETAILS_REFRESH_MS);
  const [showCompleted, setShowCompleted] = useState(true);

  if (!listId) {
    return (
      <WidgetNotice
        icon="task"
        title="Attività"
        message="Scegli una lista di attività nelle impostazioni del widget."
      />
    );
  }

  const name = attributeString(entities[listId], 'friendly_name') ?? listId;
  const groupOf = (item: (typeof list.items)[number]) =>
    confirmedStatus(item, list.pendingIds.has(item.id));
  const pending = list.items.filter((item) => groupOf(item) === 'needs_action');
  const completed = list.items.filter((item) => groupOf(item) === 'completed');
  const total = list.items.length;
  const percent = total > 0 ? Math.round((completed.length / total) * 100) : 0;

  const row = (item: (typeof list.items)[number]) => (
    <TodoItemRow
      key={item.id}
      item={item}
      locale={locale}
      pending={list.pendingIds.has(item.id)}
      disabled={editMode}
      onToggle={list.toggle}
      onRemove={list.remove}
      showDetails
    />
  );

  return (
    <div className="home-details">
      <div className="home-row home-row--between home-row--wrap">
        <Caption as="p">{name}</Caption>
        {total > 0 && (
          <Caption as="p">
            <Numeric>
              {completed.length} di {total}
            </Numeric>{' '}
            completate · <Numeric>{percent}%</Numeric>
          </Caption>
        )}
      </div>

      <AddTodoField adding={list.adding} disabled={editMode} onAdd={list.add} />
      {list.actionError && <CommandError>{list.actionError}</CommandError>}

      {list.loading ? (
        <Skeleton rows={3} label="Caricamento delle attività…" />
      ) : list.loadError && total === 0 ? (
        <CommandError>Non riesco a leggere la lista da Home Assistant.</CommandError>
      ) : total === 0 || pending.length === 0 ? (
        <div className="home-empty">
          <HomeIcon name="ok" size="lg" tone="muted" />
          <Caption as="p">
            {total === 0 ? 'Nessuna attività: aggiungine una qui sopra.' : 'Tutto fatto.'}
          </Caption>
        </div>
      ) : (
        <ul className="home-todo" aria-label="Da fare">
          {pending.map(row)}
        </ul>
      )}

      {completed.length > 0 && (
        <section className="home-section" aria-labelledby={completedId}>
          <div className="home-row home-row--between">
            <Heading level={3} size="sm" id={completedId}>
              Completate <Numeric>({completed.length})</Numeric>
            </Heading>
            <Button
              variant="control"
              size="sm"
              aria-expanded={showCompleted}
              onClick={() => setShowCompleted((value) => !value)}
            >
              {showCompleted ? 'Nascondi' : 'Mostra'}
            </Button>
          </div>
          {showCompleted && (
            <ul className="home-todo" aria-label="Completate">
              {completed.map(row)}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
