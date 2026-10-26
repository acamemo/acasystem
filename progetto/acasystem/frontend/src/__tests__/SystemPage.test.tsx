import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PagesConfig, StatusPillConfig } from '@/@types/dashboard';
import type { LauncherApi } from '@/@types/launcher';
import { getClientId, getHassUrl } from '@/api/haUrl';
import { saveTokens } from '@/api/oauthStorage';
import { Casa3dHouseContext } from '@/casa3d/houseContext';
import { ConnectPageControlProvider } from '@/hooks/context/ConfigContext';
import { LauncherProvider } from '@/hooks/launcher/LauncherContext';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { SystemPage } from '@/pages/system';

const mocks = vi.hoisted(() => ({
  pages: {} as Record<string, unknown>,
  config: {} as Record<string, unknown>,
  setConfig: vi.fn(),
  meta: {} as Record<string, unknown>,
  fetchProfiles: vi.fn(),
  createProfile: vi.fn(),
  updateProfile: vi.fn(),
  deleteProfile: vi.fn(),
  createConnection: vi.fn(),
}));

vi.mock('@/hooks/context', () => ({
  usePages: () => mocks.pages,
  useConfig: () => ({ config: mocks.config, setConfig: mocks.setConfig }),
  useHomeAssistantMeta: () => mocks.meta,
  useHomeAssistantEntities: () =>
    fixtureEntities([
      fixtureEntity('person.anna', 'home', { friendly_name: 'Anna' }),
      fixtureEntity('person.marco', 'not_home', { friendly_name: 'Marco' }),
      fixtureEntity('sensor.temperatura', '21', { friendly_name: 'Temperatura' }),
    ]),
}));

vi.mock('@/api/profileApi', () => ({
  fetchProfiles: mocks.fetchProfiles,
  createProfile: mocks.createProfile,
  updateProfile: mocks.updateProfile,
  deleteProfile: mocks.deleteProfile,
}));

vi.mock('home-assistant-js-websocket', async (importOriginal) => ({
  ...(await importOriginal<typeof import('home-assistant-js-websocket')>()),
  createConnection: mocks.createConnection,
}));

// The background sync talks to the backend; the profiles UI does not need it here.
vi.mock('@/hooks/useSettingsSync', () => ({ useSettingsSync: () => ({ status: 'idle' }) }));

// Shared snapshot setters of the launcher: the page context functions, layout included.
vi.mock('@/hooks/launcher/useSnapshotSetters', () => ({ useSnapshotSetters: () => mocks.pages }));

const profileData = {
  version: 1,
  layout: {
    pagesConfig: { header: [], pages: ['home', 'studio'], home: ['light.a'], studio: [] },
    cardSettings: {},
  },
  appearance: { theme: 'dark', language: 'en', bgMode: 'image' },
};

function makePages() {
  const pagesConfig: PagesConfig = { pages: ['home'], header: ['person.anna'], home: [] };
  const statusPillsConfig: StatusPillConfig[] = [
    { id: 'pill_1', type: 'conditional', entityId: 'sensor.temperatura', visible: true },
  ];
  return {
    pagesConfig,
    persistConfig: vi.fn(),
    persistCardSettings: vi.fn(),
    persistPageSettings: vi.fn(),
    persistCustomNames: vi.fn(),
    persistCustomIcons: vi.fn(),
    saveStatusPillsConfig: vi.fn(),
    statusPillsConfig,
    setGridColumns: vi.fn(),
    setDynamicGridColumns: vi.fn(),
    setGridGapH: vi.fn(),
    setGridGapV: vi.fn(),
    setCardBorderRadius: vi.fn(),
    updateCardsOnlyMode: vi.fn(),
    updateHeaderScale: vi.fn(),
    headerTitle: 'Casa',
    updateHeaderTitle: vi.fn(),
    headerSettings: { showTitle: true, showClock: true },
    updateHeaderSettings: vi.fn(),
    updateSectionSpacing: vi.fn(),
    launcherLayout: {
      version: 1,
      cover: { enabled: true },
      pages: [{ id: 'home', label: 'Principale', kind: 'widgets', placements: {} }],
    },
    persistLauncherLayout: vi.fn(),
  };
}

