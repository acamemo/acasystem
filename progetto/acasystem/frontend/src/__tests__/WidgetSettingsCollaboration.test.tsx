import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LiveProfile } from '../../../contracts/collaboration';
import type { ProfileEditor } from '@/hooks/liveProfiles/coordinator';
const mocks = vi.hoisted(() => ({ pages: {} as Record<string, unknown>, live: null as unknown, exportDraft: vi.fn(), saveSetting: vi.fn() }));
vi.mock('@/hooks/context', async (original) => ({ ...await original<typeof import('@/hooks/context')>(), usePages: () => mocks.pages }));
vi.mock('@/hooks/liveProfiles/LiveProfilesContext', () => ({ useOptionalLiveProfiles: () => mocks.live }));
vi.mock('@/hooks/liveProfiles/drafts', async (original) => ({ ...await original<typeof import('@/hooks/liveProfiles/drafts')>(), exportDraftFile: mocks.exportDraft }));
import { WidgetSettingsSheet } from '@/templates/sheets/WidgetSettingsSheet';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';

const profile = (revision = 1, heading = 'Prima'): LiveProfile => ({ id: 'profile-a', userId: 'user-a', name: 'Casa', revision,
  resourceRevisions: { profile: revision }, migration: null, createdAt: '', updatedAt: '',
  configuration: { snapshot: { layout: { cardSettings: { 'home::light.cucina': { heading } } } } } });
const base = profile();
const editor = (patch: Partial<ProfileEditor> = {}): ProfileEditor => ({ id: 'editor-a', draftId: 'draft-a', title: 'Widget',
  target: { kind: 'widget', widgetId: 'light.cucina', pageId: 'home' }, base, working: base.configuration,
  lease: null, busy: false, error: '', conflict: null, quotaBlocked: false, ...patch });
