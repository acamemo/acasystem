import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect, useState, type ReactNode } from 'react';
import { LiveProfilesProvider, useLiveProfiles } from '@/hooks/liveProfiles/LiveProfilesContext';
import { applyAppearance, readAppearance } from '@/utils/appearance';
import { applySnapshot } from '@/api/snapshot';
import type { ClientSession } from '@/api/clientSession';

const fake = vi.hoisted(() => ({
  create: vi.fn(),
  engine: {
    snapshot: vi.fn(),
    subscribe: () => () => undefined,
    start: vi.fn(async () => undefined),
    dispose: vi.fn(),
    begin: vi.fn(),
    promote: vi.fn(),
    update: vi.fn(),
    updateSessionMetadata: vi.fn(),
    retryUsage: vi.fn(async () => undefined),
    save: vi.fn(async () => true),
    close: vi.fn(async () => undefined),
    refresh: vi.fn(async () => undefined),
  },
}));
vi.mock('@/hooks/liveProfiles/coordinator', () => ({
  LiveProfileCoordinator: class {
    constructor() {
      return fake.create();
    }
  },
}));
vi.mock('@/hooks/context/PageContext', () => ({
  usePages: () => ({}),
  PageContextOverride: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@/api/snapshot', () => ({
  applySnapshot: vi.fn(),
  collectSnapshot: () => ({ version: 1, layout: {} }),
}));
vi.mock('@/hooks/launcher/useViewport', () => ({ useDeviceClass: () => 'tablet' }));

