import { useId, useState } from 'react';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { Button, Caption, Heading, Numeric, Skeleton } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { attributeString, isUnavailableState, settingString } from '../shared/entity';
import { localeFor } from '../shared/format';
import { HomeIcon } from '../shared/HomeIcon';
import { CommandError, WidgetNotice } from '../shared/WidgetShell';
import { AddTodoField } from './AddTodoField';
import { TodoItemRow } from './TodoItemRow';
import { confirmedStatus, todoCapabilities } from './todoModel';
import { DETAILS_REFRESH_MS, useTodoList } from './useTodoList';
import '../calendar/agenda.css';

/** Whole list with add, complete and delete (legacy TodoModal). */
export function TodoDetails({ settings }: WidgetDetailsProps) {
  const { conn, callService, entities, entitiesLoaded, language, editMode } = useWidgetRuntime();
  const locale = localeFor(language);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const completedId = `completate-${uid}`;
  const listId = settingString(settings, 'todoEntityId');
  const entity = listId ? entities[listId] : undefined;
  const available = !!entity && !isUnavailableState(entity.state);
  const capabilities = todoCapabilities(entity);
  const list = useTodoList(conn, callService, listId, DETAILS_REFRESH_MS, {
    readable: entitiesLoaded && available,
    allowAdd: capabilities.add && !editMode,
    allowUpdate: capabilities.update && !editMode,
    allowRemove: capabilities.remove && !editMode,
  });
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
    confirmedStatus(item, list.togglingIds.has(item.id));
  const pending = list.items.filter((item) => groupOf(item) === 'needs_action');
  const completed = list.items.filter((item) => groupOf(item) === 'completed');
  const unknown = list.items.filter((item) => groupOf(item) === 'unknown');
  const total = list.items.length;
  const percent = total > 0 ? Math.round((completed.length / total) * 100) : 0;

  const row = (item: (typeof list.items)[number]) => (
    <TodoItemRow
      key={item.id}
      item={item}
      locale={locale}
      pending={list.pendingIds.has(item.id)}
      disabled={editMode || !list.writable}
      deleting={list.deletingIds.has(item.id)}
      uncertain={list.uncertainIds.has(item.id)}
      allowToggle={capabilities.update}
      allowRemove={capabilities.remove}
      onToggle={list.toggle}
      onRemove={list.remove}
      showDetails
    />
  );

  return (
    <div className="home-details home-agenda-details">
      <div className="home-row home-row--between home-row--wrap">
        <Caption as="p">{name}</Caption>
        {total > 0 && unknown.length === 0 && (
          <Caption as="p">
            <Numeric>
              {completed.length} di {total}
            </Numeric>{' '}
            completate · <Numeric>{percent}%</Numeric>
          </Caption>
        )}
      </div>

      {capabilities.add && available && <AddTodoField key={list.sourceKey} adding={list.adding} disabled={editMode || !list.writable} onAdd={list.add} />}
      {!capabilities.add && available && <Caption as="p">Questa lista non consente l’aggiunta di attività.</Caption>}
      {list.actionError && <CommandError>{list.actionError}</CommandError>}

      {!entitiesLoaded || list.loading ? (
        <Skeleton rows={3} label="Caricamento delle attività…" />
      ) : !available ? (
        <Caption as="p">La lista non è disponibile.</Caption>
      ) : list.loadError && total === 0 ? (
        <div className="home-stack"><CommandError>Non riesco a leggere la lista.</CommandError><Button variant="control" size="sm" onClick={list.retry} disabled={!conn || conn.connected === false}>Riprova</Button></div>
      ) : total === 0 || (pending.length === 0 && unknown.length === 0) ? (
        <div className="home-empty">
          <HomeIcon name="ok" size="lg" tone="muted" />
          <Caption as="p">
            {total === 0 ? capabilities.add ? 'Nessuna attività: aggiungine una qui sopra.' : 'Nessuna attività.' : 'Tutto fatto.'}
          </Caption>
        </div>
      ) : pending.length > 0 ? (
        <ul className="home-todo" aria-label="Da fare">
          {pending.map(row)}
        </ul>
      ) : null}

      {unknown.length > 0 && <section className="home-section" aria-label="Stato non disponibile"><Heading level={3} size="sm">Stato non disponibile</Heading><ul className="home-todo">{unknown.map(row)}</ul></section>}
      {list.loadError && total > 0 && <div className="home-stack"><Caption as="p">Ultima lettura · aggiornamento non riuscito</Caption><Button variant="control" size="sm" onClick={list.retry} disabled={!conn || conn.connected === false}>Riprova</Button></div>}
      {list.actionError && !list.loadError && <Button variant="control" size="sm" onClick={list.retry} disabled={!conn || conn.connected === false}>Aggiorna la lista</Button>}

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