function createLauncherMock(): LauncherApi {
  return {
    layout: { version: 1, cover: { enabled: true }, pages: [] },
    grids: {
      phone: { w: 4, h: 6 },
      phoneLandscape: { w: 6, h: 2 },
      tabletPortrait: { w: 6, h: 8 },
      tablet: { w: 8, h: 5 },
    },
    deviceClass: 'tablet',
    currentPage: 0,
    goToPage: vi.fn(),
    editMode: false,
    setEditMode: vi.fn(),
    setOverview: vi.fn(),
    placeWidget: vi.fn(),
    moveWidget: vi.fn(() => true),
    resizeWidget: vi.fn(() => true),
    removeWidget: vi.fn(),
    addPage: vi.fn(() => 'nuova'),
    updatePage: vi.fn(),
    removePage: vi.fn(),
    reorderPages: vi.fn(),
    setCoverEnabled: vi.fn(),
    restoreLayout: vi.fn(),
    setLayoutOptions: vi.fn(),
    stackWidgets: vi.fn(() => null),
    unstackWidget: vi.fn(),
    setStackRotate: vi.fn(),
  };
}

function renderSystem(
  launcher = createLauncherMock(),
  onClose = vi.fn(),
  control = { open: vi.fn(), cancel: null }
) {
  render(
    <ConnectPageControlProvider value={control}>
      <LauncherProvider value={launcher}>
        <SystemPage onClose={onClose} />
      </LauncherProvider>
    </ConnectPageControlProvider>
  );
  return { launcher, onClose, control };
}

/** Session of the Acasystem login, bound to the proxy. */
function saveSession(refreshToken = 'rinnovo-1') {
  saveTokens({
    hassUrl: getHassUrl(),
    clientId: getClientId(),
    access_token: 'accesso-1',
    refresh_token: refreshToken,
    expires_in: 1800,
    expires: Date.now() + 1_800_000,
  });
}

const revokeCalls = () =>
  vi
    .mocked(fetch)
    .mock.calls.filter(([input]) => String(input) === `${getHassUrl()}/auth/revoke`)
    .map(([, init]) => (init?.body instanceof FormData ? init.body.get('token') : null));

const pages = () => mocks.pages as ReturnType<typeof makePages>;

