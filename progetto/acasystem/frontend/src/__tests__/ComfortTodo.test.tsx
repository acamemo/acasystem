import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HaMessage, HaTodoItem } from '@/@types/ha';
import { addTodoItem, callService as haCallService, removeTodoItem, updateTodoItem } from '@/api';
import { rowsThatFit } from '@/components/widgets/home/shared/useMeasuredHeight';
import { todoWidget } from '@/components/widgets/home/todo';
import {
  addItemCall,
  removeItemCall,
  updateItemCall,
} from '@/components/widgets/home/todo/todoModel';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, renderDetails, renderWidget, serviceMock } from './ComfortHarness';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const ID = 'todo_card_1';
const settings = { todoEntityId: 'todo.spesa' };
const entities = fixtureEntities([fixtureEntity('todo.spesa', '2', { friendly_name: 'Spesa' })]);

/** A to-do list served through `todo/item/list`, mutable to simulate HA confirmations. */
function todoConnection(initial: HaTodoItem[]) {
  let items = initial;
  const connection = fakeConnection((message: HaMessage) => {
    if (message.type === 'todo/item/list') return { items };
    return null;
  });
  return { ...connection, setItems: (next: HaTodoItem[]) => (items = next) };
}

const baseItems: HaTodoItem[] = [
  { uid: 'u1', summary: 'Latte', status: 'needs_action' },
  { uid: 'u2', summary: 'Pane', status: 'needs_action', due: '2020-01-01' },
  { uid: 'u3', summary: 'Uova', status: 'completed' },
];

describe('Parità dei messaggi con il legacy', () => {
  it('add_item, update_item e remove_item passano dal callService con lo stesso messaggio WebSocket', async () => {
    const legacy = fakeConnection(() => null);
    const current = fakeConnection(() => null);
    await addTodoItem(legacy.conn, 'todo.spesa', 'Latte');
    const add = addItemCall('todo.spesa', 'Latte');
    await haCallService(current.conn, add.domain, add.service, add.data);
    await updateTodoItem(legacy.conn, 'todo.spesa', 'u1', 'completed');
    const update = updateItemCall('todo.spesa', 'u1', 'completed');
    await haCallService(current.conn, update.domain, update.service, update.data);
    await removeTodoItem(legacy.conn, 'todo.spesa', 'u1');
    const remove = removeItemCall('todo.spesa', 'u1');
    await haCallService(current.conn, remove.domain, remove.service, remove.data);
    expect(current.sendMessagePromise.mock.calls).toEqual(legacy.sendMessagePromise.mock.calls);
    expect(current.sendMessagePromise.mock.calls[0][0]).toEqual({
      type: 'call_service',
      domain: 'todo',
      service: 'add_item',
      target: { entity_id: 'todo.spesa' },
      service_data: { item: 'Latte' },
    });
  });
});

