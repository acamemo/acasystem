import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button, Field } from '@/components/primitives';
import { HomeIcon } from '../shared/HomeIcon';

export interface AddTodoFieldProps {
  adding: boolean;
  disabled: boolean;
  onAdd: (summary: string) => Promise<boolean>;
}

/** New to-do: Enter or the + button; the text stays until HA accepts it. */
export function AddTodoField({ adding, disabled, onAdd }: AddTodoFieldProps) {
  const [text, setText] = useState('');
  const mounted = useRef(true);
  const latest = useRef(text);
  latest.current = text;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (adding || disabled) return;
    const submitted = text;
    if (await onAdd(submitted) && mounted.current && latest.current === submitted) setText('');
  };
  return (
    <form className="home-todo__add" onSubmit={submit}>
      <Field
        label="Nuova attività"
        placeholder="Aggiungi"
        icon="add"
        size="sm"
        value={text}
        disabled={disabled || adding}
        enterKeyHint="done"
        containerClassName="home-grow"
        onChange={(event) => setText(event.target.value)}
      />
      <Button
        type="submit"
        variant="control"
        shape="circle"
        size="md"
        aria-label="Aggiungi l’attività"
        loading={adding}
        disabled={disabled || adding || !text.trim()}
      >
        <HomeIcon name="add" />
      </Button>
    </form>
  );
}