beforeEach(() => {
  mocks.pages = makePages();
  mocks.config = { url: getHassUrl(), fallbackUrl: '', token: '', authMethod: 'oauth' };
  mocks.setConfig.mockReset();
  mocks.createConnection.mockReset();
  mocks.meta = {
    connected: true,
    haUnavailable: false,
    oauthExpired: false,
    activeUrl: getHassUrl(),
    haUser: { id: 'u1', name: 'Mario', is_owner: true },
  };
  mocks.fetchProfiles.mockResolvedValue([
    {
      id: 'p1',
      name: 'Tablet ingresso',
      device_label: 'Ingresso',
      updated_at: '2026-10-01T10:00:00Z',
      data: profileData,
    },
  ]);
  mocks.createProfile.mockImplementation(async (payload: Record<string, unknown>) => ({
    id: 'p2',
    ...payload,
  }));
  mocks.deleteProfile.mockResolvedValue({});
  localStorage.clear();
  sessionStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({ version: '9.9.9' }) }))
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('SystemPage', () => {
  it('è una pagina intera con le sezioni previste; Aspetto solo per tema e accento, senza lingua', async () => {
    const { onClose } = renderSystem();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Sistema' })).toBeVisible();
    expect(screen.getByRole('heading', { level: 1, name: 'Sistema' })).toHaveFocus();
    const nav = screen.getByRole('navigation', { name: 'Sezioni del sistema' });
    for (const title of [
      'Collegamento',
      'Profili',
      'Barra di stato',
      'Copertina',
      'Aspetto',
      'Casa 3D',
      'Informazioni',
    ]) {
      expect(screen.getByRole('heading', { level: 2, name: title })).toBeInTheDocument();
      expect(within(nav).getByRole('button', { name: title })).toBeInTheDocument();
    }
    // Aspetto (ADR-0011, REP-20261007-008) holds the Kit 2 theme and accent, and since
    // REP-20261007-038 the wallpaper the user asked for; the other legacy appearance
    // preferences stay gone (ADR-0007).
    expect(screen.getByRole('group', { name: 'Tema' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Colore d’accento' })).toBeInTheDocument();
    const text = document.body.textContent ?? '';
    expect(screen.getByRole('group', { name: 'Sfondo' })).toBeInTheDocument();
    expect(text).not.toMatch(/\b(lingua|unità di misura|carattere|blocco)\b/i);
    expect(screen.queryByRole('heading', { name: 'Lingua' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Lingua' })).not.toBeInTheDocument();
    expect(await screen.findByText('9.9.9')).toBeVisible();
    expect(screen.getByText('GPL-3.0')).toBeVisible();
    expect(screen.getByText(/deriva da Tunet 1\.22\.1/)).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Torna al launcher' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('mostra il collegamento tramite Acasystem, l’accesso e l’utente, senza indirizzi', () => {
    renderSystem();
    expect(screen.getByText('Sincronizzato')).toBeVisible();
    // The band squeezes «Sincronizzato» to assistive technology only (REP-20261013-002, ADR-0013):
    // here, outside the status bar, it is written in full.
    expect(screen.getByText('Sincronizzato').closest('.aca-status-bar')).toBeNull();
    expect(screen.getByText('Collegato a Home Assistant tramite Acasystem')).toBeVisible();
    expect(screen.getByText('Utente e password')).toBeVisible();
    expect(screen.getByText('Mario · Proprietario')).toBeVisible();
    expect(screen.queryByText(/indirizzo/i)).toBeNull();
    expect(screen.queryByText(/OAuth/)).toBeNull();
    expect(screen.queryByRole('textbox', { name: /indirizzo/i })).toBeNull();
  });

  it('senza collegamento non dice «Collegato»', () => {
    mocks.meta = { ...mocks.meta, connected: false, haUnavailableVisible: true };
    renderSystem();
    expect(screen.getByText('Home Assistant tramite Acasystem')).toBeVisible();
    expect(screen.queryByText('Collegato a Home Assistant tramite Acasystem')).toBeNull();
  });

  it('«Collega di nuovo» porta alla pagina di accesso e lascia aperto Sistema', () => {
    const { control, onClose } = renderSystem();
    fireEvent.click(screen.getByRole('button', { name: 'Collega di nuovo' }));
    expect(control.open).toHaveBeenCalledOnce();
    // «Annulla» on the login page goes back here (F2).
    expect(onClose).not.toHaveBeenCalled();
  });

  it('con la sessione scaduta propone «Accedi di nuovo»', () => {
    mocks.meta = { ...mocks.meta, connected: false, oauthExpired: true };
    const { control } = renderSystem();
    fireEvent.click(screen.getByRole('button', { name: 'Accedi di nuovo' }));
    expect(control.open).toHaveBeenCalledOnce();
  });

  it('«Esci», dopo la conferma, revoca il token di rinnovo e apre la pagina di accesso', async () => {
    saveSession('rinnovo-mario');
    localStorage.setItem('ha_auth_method', 'oauth');
    const { control, onClose } = renderSystem();
    fireEvent.click(screen.getByRole('button', { name: 'Esci' }));
    expect(mocks.setConfig).not.toHaveBeenCalled();
    expect(revokeCalls()).toEqual([]);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Esci' }));
    expect(mocks.setConfig).toHaveBeenCalledWith(
      expect.objectContaining({ authMethod: 'oauth', token: '' })
    );
    expect(control.open).toHaveBeenCalledOnce();
    // F2: Sistema closes, so the next access opens the launcher.
    expect(onClose).toHaveBeenCalledOnce();
    await waitFor(() => expect(revokeCalls()).toEqual(['rinnovo-mario']));
    expect(localStorage.getItem('tunet_auth_cache_v1')).toBeNull();
    expect(sessionStorage.getItem('tunet_auth_cache_v1')).toBeNull();
  });

  it('con il token a lunga durata esce svuotando il token salvato', () => {
    mocks.config = { url: getHassUrl(), fallbackUrl: '', token: 'abc', authMethod: 'token' };
    localStorage.setItem('ha_token', 'abc');
    localStorage.setItem('ha_auth_method', 'token');
    renderSystem();
    expect(screen.getByText('Token a lunga durata')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Esci' }));
    fireEvent.click(screen.getByRole('button', { name: 'Esci' }));
    expect(mocks.setConfig).toHaveBeenCalledWith(
      expect.objectContaining({ authMethod: 'oauth', token: '' })
    );
    expect(localStorage.getItem('ha_token')).toBeNull();
    expect(localStorage.getItem('ha_auth_method')).toBeNull();
    expect(revokeCalls()).toEqual([]);
  });

  it('fuori dall’app non offre «Collega di nuovo»', () => {
    render(<SystemPage onClose={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Collega di nuovo' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Esci' })).toBeVisible();
  });

  it('sceglie la qualità della vista 3D di questo dispositivo (ADR-0014, T5)', () => {
    renderSystem();
    const group = screen.getByRole('group', { name: 'Qualità della vista 3D' });
    expect(within(group).getByRole('button', { name: 'Light' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    fireEvent.click(within(group).getByRole('button', { name: 'Medium' }));
    expect(localStorage.getItem('aca_casa3d_quality')).toBe('medium');
    expect(within(group).getByRole('button', { name: 'Medium' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('apre la casa a schermo intero da «Casa 3D» (R1), dicendo quale pulsante l’ha aperta', () => {
    const open = vi.fn();
    renderSystem();
    // fuori dall’app non c’è nulla da aprire
    expect(screen.queryByRole('button', { name: 'Apri la casa' })).toBeNull();
    cleanup();
    render(
      <Casa3dHouseContext.Provider value={{ open }}>
        <SystemPage onClose={vi.fn()} />
      </Casa3dHouseContext.Provider>
    );
    const button = screen.getByRole('button', { name: 'Apri la casa' });
    fireEvent.click(button);
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(button);
    // il pulsante porta il segno con cui l’app lo ritrova quando la casa si chiude
    expect(button).toHaveAttribute('data-casa-opener');
  });

  it('blocca la disposizione dalla Schermata Home (REP-20261007-033)', () => {
    const { launcher } = renderSystem();
    const toggle = screen.getByRole('switch', { name: 'Blocca la disposizione' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(toggle);
    expect(launcher.setLayoutOptions).toHaveBeenCalledWith({ locked: true });
  });

  it('«Modifica le pagine» chiude Sistema e apre la vista pagine del launcher (ADR-0016, C3; 2026-10-23)', () => {
    const { launcher, onClose } = renderSystem();
    const button = screen.getByRole('button', { name: 'Modifica le pagine' });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    // La modifica da sola esiste solo con un widget selezionato: qui si apre la vista pagine.
    expect(launcher.setEditMode).toHaveBeenCalledWith(true);
    expect(launcher.setOverview).toHaveBeenCalledWith(true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('«Modifica le pagine» con la disposizione bloccata non fa nulla e dice come sbloccare', () => {
    const launcher = createLauncherMock();
    launcher.layout = { ...launcher.layout, locked: true };
    mocks.pages = {
      ...pages(),
      launcherLayout: { ...pages().launcherLayout, locked: true },
    };
    const { onClose } = renderSystem(launcher);
    expect(screen.getByRole('button', { name: 'Modifica le pagine' })).toBeDisabled();
    expect(screen.getByText(/La disposizione è bloccata: sbloccala qui sotto/)).toBeVisible();
    expect(launcher.setEditMode).not.toHaveBeenCalled();
    expect(launcher.setOverview).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('senza il launcher (Sistema come rotta a parte) la voce «Modifica le pagine» non c’è', () => {
    render(
      <ConnectPageControlProvider value={{ open: vi.fn(), cancel: null }}>
        <SystemPage onClose={vi.fn()} />
      </ConnectPageControlProvider>
    );
    expect(screen.queryByRole('button', { name: 'Modifica le pagine' })).toBeNull();
  });

  it('sceglie la densità della griglia (REP-20261007-034)', () => {
    const { launcher } = renderSystem();
    // The density is the default of the pages without their own columns (REP-20261008-001, E9).
    expect(
      screen.getByText(
        'Vale per le pagine senza una scelta di colonne; ogni pagina può averne una in Modifica le pagine. Compatta: meno celle. Ampia: più celle.'
      )
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Ampia' }));
    expect(launcher.setLayoutOptions).toHaveBeenCalledWith({ density: 'wide' });
  });

  it('attiva e disattiva la copertina con il launcher', () => {
    const { launcher } = renderSystem();
    const toggle = screen.getByRole('switch', { name: 'Mostra la copertina' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(toggle);
    expect(launcher.setCoverEnabled).toHaveBeenCalledWith(false);
  });

  it('dentro il LauncherProvider legge e cambia la copertina solo tramite il launcher', () => {
    // The saved layout says enabled, the launcher says disabled: the launcher wins.
    const launcher = createLauncherMock();
    launcher.layout = { ...launcher.layout, cover: { enabled: false } };
    renderSystem(launcher);
    const toggle = screen.getByRole('switch', { name: 'Mostra la copertina' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(toggle).toBeEnabled();
    fireEvent.click(toggle);
    expect(launcher.setCoverEnabled).toHaveBeenCalledWith(true);
    expect(pages().persistLauncherLayout).not.toHaveBeenCalled();
  });

  it('fuori dal launcher salva la copertina nella disposizione salvata', () => {
    render(<SystemPage onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Mostra la copertina' }));
    expect(pages().persistLauncherLayout).toHaveBeenCalledWith(
      expect.objectContaining({ cover: { enabled: false } })
    );
  });
});

describe('Profili', () => {
  it('elenca, salva e carica i profili tramite le API mockate', async () => {
    renderSystem();
    expect(await screen.findByText('Tablet ingresso')).toBeVisible();
    expect(mocks.fetchProfiles).toHaveBeenCalledWith('u1');

    fireEvent.change(screen.getByRole('textbox', { name: 'Nome del nuovo profilo' }), {
      target: { value: 'Sala' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salva il profilo' }));
    await waitFor(() => expect(mocks.createProfile).toHaveBeenCalled());
    expect(mocks.createProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        ha_user_id: 'u1',
        name: 'Sala',
        device_label: null,
        data: expect.objectContaining({ version: 1 }),
      })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Carica Tablet ingresso' }));
    expect(pages().persistConfig).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Carica' }));
    expect(pages().persistConfig).toHaveBeenCalledWith(
      expect.objectContaining({ pages: ['home', 'studio'] })
    );
    // The profile has no launcher layout: the launcher migrates again from its pages.
    expect(pages().persistLauncherLayout).toHaveBeenCalledWith(null);
  });

  it('elimina un profilo dopo la conferma', async () => {
    renderSystem();
    fireEvent.click(await screen.findByRole('button', { name: 'Elimina Tablet ingresso' }));
    fireEvent.click(screen.getByRole('button', { name: 'Elimina' }));
    await waitFor(() => expect(mocks.deleteProfile).toHaveBeenCalledWith('p1', 'u1'));
  });

  it('esporta e importa la configurazione da file', async () => {
    const createObjectURL = vi.fn(() => 'blob:prova');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    localStorage.setItem(
      'tunet_pages_config',
      JSON.stringify({ header: [], pages: ['home'], home: [] })
    );
    renderSystem();

    fireEvent.click(screen.getByRole('button', { name: 'Esporta in un file' }));
    expect(createObjectURL).toHaveBeenCalled();
    expect(screen.getByText('File della configurazione creato.')).toBeVisible();

    const exported = {
      format: 'tunet-dashboard-export',
      version: 1,
      exported_at: '2026-10-06T08:00:00.000Z',
      data: profileData,
    };
    const input = screen.getByLabelText('File della configurazione da importare');
    const file = new File([JSON.stringify(exported)], 'casa.json', { type: 'application/json' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByText('Configurazione importata da «casa.json».')).toBeVisible();
    expect(pages().persistConfig).toHaveBeenCalledWith(
      expect.objectContaining({ pages: ['home', 'studio'] })
    );

    const broken = new File(['non json'], 'rotto.json', { type: 'application/json' });
    fireEvent.change(input, { target: { files: [broken] } });
    expect(
      await screen.findByText(/non è una configurazione di Acasystem o di Tunet valida/)
    ).toBeVisible();
  });

  it('senza utente HA spiega che i profili non sono disponibili', () => {
    mocks.meta = { ...mocks.meta, haUser: null, connected: false };
    renderSystem();
    expect(
      screen.getByText('Collega Home Assistant con un utente per salvare e caricare i profili.')
    ).toBeVisible();
    expect(mocks.fetchProfiles).not.toHaveBeenCalled();
  });
});

describe('Barra di stato', () => {
  it('modifica titolo, persone fissate e indicatori', () => {
    renderSystem();
    const title = screen.getByRole('textbox', { name: 'Titolo' });
    fireEvent.change(title, { target: { value: 'Ufficio' } });
    fireEvent.blur(title);
    expect(pages().updateHeaderTitle).toHaveBeenCalledWith('Ufficio');

    fireEvent.click(screen.getByRole('switch', { name: 'Mostra l’ora' }));
    expect(pages().updateHeaderSettings).toHaveBeenCalledWith({
      showTitle: true,
      showClock: false,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Togli Anna dalla barra' }));
    expect(pages().persistConfig).toHaveBeenCalledWith(expect.objectContaining({ header: [] }));

    fireEvent.click(screen.getByRole('button', { name: 'Fissa una persona' }));
    fireEvent.click(screen.getByRole('button', { name: /Marco/ }));
    expect(pages().persistConfig).toHaveBeenLastCalledWith(
      expect.objectContaining({ header: ['person.anna', 'person.marco'] })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mostra Temperatura' }));
    expect(pages().saveStatusPillsConfig).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'pill_1', visible: false }),
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi un indicatore' }));
    const list = screen.getByRole('group', { name: 'Entità da mostrare' });
    fireEvent.click(within(list).getByRole('button', { name: /Anna/ }));
    expect(pages().saveStatusPillsConfig).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: 'pill_1' }),
      expect.objectContaining({ type: 'conditional', entityId: 'person.anna', visible: true }),
    ]);
  });
});