describe('Widget attività', () => {
  it('2×1: riepilogo delle attività da fare', async () => {
    const { conn } = todoConnection(baseItems);
    renderWidget(todoWidget, {
      id: ID,
      settings,
      size: { w: 2, h: 1 },
      runtime: { conn, entities },
    });
    expect(await screen.findByText('2 da fare')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Spesa' })).toBeInTheDocument();
  });

  it('2×2: elenco con le completate dopo, scadenza superata indicata in testo', async () => {
    const { conn } = todoConnection(baseItems);
    renderWidget(todoWidget, {
      id: ID,
      settings,
      size: { w: 2, h: 2 },
      runtime: { conn, entities },
    });
    const list = await screen.findByRole('list', { name: 'Attività di Spesa' });
    const boxes = within(list).getAllByRole('checkbox');
    expect(boxes.map((box) => box.getAttribute('aria-checked'))).toEqual([
      'false',
      'false',
      'true',
    ]);
    expect(within(list).getByRole('checkbox', { name: 'Pane' })).toHaveAccessibleDescription(
      /Scaduta il 1 gen/
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('completamento: update_item con target e stato, in attesa finché la lista non lo conferma', async () => {
    const callService = serviceMock();
    const { conn, setItems } = todoConnection(baseItems);
    renderWidget(todoWidget, {
      id: ID,
      settings,
      size: { w: 2, h: 3 },
      runtime: { conn, entities, callService },
    });
    const latte = await screen.findByRole('checkbox', { name: 'Latte' });
    setItems([{ ...baseItems[0], status: 'completed' }, baseItems[1], baseItems[2]]);
    fireEvent.click(latte);
    expect(callService).toHaveBeenCalledWith('todo', 'update_item', {
      target: { entity_id: 'todo.spesa' },
      item: 'u1',
      status: 'completed',
    });
    expect(screen.getByRole('checkbox', { name: 'Latte' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('checkbox', { name: 'Latte' })).toHaveAttribute('aria-busy', 'true');
    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: 'Latte' })).not.toHaveAttribute('aria-busy')
    );
    expect(screen.getByRole('checkbox', { name: 'Latte' })).toHaveAttribute('aria-checked', 'true');
  });

  it('una riga in attesa resta al suo posto finché HA non conferma', async () => {
    const callService = serviceMock();
    const { conn } = todoConnection(baseItems);
    renderWidget(todoWidget, {
      id: ID,
      settings,
      size: { w: 2, h: 2 },
      runtime: { conn, entities, callService },
    });
    const list = await screen.findByRole('list', { name: 'Attività di Spesa' });
    fireEvent.click(within(list).getByRole('checkbox', { name: 'Latte' }));
    const boxes = within(list).getAllByRole('checkbox');
    expect(boxes[0]).toHaveAccessibleName('Latte');
    expect(boxes[0]).toHaveAttribute('aria-checked', 'true');
    expect(boxes[0]).toHaveAttribute('aria-busy', 'true');
  });

  it('righe che entrano nell’altezza misurata, con lo spazio per «Altre…»', () => {
    expect(rowsThatFit(140, 46, 3, 24)).toBe(3);
    expect(rowsThatFit(140, 46, 6, 24)).toBe(2);
    expect(rowsThatFit(20, 46, 6, 24)).toBe(1);
  });

  it('aggiunta dal campo (2×3 o più): add_item con target e testo', async () => {
    const callService = serviceMock();
    const { conn } = todoConnection(baseItems);
    renderWidget(todoWidget, {
      id: ID,
      settings,
      size: { w: 2, h: 3 },
      runtime: { conn, entities, callService },
    });
    const field = await screen.findByRole('textbox', { name: 'Nuova attività' });
    fireEvent.change(field, { target: { value: '  Caffè ' } });
    fireEvent.submit(field.closest('form') as HTMLFormElement);
    await waitFor(() =>
      expect(callService).toHaveBeenCalledWith('todo', 'add_item', {
        target: { entity_id: 'todo.spesa' },
        item: 'Caffè',
      })
    );
    await waitFor(() => expect(field).toHaveValue(''));
  });

  it('errore del comando: torna allo stato confermato e lo dice', async () => {
    const callService = serviceMock(new Error('rifiutato'));
    const { conn } = todoConnection(baseItems);
    renderWidget(todoWidget, {
      id: ID,
      settings,
      size: { w: 2, h: 2 },
      runtime: { conn, entities, callService },
    });
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Latte' }));
    expect(await screen.findByText('«Latte» non aggiornata. Riprova.')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Latte' })).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  it('in modalità modifica le caselle e il campo sono disabilitati', async () => {
    const callService = serviceMock();
    const { conn } = todoConnection(baseItems);
    renderWidget(todoWidget, {
      id: ID,
      settings,
      size: { w: 2, h: 4 },
      editMode: true,
      runtime: { conn, entities, callService },
    });
    const latte = await screen.findByRole('checkbox', { name: 'Latte' });
    expect(latte).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Nuova attività' })).toBeDisabled();
    fireEvent.click(latte);
    expect(callService).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /Apri la lista/ })).not.toBeInTheDocument();
  });

  it('lista non scelta, in caricamento e vuota', async () => {
    const { update } = renderWidget(todoWidget, { id: ID, settings: {}, runtime: {} });
    expect(
      screen.getByText('Scegli una lista di attività nelle impostazioni del widget.')
    ).toBeInTheDocument();
    update({ id: ID, settings, runtime: { conn: null } });
    expect(screen.getByRole('status')).toHaveTextContent('Caricamento delle attività…');
    cleanup();
    renderWidget(todoWidget, { id: ID, settings, runtime: { conn: todoConnection([]).conn } });
    expect(await screen.findByText('Lista vuota: aggiungi la prima attività.')).toBeInTheDocument();
  });
});

describe('Dettagli attività', () => {
  it('elenco completo con eliminazione (remove_item) e completate richiudibili', async () => {
    const callService = serviceMock();
    const { conn } = todoConnection(baseItems);
    renderDetails(todoWidget, { id: ID, settings, runtime: { conn, entities, callService } });
    const pending = await screen.findByRole('list', { name: 'Da fare' });
    expect(within(pending).getAllByRole('checkbox')).toHaveLength(2);
    expect(screen.getByText(/1 di 3/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Elimina «Pane»' }));
    expect(callService).toHaveBeenCalledWith('todo', 'remove_item', {
      target: { entity_id: 'todo.spesa' },
      item: 'u2',
    });
    expect(screen.queryByRole('checkbox', { name: 'Pane' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Nascondi' }));
    expect(screen.queryByRole('list', { name: 'Completate' })).not.toBeInTheDocument();
  });

  it('aggiunta dal foglio con Invio', async () => {
    const callService = serviceMock();
    const { conn } = todoConnection(baseItems);
    renderDetails(todoWidget, { id: ID, settings, runtime: { conn, entities, callService } });
    const field = await screen.findByRole('textbox', { name: 'Nuova attività' });
    fireEvent.change(field, { target: { value: 'Mele' } });
    fireEvent.submit(field.closest('form') as HTMLFormElement);
    await waitFor(() =>
      expect(callService).toHaveBeenCalledWith('todo', 'add_item', {
        target: { entity_id: 'todo.spesa' },
        item: 'Mele',
      })
    );
  });
});