describe('applicazione del profilo senza riscritture dell’aspetto', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    fake.create.mockReturnValue(fake.engine);
  });
  it('il gate d’uso mostra il testo richiesto senza montare i widget, e permette di riprovare', () => {
    fake.engine.snapshot.mockReturnValue({
      status: 'ready',
      profile: { id: 'profile', configuration: { snapshot: { layout: {} } } },
      editor: null,
      usageStatus: 'blocked',
      offline: false,
      error: '',
      canUndo: false,
    });
    const child = vi.fn(() => <p>Widget della casa</p>);
    const session = {
      houseId: 'house',
      user: { id: 'user', name: 'Utente' },
      client: { id: 'client', label: 'PC' },
    } as ClientSession;
    const Child = child;
    render(
      <LiveProfilesProvider session={session}>
        <Child />
      </LiveProfilesProvider>
    );
    expect(
      screen.getByText(
        'questo profilo è in uso su un altro dispositivo chiudi le altre sessioni per usare questo dispositivo'
      )
    ).toBeInTheDocument();
    expect(child).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));
    expect(fake.engine.retryUsage).toHaveBeenCalledOnce();
  });
  it('aggiornare avatar, nome client e activeProfileId mantiene coordinatore, editor e stato della schermata account', () => {
    const configuration = {
      snapshot: { layout: {} },
      appearance: { theme: 'light', accent: 'violet', wallpaper: 'none' },
    };
    const editor = {
      id: 'edit-session',
      target: { kind: 'widget' },
      base: { configuration },
      working: configuration,
    };
    const state = {
      status: 'ready',
      profile: { id: 'profile', name: 'Casa', configuration },
      editor,
      offline: false,
      error: '',
      canUndo: false,
    };
    fake.engine.snapshot.mockReturnValue(state);
    fake.create
      .mockImplementationOnce(() => fake.engine)
      .mockImplementation(() => ({
        ...fake.engine,
        snapshot: () => ({
          ...state,
          status: 'loading',
          profile: null,
          editor: null,
          sources: [],
          profiles: [],
          clientName: 'PC',
        }),
      }));
    const mounted = vi.fn();
    function AccountProbe() {
      const live = useLiveProfiles(),
        [open, setOpen] = useState(false);
      useEffect(() => {
        mounted();
      }, []);
      return (
        <button onClick={() => setOpen(true)}>
          {open ? 'Account aperto' : 'Apri account'} · {live.state.editor?.id}
        </button>
      );
    }
    const session = {
      houseId: 'house',
      user: { id: 'user', name: 'Ada', color: '#123456' },
      client: { id: 'client', label: 'PC', activeProfileId: 'profile' },
    } as ClientSession;
    const view = render(
      <LiveProfilesProvider session={session}>
        <AccountProbe />
      </LiveProfilesProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: /Apri account/ }));
    const updated = {
      ...session,
      user: { ...session.user, color: '#abcdef' },
      client: { ...session.client, label: 'Studio', activeProfileId: 'other' },
    };
    view.rerender(
      <LiveProfilesProvider session={updated}>
        <AccountProbe />
      </LiveProfilesProvider>
    );
    expect(
      screen.getByRole('button', { name: 'Account aperto · edit-session' })
    ).toBeInTheDocument();
    expect(fake.create).toHaveBeenCalledOnce();
    expect(fake.engine.start).toHaveBeenCalledOnce();
    expect(fake.engine.dispose).not.toHaveBeenCalled();
    expect(mounted).toHaveBeenCalledOnce();
    expect(fake.engine.updateSessionMetadata).toHaveBeenLastCalledWith(updated);
    expect(fake.engine.snapshot().editor).toBe(editor);
    expect(fake.engine.update).not.toHaveBeenCalled();
  });
  it('una modifica effettiva abilita il checkpoint automatico, senza scrivere alla sola apertura', async () => {
    const configuration = { snapshot: { layout: {} } };
    fake.engine.snapshot.mockReturnValue({
      status: 'ready',
      profile: { id: 'profile', configuration },
      editor: null,
      offline: false,
      error: '',
      canUndo: false,
    });
    fake.engine.begin.mockResolvedValue(undefined);
    fake.engine.update.mockResolvedValue(undefined);
    const session = {
      houseId: 'house',
      user: { id: 'user', name: 'Ada' },
      client: { id: 'client' },
    } as ClientSession;
    function Probe() {
      const { mutate } = useLiveProfiles();
      return (
        <button
          onClick={() => void mutate((value) => ({ ...value, snapshot: { layout: { headerTitle: 'Casa' } } }))}
        >
          Rinomina pagina
        </button>
      );
    }
    render(
      <LiveProfilesProvider session={session}>
        <Probe />
      </LiveProfilesProvider>
    );
    expect(fake.engine.update).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Rinomina pagina' }));
    await waitFor(() =>
      expect(fake.engine.update).toHaveBeenCalledWith(expect.any(Function), { autosave: true })
    );
    expect(fake.engine.begin).toHaveBeenCalledWith(
      { kind: 'structure' },
      'Disposizione del profilo',
      { transient: true }
    );
  });
  it('ignora l’aspetto storico e gli eventi obsoleti senza acquisire lease o modificare il profilo', () => {
    const accepted = {
      theme: 'dark' as const,
      accent: 'cyan' as const,
      wallpaper: 'notte' as const,
    };
    const state = {
      status: 'ready',
      profile: {
        id: 'profile',
        name: 'Casa',
        configuration: { snapshot: { layout: {} }, appearance: accepted },
      },
      editor: null,
      offline: false,
      error: '',
      canUndo: false,
    };
    fake.engine.snapshot.mockReturnValue(state);
    const raw = '{"theme":"dark","accent":"orange","wallpaper":"photo","wallpaperHue":30}';
    localStorage.setItem('aca_appearance', raw);
    const session = {
      houseId: 'house',
      user: { id: 'user', name: 'Ada' },
      client: { id: 'client' },
    } as ClientSession;
    const rendered = render(
      <LiveProfilesProvider session={session}>
        <div>App</div>
      </LiveProfilesProvider>
    );
    act(() => {
      window.dispatchEvent(new Event('acasystem:appearance-changed'));
      applyAppearance({ theme: 'auto', accent: 'red', wallpaper: 'photo' });
    });
    const refreshed = {
      ...state,
      profile: {
        ...state.profile,
        configuration: { snapshot: { layout: { headerTitle: 'Da un altro dispositivo' } }, appearance: accepted },
      },
    };
    fake.engine.snapshot.mockReturnValue(refreshed);
    rendered.rerender(<LiveProfilesProvider session={session}><div>App</div></LiveProfilesProvider>);
    expect(applySnapshot).toHaveBeenLastCalledWith(refreshed.profile.configuration.snapshot, {}, { authoritative: true });
    expect(readAppearance()).toEqual({ theme: 'light', accent: 'violet', wallpaper: 'none' });
    expect(localStorage.getItem('aca_appearance')).toBe(raw);
    expect(refreshed.profile.configuration.appearance).toBe(accepted);
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement.dataset.accent).toBeUndefined();
    expect(document.documentElement.dataset.wallpaper).toBeUndefined();
    expect(fake.engine.begin).not.toHaveBeenCalled();
    expect(fake.engine.update).not.toHaveBeenCalled();
    expect(state.editor).toBeNull();
  });
});


