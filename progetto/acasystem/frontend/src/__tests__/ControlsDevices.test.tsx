import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HassEntity } from 'home-assistant-js-websocket';
import type { CardSettings } from '@/@types/dashboard';
import type { CellSize, WidgetDetailsProps, WidgetProps, WidgetRuntime } from '@/@types/launcher';
import type { ComponentType } from 'react';
import {
  AutomationDetails,
  AutomationWidget,
} from '@/components/widgets/controls/automation/AutomationWidget';
import { CoverDetails } from '@/components/widgets/controls/cover/CoverDetails';
import { CoverWidget } from '@/components/widgets/controls/cover/CoverWidget';
import { FanDetails } from '@/components/widgets/controls/fan/FanDetails';
import { FanWidget } from '@/components/widgets/controls/fan/FanWidget';
import { LockDetails } from '@/components/widgets/controls/lock/LockDetails';
import { LockWidget } from '@/components/widgets/controls/lock/LockWidget';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, flush, renderWithRuntime, serviceMock } from './ControlsHarness';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function mount(
  Widget: ComponentType<WidgetProps>,
  id: string,
  entities: HassEntity[],
  options: { settings?: CardSettings; size?: CellSize; editMode?: boolean } & Partial<WidgetRuntime> = {}
) {
  const { settings = {}, size = { w: 2, h: 1 }, editMode = false, ...runtime } = options;
  const callService = runtime.callService ?? serviceMock();
  const view = renderWithRuntime(
    <Widget id={id} settingsKey={id} settings={settings} size={size} editMode={editMode} />,
    { entities: fixtureEntities(entities), conn: fakeConnection().conn, ...runtime, callService }
  );
  return { ...view, callService };
}

function mountDetails(
  Details: ComponentType<WidgetDetailsProps>,
  id: string,
  entities: HassEntity[],
  settings: CardSettings = {},
  runtime: Partial<WidgetRuntime> = {}
) {
  const callService = runtime.callService ?? serviceMock();
  const view = renderWithRuntime(
    <Details id={id} settingsKey={id} settings={settings} onClose={() => undefined} />,
    { entities: fixtureEntities(entities), conn: fakeConnection().conn, ...runtime, callService }
  );
  return { ...view, callService };
}

// ── Fan ────────────────────────────────────────────────────────────────────
const ALL_FAN_FEATURES = 1 | 2 | 4 | 8 | 16 | 32;
const fan = (state = 'on', attributes: Record<string, unknown> = {}) =>
  fixtureEntity('fan.soffitto', state, {
    friendly_name: 'Ventilatore',
    supported_features: ALL_FAN_FEATURES,
    percentage: 40,
    percentage_step: 10,
    oscillating: false,
    direction: 'forward',
    preset_mode: 'normale',
    preset_modes: ['normale', 'notte'],
    ...attributes,
  });

