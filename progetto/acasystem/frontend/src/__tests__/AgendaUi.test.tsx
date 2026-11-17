import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { calendarWidget } from '@/components/widgets/home/calendar';
import { CALENDAR_SELECTION_KEY } from '@/components/widgets/home/calendar/CalendarDetails';
import { todoWidget } from '@/components/widgets/home/todo';
import { AgendaBindingSection } from '@/templates/sheets/AgendaBindingSection';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, renderDetails, renderWidget } from './ComfortHarness';

const now = new Date('2026-11-12T08:00:00Z');
const calendars = fixtureEntities([
  fixtureEntity('calendar.a', 'off', { friendly_name: 'Famiglia' }),
  fixtureEntity('calendar.b', 'off', { friendly_name: 'Lavoro' }),
]);
const todoEntities = (features?: number, state = '1') => fixtureEntities([
  fixtureEntity('todo.a', state, { friendly_name: 'Spesa', supported_features: features }),
]);
function todoConnection() {
  return fakeConnection(() => ({ items: [
    { uid: 'a', summary: 'Latte', status: 'needs_action' },
    { uid: 'b', summary: 'Pane', status: 'completed' },
  ] }));
}
function deferred() {
  let resolve!: () => void, reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
beforeEach(() => { localStorage.clear(); vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(now); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('Agenda · UI delle attività', () => {
  const measuredBox = (height: number) => vi.stubGlobal('ResizeObserver', class {
    constructor(private callback: ResizeObserverCallback) {}
    observe(target: Element) {
      this.callback([{ target, contentRect: { width: 158, height } } as ResizeObserverEntry], this as unknown as ResizeObserver);
    }
    unobserve() {}
    disconnect() {}
  });
  it.each([122, 158])('una tessera fisica alta %spx mostra il riepilogo invece di righe parziali', async (height) => {
    measuredBox(height);
    const { conn } = todoConnection();
    renderWidget(todoWidget, { id: 'todo_card_1', settings: { todoEntityId: 'todo.a' }, size: { w: 2, h: 2 },
      runtime: { conn, entities: todoEntities(7) } });
    expect(await screen.findByText('1 da fare')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Nuova attività' })).not.toBeInTheDocument();
  });
  it.each([48, 64])('una tessera fisica alta %spx conserva soltanto icona e nome completo accessibile', async (height) => {
    measuredBox(height);
    const name = 'Lista della spesa della famiglia con appuntamenti e attività condivisi della casa di montagna';
    const { conn } = todoConnection();
    renderWidget(todoWidget, { id: 'todo_card_1', settings: { todoEntityId: 'todo.a', subtitle: name }, size: { w: 2, h: 1 },
      runtime: { conn, entities: todoEntities(7) } });
    await waitFor(() => expect(screen.queryByLabelText('Caricamento delle attività…')).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `Apri la lista ${name}` })).toBeInTheDocument();
    expect(screen.queryByText('1 da fare')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Nuova attività' })).not.toBeInTheDocument();
  });
  it('un nome lungo resta accessibile nel riepilogo158px e completo nei dettagli', async () => {
    measuredBox(158);
    const name = 'Lista della spesa della famiglia con appuntamenti e attività condivisi della casa di montagna';
    const namedEntities = fixtureEntities([fixtureEntity('todo.a', '1', { friendly_name: name, supported_features: 7 })]);
    const { conn } = todoConnection();
    renderWidget(todoWidget, { id: 'todo_card_1', settings: { todoEntityId: 'todo.a' }, size: { w: 2, h: 2 },
      runtime: { conn, entities: namedEntities } });
    expect(await screen.findByText('1 da fare')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    cleanup();
    renderDetails(todoWidget, { id: 'todo_card_1', settings: { todoEntityId: 'todo.a' }, runtime: { conn, entities: namedEntities } });
    expect(screen.getByText(name)).toBeInTheDocument();
  });
  it('un’altezza fisica intermedia conserva una voce completa e rinvia i dettagli alla lista', async () => {
    measuredBox(240);
    const { conn } = fakeConnection(() => ({ items: [
      { uid: 'a', summary: 'Latte', status: 'needs_action', due: '2020-01-01' },
      { uid: 'b', summary: 'Chiamare l’idraulico', status: 'needs_action', due: '2020-01-02' },
      { uid: 'c', summary: 'Pane', status: 'needs_action' },
    ] }));
    renderWidget(todoWidget, { id: 'todo_card_1', settings: { todoEntityId: 'todo.a' }, size: { w: 2, h: 4 },
      runtime: { conn, entities: todoEntities(7) } });
    expect(await screen.findByRole('checkbox', { name: 'Latte' })).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    expect(screen.getByText('Altre 2 da fare')).toBeInTheDocument();
    expect(screen.queryByText(/Scaduta/)).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Nuova attività' })).not.toBeInTheDocument();
  });
  it('capacità assenti: legge le voci, disabilita il completamento e non mostra aggiunta/eliminazione', async () => {
    const { conn } = todoConnection(), callService = vi.fn();
    renderDetails(todoWidget, { id: 'todo_card_1', settings: { todoEntityId: 'todo.a' },
      runtime: { conn, entities: todoEntities(), callService } });
    const row = await screen.findByRole('checkbox', { name: 'Latte' });
    expect(row).toBeDisabled();
    expect(screen.queryByRole('textbox', { name: 'Nuova attività' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Elimina/ })).not.toBeInTheDocument();
    expect(callService).not.toHaveBeenCalled();
  });
  it('un titolo senza spazi conserva nome completo e azione Elimina indipendente per UID', async () => {
    const title = 'ConsegnaStraordinaria'.repeat(35);
    const description = 'NotaSenzaSpazi'.repeat(30);
    const { conn } = fakeConnection(() => ({ items: [{ uid: 'uid-lungo', summary: title,
      description, due: '2026-11-13', status: 'needs_action' }] }));
    const callService = vi.fn(async () => undefined);
    renderDetails(todoWidget, { id: 'todo_card_1', settings: { todoEntityId: 'todo.a' },
      runtime: { conn, entities: todoEntities(7), callService } });
    const checkbox = await screen.findByRole('checkbox', { name: title });
    expect(checkbox).toHaveAccessibleDescription(new RegExp(description));
    const remove = screen.getByRole('button', { name: `Elimina «${title}»` });
    expect(remove.closest('[role="checkbox"]')).toBeNull();
    fireEvent.click(remove);
    await waitFor(() => expect(callService).toHaveBeenCalledWith('todo', 'remove_item', {
      target: { entity_id: 'todo.a' }, item: 'uid-lungo',
    }));
    expect(remove).toBeDisabled();
    expect(checkbox).toBeInTheDocument();
  });
  it.each(['unknown', 'unavailable'])('entità %s non diventa una lista vuota', async (state) => {
    const { conn, sendMessagePromise } = todoConnection();
    renderDetails(todoWidget, { id: 'todo_card_1', settings: { todoEntityId: 'todo.a' },
      runtime: { conn, entities: todoEntities(7, state) } });
    expect(screen.getByText('La lista non è disponibile.')).toBeInTheDocument();
    expect(screen.queryByText(/Nessuna attività/)).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Nuova attività' })).not.toBeInTheDocument();
    expect(sendMessagePromise).not.toHaveBeenCalled();
  });
  it('uno stato di voce ignoto resta visibile e non dichiara tutto fatto', async () => {
    const { conn } = fakeConnection(() => ({ items: [{ uid: 'a', summary: 'Stato ignoto' }] }));
    renderDetails(todoWidget, { id: 'todo_card_1', settings: { todoEntityId: 'todo.a' },
      runtime: { conn, entities: todoEntities(7) } });
    const row = await screen.findByRole('checkbox', { name: 'Stato ignoto' });
    expect(row).toHaveAttribute('aria-checked', 'mixed'); expect(row).toBeDisabled();
    expect(screen.queryByText('Tutto fatto.')).not.toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });
  it('la riga pendente è disabilitata mentre l’altra mantiene un controllo autonomo', async () => {
    const command = deferred(), callService = vi.fn(() => command.promise);
    const { conn } = todoConnection();
    renderDetails(todoWidget, { id: 'todo_card_1', settings: { todoEntityId: 'todo.a' },
      runtime: { conn, entities: todoEntities(7), callService } });
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Latte' }));
    await waitFor(() => expect(callService).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('checkbox', { name: 'Latte' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Elimina «Latte»' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Pane' })).toBeEnabled();
    expect(screen.getByRole('checkbox', { name: 'Latte' })).toHaveAccessibleDescription('In attesa di conferma');
  });
  it('modifica, sorgente mancante e caricamento non inviano mutazioni', async () => {
    const { conn } = todoConnection(), callService = vi.fn();
    const { update } = renderWidget(todoWidget, { id: 'todo_card_1', settings: { todoEntityId: 'todo.a' },
      size: { w: 2, h: 4 }, editMode: true, runtime: { conn, entities: todoEntities(7), callService } });
    expect(await screen.findByRole('checkbox', { name: 'Latte' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Nuova attività' })).toBeDisabled();
    update({ id: 'todo_card_1', settings: { todoEntityId: 'todo.missing' }, runtime: { conn, entities: todoEntities(7), callService } });
    expect(screen.getByText('La lista non è disponibile.')).toBeInTheDocument();
    expect(callService).not.toHaveBeenCalled();
  });
  it('subtitle e ID legacy restano il titolo e il bersaglio di apertura anche in formato piccolo', async () => {
    const { conn } = todoConnection(), openDetails = vi.fn();
    renderWidget(todoWidget, { id: 'todo_card_legacy', settings: { todoEntityId: 'todo.a', subtitle: 'Da ricordare' },
      size: { w: 1, h: 1 }, runtime: { conn, entities: todoEntities(7), openDetails } });
    expect(await screen.findByText('1 da fare')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Apri la lista Da ricordare' }));
    expect(openDetails).toHaveBeenCalledWith('todo_card_legacy');
  });
  it('l’errore di lettura esclude sia skeleton sia messaggio vuoto e offre retry di sola lettura', async () => {
    const { conn, sendMessagePromise } = fakeConnection(() => { throw new Error('down'); });
    const callService = vi.fn();
    renderDetails(todoWidget, { id: 'todo_card_1', settings: { todoEntityId: 'todo.a' },
      runtime: { conn, entities: todoEntities(7), callService } });
    await screen.findByText('Non riesco a leggere la lista.');
    expect(screen.queryByText(/Nessuna attività/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Caricamento delle attività…')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));
    await waitFor(() => expect(sendMessagePromise).toHaveBeenCalledTimes(4));
    expect(callService).not.toHaveBeenCalled();
  });
});

describe('Agenda · UI del calendario', () => {
  it('il default segue un nuovo binding senza creare una preferenza al montaggio', async () => {
    const { conn, sendMessagePromise } = fakeConnection((message) => {
      const target = message.target as { entity_id: string[] };
      return { response: Object.fromEntries(target.entity_id.map((id) => [id, { events: [] }])) };
    });
    const { update } = renderDetails(calendarWidget, { id: 'calendar_card_1', settings: { calendars: ['calendar.a'] },
      runtime: { conn, entities: calendars } });
    await screen.findByText('Nessun evento nei prossimi 30 giorni.');
    expect(localStorage.getItem(CALENDAR_SELECTION_KEY)).toBeNull();
    update({ id: 'calendar_card_1', settings: { calendars: ['calendar.b'] }, runtime: { conn, entities: calendars } });
    await waitFor(() => expect(sendMessagePromise).toHaveBeenLastCalledWith(expect.objectContaining({
      target: { entity_id: ['calendar.b'] },
    })));
    expect(localStorage.getItem(CALENDAR_SELECTION_KEY)).toBeNull();
  });
  it('una scelta umana persiste e prevale sui successivi binding e sulla riapertura', async () => {
    const { conn, sendMessagePromise } = fakeConnection((message) => {
      const target = message.target as { entity_id: string[] };
      return { response: Object.fromEntries(target.entity_id.map((id) => [id, { events: [] }])) };
    });
    const { update } = renderDetails(calendarWidget, { id: 'calendar_card_1', settings: { calendars: ['calendar.a'] },
      runtime: { conn, entities: calendars } });
    await screen.findByText('Nessun evento nei prossimi 30 giorni.');
    fireEvent.click(screen.getByRole('button', { name: 'Scegli i calendari' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lavoro' }));
    expect(JSON.parse(localStorage.getItem(CALENDAR_SELECTION_KEY) ?? 'null')).toEqual(['calendar.a', 'calendar.b']);
    update({ id: 'calendar_card_1', settings: { calendars: ['calendar.b'] }, runtime: { conn, entities: calendars } });
    expect(screen.getByRole('button', { name: 'Famiglia' })).toHaveAttribute('aria-pressed', 'true');
    cleanup(); sendMessagePromise.mockClear();
    renderDetails(calendarWidget, { id: 'calendar_card_1', settings: { calendars: ['calendar.b'] },
      runtime: { conn, entities: calendars } });
    await screen.findByText('Nessun evento nei prossimi 30 giorni.');
    expect(sendMessagePromise.mock.calls[0]?.[0]).toMatchObject({ target: { entity_id: ['calendar.a', 'calendar.b'] } });
  });
  it('default dettagli usa la fonte associata e la preferenza globale esplicita conserva la precedenza', async () => {
    const { conn, sendMessagePromise } = fakeConnection((message) => {
      const target = message.target as { entity_id: string[] };
      return { response: Object.fromEntries(target.entity_id.map((id) => [id, { events: [] }])) };
    });
    renderDetails(calendarWidget, { id: 'calendar_card_1', settings: { calendars: ['calendar.a'] },
      runtime: { conn, entities: calendars } });
    await screen.findByText('Nessun evento nei prossimi 30 giorni.');
    expect(sendMessagePromise.mock.calls[0]?.[0]).toMatchObject({ target: { entity_id: ['calendar.a'] } });
    cleanup(); localStorage.setItem(CALENDAR_SELECTION_KEY, JSON.stringify(['calendar.b']));
    sendMessagePromise.mockClear();
    renderDetails(calendarWidget, { id: 'calendar_card_1', settings: { calendars: ['calendar.a'] },
      runtime: { conn, entities: calendars } });
    await screen.findByText('Nessun evento nei prossimi 30 giorni.');
    expect(sendMessagePromise.mock.calls[0]?.[0]).toMatchObject({ target: { entity_id: ['calendar.b'] } });
  });
  it('su un evento di più giorni mostra solo i giorni effettivamente compresi', async () => {
    const { conn } = fakeConnection(() => ({ response: { 'calendar.a': { events: [
      { summary: 'Viaggio', start: '2026-11-12', end: '2026-11-14' },
    ] } } }));
    renderDetails(calendarWidget, { id: 'calendar_card_1', settings: { calendars: ['calendar.a'] },
      runtime: { conn, entities: calendars } });
    expect(await screen.findByRole('region', { name: 'Oggi' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Domani' })).toBeInTheDocument();
    expect(screen.getAllByText('Viaggio')).toHaveLength(2);
    expect(screen.queryByRole('region', { name: /Sabato/ })).not.toBeInTheDocument();
  });
  it('fonte non più disponibile rimane dichiarata senza inventare eventi', () => {
    renderWidget(calendarWidget, { id: 'calendar_card_old', settings: { calendars: ['calendar.removed'] },
      runtime: { entities: calendars } });
    expect(screen.getByText('Un calendario associato non è più disponibile.')).toBeInTheDocument();
    expect(screen.queryByText(/Nessun evento/)).not.toBeInTheDocument();
  });
});

describe('Agenda · associazione con riscontro del callback condiviso', () => {
  it('calendari: la scelta multipla è atomica e attende l’ACK', async () => {
    const operation = deferred(), saveBinding = vi.fn(() => operation.promise);
    const { conn } = fakeConnection(() => []);
    render(<WidgetRuntimeProvider value={createFixtureRuntime({ conn, entities: calendars })}>
      <AgendaBindingSection kind="calendar" settings={{ calendars: ['calendar.a'] }} saveBinding={saveBinding} />
    </WidgetRuntimeProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Lavoro' }));
    expect(saveBinding).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Applica i calendari' }));
    expect(saveBinding).toHaveBeenCalledWith({ calendars: ['calendar.a', 'calendar.b'] });
    expect(screen.getByRole('status')).toHaveTextContent('Associazione in corso.');
    expect(screen.getByRole('button', { name: 'Lavoro' })).toBeDisabled();
    await act(async () => operation.resolve());
    expect(screen.queryByText('Associazione in corso.')).not.toBeInTheDocument();
  });
  it('rifiuto: conserva il draft e rende disponibile la ripetizione esplicita dell’associazione', async () => {
    const saveBinding = vi.fn(async () => { throw new Error('no ACK'); });
    const { conn } = fakeConnection(() => []);
    render(<WidgetRuntimeProvider value={createFixtureRuntime({ conn, entities: calendars })}>
      <AgendaBindingSection kind="calendar" settings={{ calendars: ['calendar.a'] }} saveBinding={saveBinding} />
    </WidgetRuntimeProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Lavoro' }));
    fireEvent.click(screen.getByRole('button', { name: 'Applica i calendari' }));
    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: 'Lavoro' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Applica i calendari' })).toBeEnabled();
    expect(saveBinding).toHaveBeenCalledTimes(1);
  });
  it('il collegamento storico mancante è recuperabile senza cancellarlo al montaggio', async () => {
    const saveBinding = vi.fn(), { conn } = fakeConnection(() => []);
    render(<WidgetRuntimeProvider value={createFixtureRuntime({ conn, entities: todoEntities(7) })}>
      <AgendaBindingSection kind="todo" settings={{ todoEntityId: 'todo.removed' }} saveBinding={saveBinding} />
    </WidgetRuntimeProvider>);
    expect(screen.getByText(/La lista precedente/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Lista di attività:/ }));
    expect(screen.getByRole('button', { name: 'Removed' })).toHaveAttribute('aria-pressed', 'true');
    expect(saveBinding).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Non collegata' }));
    await waitFor(() => expect(saveBinding).toHaveBeenCalledWith({ todoEntityId: null }));
  });
});
