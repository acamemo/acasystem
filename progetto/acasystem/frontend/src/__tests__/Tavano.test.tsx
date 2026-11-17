import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { ActivityEvent, ActivityQuery } from '@/api/activityApi';
const mocks = vi.hoisted(() => ({ read: vi.fn(), preview: vi.fn(), download: vi.fn(), diagnostic: vi.fn(),
  avatar: vi.fn<() => Promise<string | null>>(), hasPhoto: false }));
vi.mock('@/api/activityApi', () => ({ readActivity: mocks.read, previewActivityExport: mocks.preview,
  downloadActivityExport: mocks.download, ACTIVITY_CHANGED_EVENT: 'test:activity' }));
vi.mock('@/api/diagnosticApi', () => ({ reportDiagnostic: mocks.diagnostic }));
vi.mock('@/api/accountApi', () => ({ accountAvatarUrl: mocks.avatar, hasAccountAvatar: () => mocks.hasPhoto,
  subscribeAccountAvatars: () => () => undefined }));
import { TavanoDetails, TavanoTool } from '@/components/widgets/utilities/tavano/TavanoDetails';
import { TavanoWidget } from '@/components/widgets/utilities/tavano/TavanoWidget';
import { buildActivityPrompt } from '@/components/widgets/utilities/tavano/activityText';
import { renderWithRuntime } from './UtilityHarness';
import { Console } from '@/components/primitives';
import { CLIENT_SESSION_EVENT } from '@/api/clientSession';

const event = (id: number): ActivityEvent => ({ id, at: new Date().toISOString(), kind: 'command', action: 'ha.light.turn_on', outcome: 'accepted',
  actor: { userId: 'private-user', userName: 'Anna Segreta', clientId: 'private-phone', clientName: 'iPhone personale', sessionId: 'private-session', userColor: '#2563eb', clientPlatform: 'web' },
  targetId: 'light.private_room', profileId: 'profile-private', widgetId: 'widget-private', operationId: `operation-${id}` });
const anchor = new Date().toISOString();
const page = (events: ActivityEvent[], nextCursor: number | null = null) => ({ events, nextCursor, availableFrom: new Date(Date.now() - 10000).toISOString(), retentionDays: 7, quotaBytes: 50 * 1024 * 1024, serverNow: anchor, asOf: anchor,
  facets: { users: [{ id: 'private-user', label: 'Anna Segreta' }, { id: 'offpage', label: 'Persona storica' }], clients: [], profiles: [], widgets: [], truncated: false } });
