import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CardSettings } from '@/@types/dashboard';
import type { ClientSession } from '@/api/clientSession';
import { setClientSession } from '@/api/clientSession';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { PageVisibilityContext } from '@/hooks/launcher/PageVisibilityContext';
import { AgendaBindingSection, type SaveAgendaBinding } from '@/templates/sheets/AgendaBindingSection';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection } from './ComfortHarness';

const liveFixture = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  const owner = { profile: 'profile-a', editor: 'editor-a' };
  const coordinator = {
    snapshot: () => ({ profile: { id: owner.profile }, editor: { id: owner.editor } }),
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
  return { active: false, owner, live: { coordinator }, change: (profile: string, editor: string) => {
    owner.profile = profile; owner.editor = editor; listeners.forEach((listener) => listener());
  } };
});
vi.mock('@/hooks/liveProfiles/LiveProfilesContext', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/hooks/liveProfiles/LiveProfilesContext')>(),
  useOptionalLiveProfiles: () => liveFixture.active ? liveFixture.live : null,
}));

const entities = fixtureEntities([
  fixtureEntity('calendar.a', 'off', { friendly_name: 'Famiglia' }),
  fixtureEntity('calendar.b', 'off', { friendly_name: 'Lavoro' }),
  fixtureEntity('todo.a', '1', { friendly_name: 'Lista A' }),
  fixtureEntity('todo.b', '1', { friendly_name: 'Lista B' }),
]);
function deferred() {
  let resolve!: () => void, reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function fixture() {
  const { conn } = fakeConnection(() => []);
  const frame = (resourceKey: string, settings: CardSettings, callback: SaveAgendaBinding,
    options: { kind?: 'calendar' | 'todo'; visible?: boolean; connection?: typeof conn } = {}) => (
    <WidgetRuntimeProvider value={createFixtureRuntime({ entities, conn: options.connection ?? conn })}>
      <PageVisibilityContext.Provider value={options.visible ?? true}>
        <AgendaBindingSection resourceKey={resourceKey} kind={options.kind ?? 'calendar'} settings={settings} saveBinding={callback} />
      </PageVisibilityContext.Provider>
    </WidgetRuntimeProvider>
  );
  return { conn, frame };
}
function selectCalendarB() {
  fireEvent.click(screen.getByRole('button', { name: 'Lavoro' }));
  fireEvent.click(screen.getByRole('button', { name: 'Applica i calendari' }));
}
const initial = { calendars: ['calendar.a'] };
const selected = { calendars: ['calendar.a', 'calendar.b'] };
const changed = /Il contesto è cambiato/;
beforeEach(() => { setClientSession(null); liveFixture.active = false; liveFixture.change('profile-a', 'editor-a'); });
afterEach(() => { cleanup(); setClientSession(null); });

describe('Agenda · associazione, contesto e callback', () => {
  it('il rifiuto conserva scelta ed errore nello stesso contesto e il retry usa il callback attuale', async () => {
    const { frame } = fixture();
    const first = vi.fn(async () => { throw new Error('rejected'); });
    const second = vi.fn(async () => undefined);
    const view = render(frame('widget-a', initial, first));
    selectCalendarB();
    expect(await screen.findByRole('alert')).toHaveTextContent('La scelta è conservata.');
    view.rerender(frame('widget-a', { ...initial }, second));
    expect(screen.getByRole('alert')).toHaveTextContent('La scelta è conservata.');
    expect(screen.getByRole('button', { name: 'Lavoro' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Applica i calendari' }));
    await waitFor(() => expect(second).toHaveBeenCalledWith(selected));
    expect(first).toHaveBeenCalledTimes(1);
  });
  it('adotta solo il proprio esatto target ottimistico prima del vero ACK', async () => {
    const { frame } = fixture(), pending = deferred();
    const first = vi.fn(() => pending.promise), replacement = vi.fn(async () => undefined);
    const view = render(frame('widget-a', initial, first));
    selectCalendarB();
    view.rerender(frame('widget-a', selected, replacement));
    expect(screen.getByRole('button', { name: 'Famiglia' })).toBeDisabled();
    await act(async () => pending.resolve());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Applica i calendari' })).toBeDisabled();
    expect(replacement).not.toHaveBeenCalled();
  });
  it('una bozza ottimistica e un rifiuto nella stessa microtask non cancellano l’errore o il retry', async () => {
    const { conn } = fixture();
    const callback = vi.fn();
    function OptimisticHarness() {
      const [settings, setSettings] = useState<CardSettings>(initial);
      const save: SaveAgendaBinding = async (patch) => {
        callback(patch); setSettings((current) => ({ ...current, ...patch }));
        throw new Error('ACK rejected');
      };
      return <WidgetRuntimeProvider value={createFixtureRuntime({ entities, conn })}>
        <AgendaBindingSection resourceKey="widget-a" kind="calendar" settings={settings} saveBinding={save} />
      </WidgetRuntimeProvider>;
    }
    render(<OptimisticHarness />);
    selectCalendarB();
    expect(await screen.findByRole('alert')).toHaveTextContent('La scelta è conservata.');
    expect(screen.getByRole('button', { name: 'Applica i calendari' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Lavoro' })).toHaveAttribute('aria-pressed', 'true');
    expect(callback).toHaveBeenCalledTimes(1);
  });
  it('un’altra fonte riallinea il draft e un completamento obsoleto non viene confermato', async () => {
    const { frame } = fixture(), pending = deferred();
    const first = vi.fn(() => pending.promise), replacement = vi.fn(async () => undefined);
    const view = render(frame('widget-a', initial, first));
    selectCalendarB();
    view.rerender(frame('widget-a', { calendars: ['calendar.b'] }, replacement));
    expect(screen.getByRole('button', { name: 'Famiglia' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Lavoro' })).toHaveAttribute('aria-pressed', 'true');
    await act(async () => pending.resolve());
    expect(screen.getByRole('alert')).toHaveTextContent(changed);
    fireEvent.click(screen.getByRole('button', { name: 'Applica i calendari' }));
    await waitFor(() => expect(replacement).toHaveBeenCalledWith({ calendars: ['calendar.b'] }));
    expect(first).toHaveBeenCalledWith(selected);
    expect(first).toHaveBeenCalledTimes(1);
  });
  it('A → B → A della risorsa non riporta la vecchia selezione o il vecchio ACK', async () => {
    const { frame } = fixture(), pending = deferred();
    const first = vi.fn(() => pending.promise), replacement = vi.fn(async () => undefined);
    const view = render(frame('widget-a', initial, first));
    selectCalendarB();
    view.rerender(frame('widget-b', { calendars: ['calendar.b'] }, replacement));
    view.rerender(frame('widget-a', initial, replacement));
    expect(screen.getByRole('button', { name: 'Lavoro' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Applica i calendari' })).toBeDisabled();
    await act(async () => pending.resolve());
    expect(screen.getByRole('alert')).toHaveTextContent(changed);
    fireEvent.click(screen.getByRole('button', { name: 'Applica i calendari' }));
    await waitFor(() => expect(replacement).toHaveBeenCalledWith(initial));
    expect(first).toHaveBeenCalledTimes(1);
  });
  it('A → B → A delle fonti resta obsoleto anche se B era il target della bozza', async () => {
    const { frame } = fixture(), pending = deferred();
    const first = vi.fn(() => pending.promise);
    const view = render(frame('widget-a', initial, first));
    selectCalendarB();
    view.rerender(frame('widget-a', selected, first));
    view.rerender(frame('widget-a', initial, first));
    await act(async () => pending.resolve());
    expect(screen.getByRole('alert')).toHaveTextContent(changed);
    expect(screen.getByRole('button', { name: 'Lavoro' })).toHaveAttribute('aria-pressed', 'false');
    expect(first).toHaveBeenCalledTimes(1);
  });
  it('un callback sostituito prima del gesto non lascia una closure che scrive con quello vecchio', async () => {
    const { frame } = fixture();
    const first = vi.fn(async () => undefined), replacement = vi.fn(async () => undefined);
    const view = render(frame('widget-a', initial, first));
    fireEvent.click(screen.getByRole('button', { name: 'Lavoro' }));
    view.rerender(frame('widget-a', initial, replacement));
    fireEvent.click(screen.getByRole('button', { name: 'Applica i calendari' }));
    await waitFor(() => expect(replacement).toHaveBeenCalledWith(selected));
    expect(first).not.toHaveBeenCalled();
  });
  it('un cambio connessione ABA non trasforma il vecchio completamento in conferma', async () => {
    const { frame, conn } = fixture(), other = fakeConnection(() => []).conn, pending = deferred();
    const callback = vi.fn(() => pending.promise);
    const view = render(frame('widget-a', initial, callback));
    selectCalendarB();
    view.rerender(frame('widget-a', initial, callback, { connection: other }));
    view.rerender(frame('widget-a', initial, callback, { connection: conn }));
    await act(async () => pending.resolve());
    expect(screen.getByRole('alert')).toHaveTextContent(changed);
    expect(screen.getByRole('button', { name: 'Lavoro' })).toHaveAttribute('aria-pressed', 'false');
    expect(callback).toHaveBeenCalledTimes(1);
  });
  it('hide/show invalida la conferma e conserva la scelta locale nello stesso contesto', async () => {
    const { frame } = fixture(), pending = deferred();
    const callback = vi.fn(() => pending.promise);
    const view = render(frame('widget-a', initial, callback));
    selectCalendarB();
    view.rerender(frame('widget-a', initial, callback, { visible: false }));
    view.rerender(frame('widget-a', initial, callback, { visible: true }));
    await act(async () => pending.resolve());
    expect(screen.getByRole('alert')).toHaveTextContent(changed);
    expect(screen.getByRole('button', { name: 'Lavoro' })).toHaveAttribute('aria-pressed', 'true');
    expect(callback).toHaveBeenCalledTimes(1);
  });
  it('un account ABA riallinea la scelta e impedisce una conferma tardiva', async () => {
    const { frame } = fixture(), pending = deferred();
    const callback = vi.fn(() => pending.promise);
    const session = (id: string) => ({ houseId: 'house', user: { id, name: id },
      client: { id: 'client', userId: id, label: 'test', platform: 'web' } } as ClientSession);
    act(() => setClientSession(session('a')));
    render(frame('widget-a', initial, callback)); selectCalendarB();
    act(() => setClientSession(session('b')));
    act(() => setClientSession(session('a')));
    await act(async () => pending.resolve());
    expect(screen.getByRole('alert')).toHaveTextContent(changed);
    expect(screen.getByRole('button', { name: 'Lavoro' })).toHaveAttribute('aria-pressed', 'false');
    expect(callback).toHaveBeenCalledTimes(1);
  });
  it('anche un proprietario profilo/editor ABA nella stessa act invalida l’operazione', async () => {
    liveFixture.active = true;
    const { frame } = fixture(), pending = deferred(), callback = vi.fn(() => pending.promise);
    render(frame('widget-a', initial, callback)); selectCalendarB();
    await act(async () => {
      liveFixture.change('profile-b', 'editor-b');
      liveFixture.change('profile-a', 'editor-a');
      pending.resolve();
      await pending.promise;
    });
    expect(screen.getByRole('alert')).toHaveTextContent(changed);
    expect(screen.getByRole('button', { name: 'Lavoro' })).toHaveAttribute('aria-pressed', 'false');
    expect(callback).toHaveBeenCalledTimes(1);
  });
  it('Todo conserva la scelta rifiutata e il retry esplicito usa la stessa lista, non nessuna', async () => {
    const { frame } = fixture();
    const first = vi.fn(async () => { throw new Error('rejected'); });
    const replacement = vi.fn(async () => undefined);
    const view = render(frame('widget-todo', { todoEntityId: 'todo.a' }, first, { kind: 'todo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lista di attività: Lista A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lista B' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('La scelta è conservata.');
    view.rerender(frame('widget-todo', { todoEntityId: 'todo.a' }, replacement, { kind: 'todo' }));
    expect(screen.getByRole('button', { name: 'Lista di attività: Lista B' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Riprova associazione' }));
    await waitFor(() => expect(replacement).toHaveBeenCalledWith({ todoEntityId: 'todo.b' }));
    expect(first).toHaveBeenCalledTimes(1);
  });
  it('un errore concluso resta nel proprio contesto e non passa al widget successivo', async () => {
    const { frame } = fixture();
    const first = vi.fn(async () => { throw new Error('rejected'); });
    const view = render(frame('widget-a', initial, first)); selectCalendarB();
    await screen.findByRole('alert');
    view.rerender(frame('widget-b', { calendars: ['calendar.b'] }, first));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Famiglia' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Lavoro' })).toHaveAttribute('aria-pressed', 'true');
  });
});
