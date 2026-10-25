import { useState } from 'react';
import { Body, Button, Caption, Field } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { useTodoList, CARD_REFRESH_MS } from '../home/todo/useTodoList';
import { TodoItemRow } from '../home/todo/TodoItemRow';
import { AddTodoField } from '../home/todo/AddTodoField';
import type { TodoItemView } from '../home/todo/todoModel';

export function TodoContent({
  entityId,
  disabled,
  expanded = false,
}: {
  entityId: string;
  disabled: boolean;
  expanded?: boolean;
}) {
  const { conn, callService, entities } = useWidgetRuntime();
  const list = useTodoList(conn, callService, entityId, CARD_REFRESH_MS);
  const features = Number(entities[entityId]?.attributes.supported_features ?? 0);
  const [editing, setEditing] = useState<TodoItemView | null>(null);
  const [summary, setSummary] = useState('');
  const [due, setDue] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const shown = expanded ? list.items : list.items.slice(0, 3);
  const save = async () => {
    if (!editing || !summary.trim()) return;
    setSaving(true);
    const ok = await list.update(editing, {
      rename: summary.trim(),
      ...(features & 32
        ? { due_datetime: due || null }
        : features & 16
          ? { due_date: due || null }
          : {}),
      ...(features & 64 ? { description } : {}),
    });
    setSaving(false);
    if (ok) setEditing(null);
  };
  if (list.loading) return <Caption role="status">Caricamento delle attività…</Caption>;
  return (
    <div className="aca-adaptive-todo">
      <Caption>
        {list.items.filter((item) => item.status === 'completed').length}/{list.items.length}{' '}
        completate
      </Caption>
      {list.loadError && (
        <Caption role="alert" tone="danger">
          Non riesco a leggere la lista.
        </Caption>
      )}
      {!list.items.length && <Body size="sm">Lista vuota</Body>}
      <div className="home-todo" role="list" aria-label="Attività">
        {shown.map((item) => (
          <div key={item.id}>
            <ul>
              <TodoItemRow
                item={item}
                locale="it-IT"
                pending={list.pendingIds.has(item.id)}
                disabled={disabled || !(features & 4)}
                onToggle={list.toggle}
                onRemove={expanded && features & 2 && !disabled ? list.remove : undefined}
              />
            </ul>
            {expanded && Boolean(features & 4) && (
              <Button
                variant="control"
                size="sm"
                disabled={disabled || saving}
                onClick={() => {
                  setEditing(item);
                  setSummary(item.summary);
                  setDue(item.due?.slice(0, features & 32 ? 16 : 10) ?? '');
                  setDescription(item.description ?? '');
                }}
              >
                Modifica attività
              </Button>
            )}
          </div>
        ))}
      </div>
      {expanded && Boolean(features & 1) && (
        <AddTodoField disabled={disabled} adding={list.adding} onAdd={list.add} />
      )}
      {editing && (
        <div className="aca-adaptive-todo__editor">
          <Field
            label="Nome attività"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
          />
          {Boolean(features & 48) && (
            <Field
              label="Scadenza"
              type={features & 32 ? 'datetime-local' : 'date'}
              value={due}
              onChange={(event) => setDue(event.target.value)}
            />
          )}
          {Boolean(features & 64) && (
            <Field
              label="Descrizione"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          )}
          <Button
            variant="primary"
            disabled={disabled || saving || !summary.trim()}
            onClick={() => void save()}
          >
            Salva attività
          </Button>
          <Button variant="control" disabled={saving} onClick={() => setEditing(null)}>
            Annulla
          </Button>
        </div>
      )}
      {list.actionError && (
        <Caption role="alert" tone="danger">
          {list.actionError}
        </Caption>
      )}
    </div>
  );
}