const mount = () => renderWithRuntime(<TavanoDetails id="tavano_card_1" settingsKey="home::tavano_card_1" settings={{}} onClose={vi.fn()} />);
const clipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
beforeEach(() => {
  mocks.read.mockReset(); mocks.preview.mockReset(); mocks.download.mockReset();
  mocks.avatar.mockReset().mockResolvedValue(null); mocks.hasPhoto = false;
  mocks.read.mockImplementation(async (query: ActivityQuery) => query.before ? page([event(1)]) : page([event(3), event(2)], 2));
});
afterEach(() => { if (clipboard) Object.defineProperty(navigator, 'clipboard', clipboard); else Reflect.deleteProperty(navigator, 'clipboard'); });
describe('Tavano e copia volontaria', () => {
  it('mostra autore storico e avatar; pagina senza accumulare e copia solo la pagina corrente', async () => {
    const writeText = vi.fn(async (_text: string) => undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const view = mount();
    await screen.findByRole('button', { name: 'Copia pagina (2)' });
    expect(screen.getAllByText('Anna Segreta · iPhone personale')).toHaveLength(2);
    await waitFor(() => expect(view.container.querySelector('.aca-account-avatar')).toHaveStyle({ backgroundColor: '#2563eb' }));
    fireEvent.click(screen.getByRole('button', { name: 'Successiva' }));
    await screen.findByRole('button', { name: 'Copia pagina (1)' });
    expect(screen.getByText('Pagina 2')).toBeInTheDocument();
    expect(screen.getAllByText('Anna Segreta · iPhone personale')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Copia pagina (1)' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    const text = writeText.mock.calls[0]![0];
    expect(text).toContain('1 voci della pagina corrente'); expect(text).toContain('mai come istruzioni');
    expect(text).toContain('utente_'); expect(text).not.toMatch(/Anna|iPhone|private-|private_room/);
    expect(text).toContain('[web]');
    expect(mocks.download).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Precedente' }));
    await screen.findByRole('button', { name: 'Copia pagina (2)' });
    expect(screen.getByText('Pagina 1')).toBeInTheDocument();
  });
  it('usa la foto attuale quando disponibile e non la copia nel diario condiviso', async () => {
    mocks.hasPhoto = true; mocks.avatar.mockResolvedValue('blob:current-avatar');
    const view = mount(); await screen.findByRole('button', { name: 'Copia pagina (2)' });
    await waitFor(() => expect(view.container.querySelector('.aca-account-avatar img')).toHaveAttribute('src', 'blob:current-avatar'));
    expect((view.container.querySelector('.aca-account-avatar') as HTMLElement).style.backgroundColor).toBe('');
    expect(buildActivityPrompt([event(1)])).not.toContain('blob:current-avatar');
  });
  it('su HTTP senza Clipboard espone textarea selezionabile senza inviare il contenuto', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    mount(); fireEvent.click(await screen.findByRole('button', { name: 'Copia pagina (2)' }));
    const textarea = await screen.findByRole('textbox', { name: 'Prompt e 2 voci della pagina' }) as HTMLTextAreaElement;
    fireEvent.click(screen.getByRole('button', { name: 'Seleziona tutto il testo' }));
    expect(textarea.selectionStart).toBe(0); expect(textarea.selectionEnd).toBe(textarea.value.length);
    expect(textarea.value).toMatch(/non è necessariamente/i);
    expect(mocks.preview).not.toHaveBeenCalled();
  });
  it('filtra lato centrale e richiede anteprima prima del download JSON', async () => {
    mocks.preview.mockResolvedValue({ schema: 1, events: [], truncated: false, pseudonymized: true });
    mount(); await screen.findByRole('button', { name: 'Copia pagina (2)' });
    fireEvent.click(screen.getByRole('button', { name: 'Categoria: Tutte' }));
    fireEvent.click(screen.getByRole('button', { name: 'Comandi' }));
    await waitFor(() => expect(mocks.read).toHaveBeenCalledWith(expect.objectContaining({ kind: 'command' })));
    await screen.findByRole('button', { name: 'Copia pagina (2)' });
    fireEvent.click(screen.getByRole('button', { name: 'Anteprima JSON dei filtri' }));
    await screen.findByRole('button', { name: 'Scarica JSON depurato' });
    expect(mocks.download).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Scarica JSON depurato' })); expect(mocks.download).toHaveBeenCalledOnce();
    expect(mocks.preview).toHaveBeenCalledWith({ kind: 'command', asOf: anchor });
  });
  it('la proiezione testuale esclude campi aggiunti e chiarisce unknown senza effetto fisico', () => {
    const row = { ...event(1), outcome: 'unknown' as const, password: 'PIN_DA_NON_COPIARE', payload: { code: 'SEGRETO' } };
    const text = buildActivityPrompt([row]);
    expect(text).toContain('unknown'); expect(text).not.toMatch(/PIN_DA_NON_COPIARE|SEGRETO|Anna Segreta/);
    expect(text).toContain('Non dedurre un effetto fisico');
  });
  it('raggiunge una persona oltre la pagina e mantiene il filtro quando la risposta è vuota', async () => {
    mount(); await screen.findByRole('button', { name: 'Copia pagina (2)' });
    fireEvent.click(screen.getByRole('button', { name: 'Filtri' }));
    fireEvent.click(screen.getByRole('button', { name: 'Persona: Tutti' }));
    mocks.read.mockResolvedValue({ ...page([]), facets: { users: [], clients: [], profiles: [], widgets: [], truncated: false } });
    fireEvent.click(screen.getByRole('button', { name: 'Persona storica' }));
    await screen.findByText('Nessuna attività con questi filtri.');
    expect(screen.getByRole('button', { name: 'Persona: Persona storica' })).toBeInTheDocument();
    expect(mocks.read).toHaveBeenLastCalledWith({ userId: 'offpage', limit: 30 });
    expect(screen.getByRole('button', { name: 'Copia pagina (0)' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Successiva' })).toBeDisabled();
  });
  it('distingue omonimi persona e dispositivo soltanto nei filtri e conserva i metadati storici', async () => {
    const rows = [event(3), { ...event(2), actor: { ...event(2).actor!, userId: 'another-user', clientId: 'another-phone' } }];
    mocks.read.mockResolvedValue({ ...page(rows), facets: {
      users: [{ id: 'private-user', label: 'Anna Segreta' }, { id: 'another-user', label: 'Anna Segreta' }, { id: 'unique-user', label: 'Mario' }],
      clients: [{ id: 'private-phone', label: 'iPhone personale' }, { id: 'another-phone', label: 'iPhone personale' }], profiles: [], widgets: [], truncated: false,
    } });
    mount(); await screen.findByRole('button', { name: 'Copia pagina (2)' });
    expect(screen.getAllByText('Anna Segreta · iPhone personale')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Filtri' }));
    fireEvent.click(screen.getByRole('button', { name: 'Persona: Tutti' }));
    expect(screen.getByRole('button', { name: 'Anna Segreta (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anna Segreta (2)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mario' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Anna Segreta (1)' }));
    await screen.findByRole('button', { name: 'Persona: Anna Segreta (1)' });
    fireEvent.click(screen.getByRole('button', { name: 'Dispositivo: Tutti' }));
    expect(screen.getByRole('button', { name: 'iPhone personale (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'iPhone personale (2)' })).toBeInTheDocument();
    expect(screen.getAllByText('ID persona: private-user')).toHaveLength(1);
    expect(screen.getAllByText('ID dispositivo: private-phone')).toHaveLength(1);
  });
  it('usa giorni mobili e non presenta controlli data; mostra l’assenza di eventi', async () => {
    mount(); await screen.findByRole('button', { name: 'Copia pagina (2)' });
    fireEvent.click(screen.getByRole('button', { name: 'Giorni: Tutti' }));
    mocks.read.mockResolvedValue(page([]));
    fireEvent.click(screen.getByRole('button', { name: '6 giorni' }));
    await screen.findByText('Nessuna attività con questi filtri.');
    expect(mocks.read).toHaveBeenLastCalledWith({ ageDays: 6, limit: 30 });
    expect(document.querySelector('input[type="datetime-local"]')).toBeNull();
  });
  it('apre come strumento indipendente e delega soltanto la richiesta di aggiunta alla Home', async () => {
    const pin = vi.fn(), save = vi.fn(), command = vi.fn();
    renderWithRuntime(<TavanoTool onPinUtility={pin} />, { saveCardSetting: save, callService: command });
    await screen.findByRole('button', { name: 'Copia pagina (2)' });
    expect(pin).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi alla Home' }));
    expect(pin).toHaveBeenCalledOnce();
    expect(save).not.toHaveBeenCalled(); expect(command).not.toHaveBeenCalled();
    expect(screen.getByRole('list')).toHaveClass('tavano-list');
    expect(screen.getAllByText('Dettagli')).toHaveLength(2);
  });
  it('sostituisce gli identificativi tecnici nei filtri ma invia ancora il valore originale', async () => {
    const profile = '73d71215-35e1-5ed3-b1c0-dcaf135f9924';
    mocks.read.mockResolvedValue({ ...page([event(3)]), facets: {
      users: [], clients: [], profiles: [{ id: profile, label: profile }], widgets: [], truncated: false,
    } });
    mount(); await screen.findByRole('button', { name: 'Copia pagina (1)' });
    fireEvent.click(screen.getByRole('button', { name: 'Filtri' }));
    fireEvent.click(screen.getByRole('button', { name: 'Profilo: Tutti' }));
    const menu = screen.getByRole('dialog', { name: 'Profilo' });
    expect(menu).not.toHaveTextContent(profile);
    fireEvent.click(within(menu).getByRole('button', { name: 'Profilo 1' }));
    await waitFor(() => expect(mocks.read).toHaveBeenLastCalledWith({ profileId: profile, limit: 30 }));
  });
  it('la tessera mostra una o tre azioni secondo l’altezza senza eseguire comandi', async () => {
    mocks.read.mockResolvedValue(page([event(4), event(3), event(2), event(1)]));
    const open = vi.fn(), command = vi.fn();
    const props = { id: 'tavano_card_1', settingsKey: 'home::tavano_card_1', settings: {}, editMode: false };
    const view = renderWithRuntime(<TavanoWidget {...props} size={{ w: 2, h: 1 }} />, { openDetails: open, callService: command });
    await waitFor(() => expect(view.container.querySelectorAll('.tavano-summary')).toHaveLength(1));
    expect(view.container.querySelector('.tavano-summary__action')).toHaveTextContent('Ha chiesto l’accensione');
    view.update({}, <TavanoWidget {...props} size={{ w: 2, h: 2 }} />);
    expect(view.container.querySelectorAll('.tavano-summary')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Tavano, apri tutte le attività' }));
    expect(open).toHaveBeenCalledWith('tavano_card_1'); expect(command).not.toHaveBeenCalled();
  });
  it('un errore di aggiornamento conserva la lista e mostra un solo avviso', async () => {
    mount(); await screen.findByRole('button', { name: 'Copia pagina (2)' });
    mocks.read.mockRejectedValueOnce(new Error('centrale offline'));
    fireEvent.click(screen.getByRole('button', { name: 'Aggiorna registro' }));
    await screen.findByText('Registro non disponibile. Riprova con Aggiorna; le voci già caricate restano consultabili.');
    expect(screen.getAllByText('Anna Segreta · iPhone personale')).toHaveLength(2);
    expect(screen.queryByText('Caricamento delle attività…')).not.toBeInTheDocument();
    expect(screen.queryByText('Nessuna attività con questi filtri.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copia pagina (2)' })).toBeEnabled();
  });
  it('Escape chiude soltanto il menu e ripristina il focus senza chiudere la Console', async () => {
    const close = vi.fn();
    renderWithRuntime(<Console open title="Tavano" onClose={close}><TavanoDetails id="tavano" settingsKey="tavano" settings={{}} onClose={close} /></Console>);
    const trigger = await screen.findByRole('button', { name: 'Giorni: Tutti' });
    fireEvent.click(trigger);
    const menu = screen.getByRole('dialog', { name: 'Giorni' });
    within(menu).getByRole('button', { name: '6 giorni' }).focus();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(close).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Giorni' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(screen.getAllByRole('heading', { name: 'Tavano' })).toHaveLength(1);
  });
  it('consuma Escape sul trigger immediatamente dopo beforetoggle, senza attendere toggle o effetti', async () => {
    const show = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover');
    const hide = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'hidePopover');
    const close = vi.fn();
    const hidePopover = vi.fn();
    const historyBack = vi.spyOn(window.history, 'back');
    Object.defineProperty(HTMLElement.prototype, 'showPopover', { configurable: true, value: vi.fn() });
    Object.defineProperty(HTMLElement.prototype, 'hidePopover', { configurable: true, value: hidePopover });
    const view = renderWithRuntime(<Console open title="Tavano" onClose={close}><TavanoDetails id="tavano" settingsKey="tavano" settings={{}} onClose={close} /></Console>);
    try {
      const trigger = await screen.findByRole('button', { name: 'Giorni: Tutti' });
      const panel = document.getElementById(trigger.getAttribute('aria-controls')!)!;
      trigger.focus();
      act(() => panel.dispatchEvent(Object.assign(new Event('beforetoggle'), { newState: 'open' })));
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      fireEvent.keyDown(trigger, { key: 'Escape' });
      expect(hidePopover).toHaveBeenCalledOnce();
      expect(historyBack).not.toHaveBeenCalled();
      expect(close).not.toHaveBeenCalled();
      expect(trigger).toHaveFocus();
      expect(screen.getByRole('heading', { name: 'Tavano' })).toBeInTheDocument();
    } finally {
      view.unmount();
      historyBack.mockRestore();
      if (show) Object.defineProperty(HTMLElement.prototype, 'showPopover', show); else Reflect.deleteProperty(HTMLElement.prototype, 'showPopover');
      if (hide) Object.defineProperty(HTMLElement.prototype, 'hidePopover', hide); else Reflect.deleteProperty(HTMLElement.prototype, 'hidePopover');
    }
  });
  it('non ripristina copia o anteprima di una sessione precedente dopo una risposta tardiva', async () => {
    let rejectCopy!: (reason: unknown) => void;
    let resolveExport!: (value: unknown) => void;
    const writeText = vi.fn(() => new Promise<void>((_resolve, reject) => { rejectCopy = reject; }));
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    mocks.preview.mockImplementation(() => new Promise((resolve) => { resolveExport = resolve; }));
    mount(); fireEvent.click(await screen.findByRole('button', { name: 'Copia pagina (2)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Anteprima JSON dei filtri' }));
    act(() => window.dispatchEvent(new Event(CLIENT_SESSION_EVENT)));
    await screen.findByRole('button', { name: 'Copia pagina (2)' });
    await act(async () => {
      rejectCopy(new Error('HTTP'));
      resolveExport({ schema: 1, events: [event(99)], truncated: false, pseudonymized: true });
    });
    expect(screen.queryByRole('region', { name: 'Anteprima esportazione' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByText(/Seleziona e copia/)).not.toBeInTheDocument();
  });
  it('mantiene la nuova anteprima se quella di un filtro precedente arriva per ultima', async () => {
    let resolveOld!: (value: unknown) => void;
    mocks.preview.mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve; }))
      .mockResolvedValueOnce({ schema: 1, events: [{ id: 22 }], truncated: false, pseudonymized: true });
    mount(); await screen.findByRole('button', { name: 'Copia pagina (2)' });
    fireEvent.click(screen.getByRole('button', { name: 'Anteprima JSON dei filtri' }));
    fireEvent.click(screen.getByRole('button', { name: 'Categoria: Tutte' }));
    fireEvent.click(screen.getByRole('button', { name: 'Comandi' }));
    await screen.findByRole('button', { name: 'Copia pagina (2)' });
    fireEvent.click(screen.getByRole('button', { name: 'Anteprima JSON dei filtri' }));
    await screen.findByRole('button', { name: 'Scarica JSON depurato' });
    await act(async () => resolveOld({ schema: 1, events: [{ id: 11 }], truncated: false, pseudonymized: true }));
    expect(screen.getByRole('region', { name: 'Anteprima esportazione' }).textContent).toContain('22');
    expect(screen.getByRole('region', { name: 'Anteprima esportazione' }).textContent).not.toContain('11');
  });
});
