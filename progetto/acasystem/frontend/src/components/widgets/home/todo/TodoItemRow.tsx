import { useId } from 'react';
import { Body, Button, Caption, materialClass, MaterialLayers } from '@/components/primitives';
import { HomeIcon } from '../shared/HomeIcon';
import { dueText, type TodoItemView } from './todoModel';

export interface TodoItemRowProps {
  item: TodoItemView;
  locale: string;
  pending: boolean;
  disabled: boolean;
  onToggle: (item: TodoItemView) => void;
  /** Shown in the detail sheet only. */
  onRemove?: (item: TodoItemView) => void;
  showDetails?: boolean;
}

/**
 * One to-do: the whole row is a checkbox (44 px or more), the round mark is filled in orange
 * when done; while HA confirms the change the row is busy. The summary names the checkbox,
 * due date and waiting state describe it.
 */
export function TodoItemRow({
  item,
  locale,
  pending,
  disabled,
  onToggle,
  onRemove,
  showDetails = false,
}: TodoItemRowProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const nameId = `attivita-${uid}`;
  const descriptionId = `attivita-${uid}-info`;
  const done = item.status === 'completed';
  const due = done ? null : dueText(item.due, locale);
  const hasDescription = Boolean(due || pending || (showDetails && item.description));
  return (
    <li className="home-todo__item" data-done={done || undefined}>
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-busy={pending || undefined}
        aria-labelledby={nameId}
        aria-describedby={hasDescription ? descriptionId : undefined}
        disabled={disabled}
        className="home-todo__check"
        onClick={() => onToggle(item)}
      >
        <span
          className={materialClass(
            { behavior: 'well', shape: 'circle', size: 'inherit' },
            'home-todo__mark'
          )}
          aria-hidden="true"
        >
          <MaterialLayers>{done && <HomeIcon name="ok" size="sm" />}</MaterialLayers>
        </span>
        <span className="home-stack home-grow">
          <Body
            as="span"
            size="sm"
            id={nameId}
            className={showDetails ? 'home-todo__summary' : 'home-todo__summary home-truncate'}
          >
            {item.summary}
          </Body>
          {hasDescription && (
            <span id={descriptionId} className="home-stack">
              {showDetails && item.description && (
                <Caption className="home-clamp-2">{item.description}</Caption>
              )}
              {due && (
                <Caption tone={due.overdue ? 'danger' : 'muted'} className="home-inline">
                  {due.overdue && <HomeIcon name="warning" size="sm" tone="danger" />}
                  {due.text}
                </Caption>
              )}
              {pending && <Caption>In attesa di conferma</Caption>}
            </span>
          )}
        </span>
      </button>
      {onRemove && (
        <Button
          variant="control"
          shape="circle"
          size="md"
          aria-label={`Elimina «${item.summary}»`}
          disabled={disabled}
          onClick={() => onRemove(item)}
        >
          <HomeIcon name="trash" />
        </Button>
      )}
    </li>
  );
}