let state: { editor: ProfileEditor | null; offline: boolean; profile: LiveProfile };
let coordinator: {
  snapshot: () => typeof state;
  begin: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  finish: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  useMine: ReturnType<typeof vi.fn>;
  useCurrent: ReturnType<typeof vi.fn>;
  copyConflict: ReturnType<typeof vi.fn>;
  currentDraft: ReturnType<typeof vi.fn>;
};
const runtime = () => createFixtureRuntime({ saveCardSetting: mocks.saveSetting, entities: fixtureEntities([fixtureEntity('light.cucina', 'on', { friendly_name: 'Luce cucina' })]) });
function mount() {
  const onClose = vi.fn();
  const tree = () => <WidgetRuntimeProvider value={runtime()}><WidgetSettingsSheet open widgetId="light.cucina" settingsKey="home::light.cucina" pageId="segmento-home-2" onClose={onClose} /></WidgetRuntimeProvider>;
  const result = render(tree()); return { ...result, onClose, update: () => result.rerender(tree()) };
}
beforeEach(() => {
  state = { editor: null, offline: false, profile: base };
  coordinator = {
    snapshot: () => state,
    begin: vi.fn(async () => { state.editor ??= editor(); }),
    close: vi.fn(async () => { state.editor = null; }),
    finish: vi.fn(async () => { state.editor = null; return true; }),
    save: vi.fn(async ({ keepOpen } = {}) => { if (!keepOpen) state.editor = null; return true; }),
    useMine: vi.fn(async () => { if (state.editor) state.editor = { ...state.editor, conflict: null }; }),
    useCurrent: vi.fn(async () => { state.editor = null; }),
    copyConflict: vi.fn(async () => { state.editor = null; }),
    currentDraft: vi.fn(() => ({ id: 'draft-a', changes: [{ path: ['snapshot', 'layout', 'customNames', 'light.cucina'], value: 'Ultimo nome' }] })),
  };
  mocks.live = { state, coordinator };
  mocks.exportDraft.mockClear();
  mocks.saveSetting.mockClear();
  mocks.pages = { widgetMemoryNotice: null, pagesConfig: { pages: ['home'], home: ['light.cucina'] }, pageSettings: {},
    customIcons: {}, saveCustomName: vi.fn(), saveCustomIcon: vi.fn(), persistCustomIcons: vi.fn(), savePageSetting: vi.fn() };
});
describe('impostazioni widget nel profilo live', () => {
  it('acquisisce il widget e Fatto attende gli ultimi cambi senza un secondo Salva', async () => {
    const view = mount(); const done = await screen.findByRole('button', { name: 'Fatto' });
    await waitFor(() => expect(coordinator.begin).toHaveBeenCalledOnce());
    expect(coordinator.begin).toHaveBeenCalledWith({ kind: 'widget', widgetId: 'light.cucina', pageId: 'home' }, 'Impostazioni del widget');
    expect(screen.queryByRole('button', { name: 'Salva' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Annulla modifica' })).toBeNull();
    fireEvent.click(done);
    await waitFor(() => expect(view.onClose).toHaveBeenCalledOnce()); expect(coordinator.finish).toHaveBeenCalledOnce();
  });
  it('se la centrale rifiuta il checkpoint mantiene aperto l’editor', async () => {
    coordinator.finish.mockResolvedValue(false);
    const view = mount(); await screen.findByText('Salvataggio automatico');
    fireEvent.click(screen.getByRole('button', { name: 'Fatto' }));
    await waitFor(() => expect(coordinator.finish).toHaveBeenCalledOnce());
    expect(view.onClose).not.toHaveBeenCalled(); expect(state.editor).not.toBeNull();
  });
  it('anche la chiusura normale attende gli ultimi cambi e rilascia la modifica', async () => {
    const view = mount(); await screen.findByText('Salvataggio automatico');
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));
    await waitFor(() => expect(coordinator.finish).toHaveBeenCalledOnce()); expect(view.onClose).toHaveBeenCalledOnce();
  });
  it('una riserva negata non apre i campi né chiude un altro editor', async () => {
    const other = editor({ id: 'other-editor', target: { kind: 'widget', pageId: 'home', widgetId: 'light.sala' } });
    state.editor = other; coordinator.begin.mockRejectedValue(new Error('Anna sta modificando un altro widget.'));
    const view = mount(); await screen.findByRole('alert');
    expect(screen.getByRole('group', { name: 'Campi del widget', hidden: true })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Fatto' }));
    await waitFor(() => expect(view.onClose).toHaveBeenCalledOnce());
    expect(coordinator.finish).not.toHaveBeenCalled(); expect(state.editor).toBe(other);
  });
  it('offline permette di conservare la bozza e blocca i campi se la quota è esaurita', async () => {
    state.offline = true;
    coordinator.begin.mockImplementation(async () => { state.editor = editor({ quotaBlocked: true, error: 'Quota esaurita' }); });
    const view = mount(); await screen.findByText(/La quota delle bozze è esaurita/);
    expect(screen.getByRole('button', { name: 'Fatto' })).toBeDisabled();
    expect(screen.getByRole('group', { name: 'Campi del widget', hidden: true })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Esporta la bozza in memoria' }));
    expect(mocks.exportDraft).toHaveBeenCalledWith(expect.objectContaining({ id: 'draft-a', changes: [expect.objectContaining({ value: 'Ultimo nome' })] }));
    expect(coordinator.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Scarta bozza non sincronizzata' }));
    await waitFor(() => expect(coordinator.close).toHaveBeenCalledWith(true));
    expect(view.onClose).toHaveBeenCalledOnce();
  });
  it('mantiene la disposizione aperta mentre i campi usano lo stesso salvataggio automatico', async () => {
    state.editor = editor({ target: { kind: 'structure' } }); const view = mount();
    const back = await screen.findByRole('button', { name: 'Fatto' });
    await screen.findByText('Salvataggio automatico');
    expect(coordinator.begin).toHaveBeenCalledWith({ kind: 'structure' }, 'Impostazioni del widget'); expect(screen.queryByRole('button', { name: 'Annulla modifica' })).toBeNull();
    fireEvent.click(back); await waitFor(() => expect(view.onClose).toHaveBeenCalledOnce());
    expect(coordinator.finish).not.toHaveBeenCalled(); expect(coordinator.save).not.toHaveBeenCalled();
  });
  it('confronta il conflitto e sincronizza soltanto dopo la scelta Usa la mia', async () => {
    coordinator.begin.mockImplementation(async () => { state.editor = editor({ working: profile(1, 'La mia intestazione').configuration, conflict: profile(2, 'Intestazione attuale') }); });
    mount(); await screen.findByRole('region', { name: 'Confronto delle modifiche' });
    expect(screen.getByText(/La mia intestazione.*Intestazione attuale/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Fatto' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Usa la mia' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Fatto' })).not.toBeDisabled());
    expect(coordinator.useMine).toHaveBeenCalledOnce(); expect(coordinator.save).toHaveBeenCalledWith({ keepOpen: true });
  });
  it('consente di continuare a scrivere mentre il checkpoint precedente è in corso', async () => {
    coordinator.begin.mockImplementation(async () => { state.editor = editor({ busy: true }); });
    mount(); await screen.findByText('Salvataggio automatico');
    expect(screen.getByRole('group', { name: 'Campi del widget' })).not.toBeDisabled();
  });
  it('Escape con un campo ancora attivo ne conclude la modifica prima del checkpoint', async () => {
    const view = mount(); await screen.findByText('Salvataggio automatico');
    const field = screen.getByRole('textbox', { name: 'Intestazione' });
    const blur = vi.fn(); field.addEventListener('blur', blur);
    field.focus(); fireEvent.change(field, { target: { value: 'Ultima digitazione' } });
    coordinator.finish.mockImplementation(async () => {
      expect(blur).toHaveBeenCalledOnce();
      expect(mocks.saveSetting).toHaveBeenLastCalledWith('home::light.cucina', 'heading', 'Ultima digitazione');
      state.editor = null; return true;
    });
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    await waitFor(() => expect(view.onClose).toHaveBeenCalledOnce());
  });
  it('adotta una modifica transitoria aperta senza lasciare lo sheet senza editor', async () => {
    state.editor = editor({ target: { kind: 'structure' }, transient: true });
    coordinator.begin.mockImplementation(async () => { state.editor = { ...state.editor!, transient: false }; });
    const view = mount(); await screen.findByText('Salvataggio automatico');
    fireEvent.click(screen.getByRole('button', { name: 'Fatto' }));
    await waitFor(() => expect(view.onClose).toHaveBeenCalledOnce());
    expect(coordinator.finish).toHaveBeenCalledOnce();
  });
  it('la copia rimane esplicita e un errore di creazione non chiude la bozza', async () => {
    coordinator.begin.mockImplementation(async () => { state.editor = editor({ conflict: profile(2) }); });
    coordinator.copyConflict.mockRejectedValue(new Error('Centrale non raggiungibile: bozza conservata'));
    const view = mount(); await screen.findByRole('button', { name: 'Crea copia indipendente' });
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome della copia' }), { target: { value: 'Copia camera' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crea copia indipendente' }));
    await screen.findByRole('alert'); expect(coordinator.copyConflict).toHaveBeenCalledWith('Copia camera');
    expect(view.onClose).not.toHaveBeenCalled(); expect(state.editor).not.toBeNull();
  });
});