describe('FanWidget e FanDetails', () => {
  it('accensione secondo le funzioni supportate: turn_off/turn_on', () => {
    const on = mount(FanWidget, 'fan.soffitto', [fan('on')]);
    fireEvent.click(screen.getByRole('switch', { name: 'Ventilatore' }));
    expect(on.callService).toHaveBeenCalledWith('fan', 'turn_off', { entity_id: 'fan.soffitto' });
    on.unmount();
    const off = mount(FanWidget, 'fan.soffitto', [fan('off')]);
    fireEvent.click(screen.getByRole('switch', { name: 'Ventilatore' }));
    expect(off.callService).toHaveBeenCalledWith('fan', 'turn_on', { entity_id: 'fan.soffitto' });
    off.unmount();
    const fixed = mount(FanWidget, 'fan.soffitto', [fan('on', { supported_features: 1 })]);
    expect(screen.getByRole('switch', { name: 'Ventilatore' })).toBeDisabled();
    expect(fixed.callService).not.toHaveBeenCalled();
  });

  it('velocità, oscillazione e direzione dal widget 2×1', () => {
    const view = mount(FanWidget, 'fan.soffitto', [fan('on')]);
    fireEvent.change(screen.getByRole('slider', { name: 'Velocità di Ventilatore' }), {
      target: { value: '70' },
    });
    expect(view.callService).toHaveBeenLastCalledWith('fan', 'set_percentage', {
      entity_id: 'fan.soffitto',
      percentage: 70,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Oscillazione di Ventilatore' }));
    expect(view.callService).toHaveBeenLastCalledWith('fan', 'oscillate', {
      entity_id: 'fan.soffitto',
      oscillating: true,
    });
    fireEvent.click(screen.getByRole('button', { name: /Direzione di Ventilatore/ }));
    expect(view.callService).toHaveBeenLastCalledWith('fan', 'set_direction', {
      entity_id: 'fan.soffitto',
      direction: 'reverse',
    });
  });

  it('1×1: stato e percentuale, comandi solo nella manopola', () => {
    mount(FanWidget, 'fan.soffitto', [fan('on')], { size: { w: 1, h: 1 } });
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.queryByRole('slider')).toBeNull();
  });

  it('richiesta in attesa fino alla conferma della velocità', () => {
    const view = mount(FanWidget, 'fan.soffitto', [fan('on')]);
    const slider = screen.getByRole('slider', { name: 'Velocità di Ventilatore' });
    fireEvent.change(slider, { target: { value: '80' } });
    expect(slider).toHaveAttribute('aria-busy', 'true');
    view.setEntities([fan('on', { percentage: 80 })]);
    expect(slider).not.toHaveAttribute('aria-busy');
  });

  it('dettagli: direzione e modalità preimpostata', () => {
    const view = mountDetails(FanDetails, 'fan.soffitto', [fan('on')]);
    fireEvent.click(screen.getByRole('button', { name: 'Indietro' }));
    expect(view.callService).toHaveBeenLastCalledWith('fan', 'set_direction', {
      entity_id: 'fan.soffitto',
      direction: 'reverse',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Normale' }));
    fireEvent.click(screen.getByRole('button', { name: 'Notte' }));
    expect(view.callService).toHaveBeenLastCalledWith('fan', 'set_preset_mode', {
      entity_id: 'fan.soffitto',
      preset_mode: 'notte',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Spegni' }));
    expect(view.callService).toHaveBeenLastCalledWith('fan', 'turn_off', { entity_id: 'fan.soffitto' });
  });
});

// ── Cover ──────────────────────────────────────────────────────────────────
const cover = (state = 'open', attributes: Record<string, unknown> = {}) =>
  fixtureEntity('cover.salotto', state, {
    friendly_name: 'Tapparella salotto',
    supported_features: 1 | 2 | 4 | 8 | 128,
    current_position: 60,
    current_tilt_position: 30,
    device_class: 'shutter',
    ...attributes,
  });

describe('CoverWidget e CoverDetails', () => {
  it('apri, ferma e chiudi con i servizi del legacy', () => {
    const view = mount(CoverWidget, 'cover_card_1', [cover()], { settings: { coverId: 'cover.salotto' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apri Tapparella salotto' }));
    expect(view.callService).toHaveBeenLastCalledWith('cover', 'open_cover', { entity_id: 'cover.salotto' });
    fireEvent.click(screen.getByRole('button', { name: 'Ferma Tapparella salotto' }));
    expect(view.callService).toHaveBeenLastCalledWith('cover', 'stop_cover', { entity_id: 'cover.salotto' });
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi Tapparella salotto' }));
    expect(view.callService).toHaveBeenLastCalledWith('cover', 'close_cover', { entity_id: 'cover.salotto' });
  });

  it('2×2: posizione inviata quando il cursore si ferma (200 ms), poi confermata', () => {
    vi.useFakeTimers();
    const view = mount(CoverWidget, 'cover_card_1', [cover()], {
      settings: { coverId: 'cover.salotto' },
      size: { w: 2, h: 2 },
    });
    const slider = screen.getByRole('slider', { name: 'Apertura di Tapparella salotto' });
    fireEvent.change(slider, { target: { value: '40' } });
    fireEvent.change(slider, { target: { value: '30' } });
    expect(view.callService).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(view.callService).toHaveBeenCalledTimes(1);
    expect(view.callService).toHaveBeenCalledWith('cover', 'set_cover_position', {
      entity_id: 'cover.salotto',
      position: 30,
    });
    expect(slider).toHaveAttribute('aria-busy', 'true');
    view.setEntities([cover('open', { current_position: 30 })]);
    expect(slider).not.toHaveAttribute('aria-busy');
  });

  it('senza coverId o con entità sparita: messaggio chiaro', () => {
    mount(CoverWidget, 'cover_card_9', [cover()], { settings: {} });
    expect(screen.getByText('Dispositivo non trovato')).toBeInTheDocument();
  });

  it('dettagli: preimpostazioni di posizione e inclinazione', () => {
    vi.useFakeTimers();
    const view = mountDetails(CoverDetails, 'cover_card_1', [cover()], { coverId: 'cover.salotto' });
    fireEvent.click(screen.getByRole('button', { name: 'Chiusa' }));
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(view.callService).toHaveBeenLastCalledWith('cover', 'set_cover_position', {
      entity_id: 'cover.salotto',
      position: 0,
    });
    fireEvent.change(screen.getByRole('slider', { name: 'Inclinazione di Tapparella salotto' }), {
      target: { value: '75' },
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(view.callService).toHaveBeenLastCalledWith('cover', 'set_cover_tilt_position', {
      entity_id: 'cover.salotto',
      tilt_position: 75,
    });
    expect(screen.getByText('Persiana')).toBeInTheDocument();
  });
});

// ── Lock ───────────────────────────────────────────────────────────────────
const lock = (state = 'locked', attributes: Record<string, unknown> = {}) =>
  fixtureEntity('lock.ingresso', state, {
    friendly_name: 'Porta di casa',
    supported_features: 1,
    ...attributes,
  });

describe('LockWidget e LockDetails', () => {
  it('sblocco con doppio tocco di conferma, poi lock.unlock', () => {
    const view = mount(LockWidget, 'lock.ingresso', [lock('locked')]);
    fireEvent.click(screen.getByRole('button', { name: 'Sblocca: Porta di casa' }));
    expect(view.callService).not.toHaveBeenCalled();
    expect(screen.getByText('Tocca di nuovo per sbloccare.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Conferma: Porta di casa' }));
    expect(view.callService).toHaveBeenCalledWith('lock', 'unlock', { entity_id: 'lock.ingresso' });
  });

  it('la conferma scade dopo 3 secondi', () => {
    vi.useFakeTimers();
    const view = mount(LockWidget, 'lock.ingresso', [lock('locked')]);
    fireEvent.click(screen.getByRole('button', { name: 'Sblocca: Porta di casa' }));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sblocca: Porta di casa' }));
    expect(view.callService).not.toHaveBeenCalled();
  });

  it('blocca e apri; lock_card_ usa lockId', () => {
    const view = mount(LockWidget, 'lock_card_1', [lock('unlocked')], {
      settings: { lockId: 'lock.ingresso' },
      size: { w: 2, h: 2 },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Blocca: Porta di casa' }));
    expect(view.callService).toHaveBeenLastCalledWith('lock', 'lock', { entity_id: 'lock.ingresso' });
    fireEvent.click(screen.getByRole('button', { name: 'Apri: Porta di casa' }));
    expect(view.callService).toHaveBeenLastCalledWith('lock', 'open', { entity_id: 'lock.ingresso' });
  });

  it('senza connessione o non disponibile non invia comandi', () => {
    const offline = mount(LockWidget, 'lock.ingresso', [lock('unlocked')], { conn: null });
    expect(screen.getByRole('button', { name: 'Blocca: Porta di casa' })).toBeDisabled();
    offline.unmount();
    mount(LockWidget, 'lock.ingresso', [lock('unavailable')]);
    expect(screen.getByRole('button', { name: 'Sblocca: Porta di casa' })).toBeDisabled();
  });

  it('codice richiesto: il widget apre i dettagli, dove il codice va nel payload', () => {
    const openDetails = vi.fn();
    const withCode = { code_format: '^\\d{4}$' };
    const view = mount(LockWidget, 'lock.ingresso', [lock('unlocked', withCode)], { openDetails });
    fireEvent.click(screen.getByRole('button', { name: 'Blocca: Porta di casa' }));
    expect(openDetails).toHaveBeenCalledWith('lock.ingresso');
    expect(view.callService).not.toHaveBeenCalled();
    view.unmount();

    const details = mountDetails(LockDetails, 'lock.ingresso', [lock('unlocked', withCode)]);
    fireEvent.click(screen.getByRole('button', { name: 'Blocca' }));
    expect(screen.getByText('Inserisci il codice della serratura.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Codice di Porta di casa'), { target: { value: ' 1234 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Blocca' }));
    expect(details.callService).toHaveBeenCalledWith('lock', 'lock', {
      entity_id: 'lock.ingresso',
      code: '1234',
    });
  });

  it('inceppata: stato in testo e LED di errore sull’icona (la cornice è del launcher)', () => {
    const { container } = mount(LockWidget, 'lock.ingresso', [lock('jammed')]);
    expect(screen.getAllByText('Inceppata').length).toBeGreaterThan(0);
    expect(container.querySelector('.ctl-badge-icon')).toHaveClass('aca-m--error');
    expect(container.querySelector('.aca-m--card')).toBeNull();
  });
});

// ── Automation ─────────────────────────────────────────────────────────────
const automation = (state = 'on') =>
  fixtureEntity('automation.notte', state, {
    friendly_name: 'Luci della notte',
    last_triggered: '2026-10-06T07:30:00Z',
  });

describe('AutomationWidget e AutomationDetails', () => {
  it('automation.toggle e attesa fino alla conferma', async () => {
    const view = mount(AutomationWidget, 'automation.notte', [automation('on')]);
    const toggle = screen.getByRole('switch', { name: 'Luci della notte' });
    fireEvent.click(toggle);
    expect(view.callService).toHaveBeenCalledWith('automation', 'toggle', { entity_id: 'automation.notte' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(toggle).toHaveAttribute('aria-busy', 'true');
    await flush();
    view.setEntities([automation('off')]);
    expect(toggle).not.toHaveAttribute('aria-busy');
    expect(screen.getByText('Disattivata')).toBeInTheDocument();
  });

  it('1×1 e 1×2: l’icona è l’interruttore', () => {
    const view = mount(AutomationWidget, 'automation.notte', [automation('off')], { size: { w: 1, h: 2 } });
    fireEvent.click(screen.getByRole('switch', { name: 'Luci della notte' }));
    expect(view.callService).toHaveBeenCalledWith('automation', 'toggle', { entity_id: 'automation.notte' });
    expect(screen.getByText(/Ultima esecuzione/)).toBeInTheDocument();
  });

  it('dettagli: interruttore e registro', () => {
    const view = mountDetails(AutomationDetails, 'automation.notte', [automation('on')]);
    fireEvent.click(screen.getByRole('switch', { name: 'Luci della notte' }));
    expect(view.callService).toHaveBeenCalledWith('automation', 'toggle', { entity_id: 'automation.notte' });
    expect(screen.getByRole('heading', { name: 'Cronologia' })).toBeInTheDocument();
  });
});