describe('avvisi del profilo senza conferma persistente', () => {
  const configuration = { snapshot: { layout: { headerTitle: 'Casa' } } };
  const session = {
    houseId: 'house', user: { id: 'user', name: 'Ada' }, client: { id: 'client', label: 'PC' },
  } as ClientSession;
  const readyState = (editor: Record<string, unknown> = {}, state: Record<string, unknown> = {}) => ({
    status: 'ready', usageStatus: 'active',
    profile: { id: 'profile', name: 'Casa', configuration },
    editor: { id: 'editor', draftId: 'draft', target: { kind: 'structure' },
      base: { configuration }, working: configuration, busy: false, error: '',
      conflict: null, quotaBlocked: false, ...editor },
    offline: false, saving: false, error: '', canUndo: false, ...state,
  });
  beforeEach(() => {
    localStorage.clear(); vi.clearAllMocks(); fake.create.mockReturnValue(fake.engine);
  });

  it('lascia vuoto il chrome quando tutto è salvato, senza rimontare il contenuto o scrivere', () => {
    fake.engine.snapshot.mockReturnValue(readyState());
    const content = <input aria-label="Bozza locale" defaultValue="" />;
    const app = () => <LiveProfilesProvider session={session}>{content}</LiveProfilesProvider>;
    const view = render(app());
    const draft = screen.getByLabelText('Bozza locale');
    fireEvent.change(draft, { target: { value: 'Contenuto ancora aperto' } });
    expect(screen.queryByRole('region', { name: 'Sincronizzazione del profilo' })).toBeNull();
    expect(screen.queryByText('Sincronizzato')).toBeNull();
    expect(view.container.querySelector('.aca-live-chrome')).toBeEmptyDOMElement();
    fake.engine.snapshot.mockReturnValue(readyState({
      working: { snapshot: { layout: { headerTitle: 'Cucina' } } },
    }));
    view.rerender(app());
    expect(screen.getByText('Modifiche in attesa')).toBeInTheDocument();
    fake.engine.snapshot.mockReturnValue(readyState()); view.rerender(app());
    expect(view.container.querySelector('.aca-live-chrome')).toBeEmptyDOMElement();
    expect(screen.getByLabelText('Bozza locale')).toBe(draft);
    expect(draft).toHaveValue('Contenuto ancora aperto');
    expect(fake.engine.begin).not.toHaveBeenCalled(); expect(fake.engine.update).not.toHaveBeenCalled();
    expect(fake.engine.save).not.toHaveBeenCalled();
  });

  const warnings: [string, Record<string, unknown>, Record<string, unknown>][] = [
    ['offline', {}, { offline: true }], ['salvataggio', {}, { saving: true }],
    ['operazione in corso', { busy: true }, {}], ['errore', { error: 'Riserva scaduta' }, {}],
    ['quota piena', { quotaBlocked: true }, {}], ['conflitto', { conflict: { configuration } }, {}],
    ['operazione da riconciliare', { pendingOperation: { id: 'pending' } }, {}],
  ];
  it.each(warnings)('mantiene visibile l’avviso %s anche senza nuove differenze', (_name, editor, state) => {
    fake.engine.snapshot.mockReturnValue(readyState(editor, state));
    render(<LiveProfilesProvider session={session}><p>App</p></LiveProfilesProvider>);
    expect(screen.getByRole('region', { name: 'Sincronizzazione del profilo' })).toBeInTheDocument();
    if (state.offline) expect(screen.getByText('Offline · bozza sul dispositivo')).toBeInTheDocument();
    if (state.saving) expect(screen.getByText('Sincronizzazione…')).toBeInTheDocument();
    if (editor.quotaBlocked) expect(screen.getByRole('button', { name: 'Esporta la bozza in memoria' })).toBeInTheDocument();
    if (editor.conflict) {
      expect(screen.getByRole('button', { name: 'Usa versione attuale' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Usa la mia bozza' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Crea copia indipendente' })).toBeInTheDocument();
    }
  });

  it('conserva riprova e scarto della bozza quando la sincronizzazione fallisce', () => {
    fake.engine.snapshot.mockReturnValue(readyState({ error: 'Riserva scaduta' }));
    render(<LiveProfilesProvider session={session}><p>App</p></LiveProfilesProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Riprova sincronizzazione' }));
    expect(fake.engine.save).toHaveBeenCalledWith({ keepOpen: true });
    fireEvent.click(screen.getByRole('button', { name: 'Scarta bozza non sincronizzata' }));
    expect(fake.engine.close).toHaveBeenCalledWith(true);
  });

  it('mantiene l’errore generale e il suo riprova anche con un editor già salvato', () => {
    fake.engine.snapshot.mockReturnValue(readyState({}, { error: 'La centrale non risponde' }));
    render(<LiveProfilesProvider session={session}><p>App</p></LiveProfilesProvider>);
    expect(screen.getByText('La centrale non risponde')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Sincronizzazione del profilo' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));
    expect(fake.engine.refresh).toHaveBeenCalledOnce();
  });
});
