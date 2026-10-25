import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CellSize } from '@/@types/launcher';
import { LightDetails } from '@/components/widgets/controls/light/LightDetails';
import { LightWidget } from '@/components/widgets/controls/light/LightWidget';
import { GESTURE_SEND_INTERVAL_MS } from '@/components/widgets/controls/shared/useThrottledSender';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { flush, renderWithRuntime, serviceMock } from './ControlsHarness';

const kitchen = (
  state = 'on',
  brightness: number | null = 128,
  extra: Record<string, unknown> = {}
) =>
  fixtureEntity('light.cucina', state, {
    friendly_name: 'Luce cucina',
    supported_color_modes: ['brightness'],
    ...(brightness === null ? {} : { brightness }),
    ...extra,
  });

function renderLight(
  size: CellSize,
  options: {
    entity?: ReturnType<typeof kitchen>;
    callService?: ReturnType<typeof serviceMock>;
    editMode?: boolean;
    entitiesLoaded?: boolean;
    openDetails?: (id: string) => void;
  } = {}
) {
  const callService = options.callService ?? serviceMock();
  const view = renderWithRuntime(
    <LightWidget
      id="light.cucina"
      settingsKey="light.cucina"
      settings={{}}
      size={size}
      editMode={options.editMode ?? false}
    />,
    {
      entities: fixtureEntities(options.entity ? [options.entity] : [kitchen()]),
      callService,
      entitiesLoaded: options.entitiesLoaded ?? true,
      openDetails: options.openDetails ?? (() => undefined),
    }
  );
  return { ...view, callService };
}

const knob = () => screen.getByRole('switch', { name: 'Luce cucina' });

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('LightWidget: densità per dimensione', () => {
  it('1×1: manopola, percentuale e nome, senza +/−', () => {
    renderLight({ w: 1, h: 1 });
    expect(knob()).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('Luce cucina')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aumenta la luminosità/ })).toBeNull();
    expect(screen.queryByRole('slider')).toBeNull();
  });

  it('2×1 e 1×2: alternativa +/− al gesto', () => {
    renderLight({ w: 2, h: 1 });
    expect(
      screen.getByRole('button', { name: 'Aumenta la luminosità di Luce cucina' })
    ).toBeEnabled();
    expect(screen.getByText('Acceso')).toBeInTheDocument();
    cleanup();
    renderLight({ w: 1, h: 2 });
    expect(
      screen.getByRole('button', { name: 'Diminuisci la luminosità di Luce cucina' })
    ).toBeEnabled();
  });

  it('2×2: cursore della luminosità', () => {
    renderLight({ w: 2, h: 2 });
    const slider = screen.getByRole('slider', { name: 'Luminosità di Luce cucina' });
    expect(slider).toHaveValue('50');
    expect(slider).toHaveAttribute('aria-valuetext', '50%');
  });

  it('luce non dimmerabile: niente percentuale né gesto', () => {
    renderLight(
      { w: 2, h: 1 },
      { entity: kitchen('on', null, { supported_color_modes: ['onoff'] }) }
    );
    expect(knob()).not.toHaveAttribute('aria-describedby');
    expect(screen.queryByRole('button', { name: /luminosità/ })).toBeNull();
  });

  it('gruppo: conta le luci accese', () => {
    const view = renderWithRuntime(
      <LightWidget
        id="light.gruppo"
        settingsKey="light.gruppo"
        settings={{}}
        size={{ w: 2, h: 1 }}
        editMode={false}
      />,
      {
        entities: fixtureEntities([
          fixtureEntity('light.gruppo', 'on', {
            friendly_name: 'Soggiorno',
            entity_id: ['light.a', 'light.b'],
            supported_color_modes: ['brightness'],
            brightness: 200,
          }),
          fixtureEntity('light.a', 'on'),
          fixtureEntity('light.b', 'off'),
        ]),
      }
    );
    expect(view.getByText('1 di 2 accese')).toBeInTheDocument();
  });
});

describe('LightWidget: stati', () => {
  it('caricamento: skeleton con stato annunciato', () => {
    renderLight({ w: 1, h: 1 }, { entitiesLoaded: false });
    expect(screen.getByRole('status')).toHaveTextContent('Caricamento del dispositivo…');
  });

  it('entità mancante: messaggio chiaro, nessun comando', () => {
    renderWithRuntime(
      <LightWidget
        id="light.sparita"
        settingsKey="light.sparita"
        settings={{}}
        size={{ w: 2, h: 2 }}
        editMode={false}
      />
    );
    expect(screen.getByText('Dispositivo non trovato')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('non disponibile: comandi disabilitati e testo esplicito', () => {
    const { callService } = renderLight({ w: 2, h: 1 }, { entity: kitchen('unavailable', null) });
    expect(knob()).toBeDisabled();
    expect(screen.getByText('Non disponibile')).toBeInTheDocument();
    fireEvent.click(knob());
    expect(callService).not.toHaveBeenCalled();
  });

  it('modalità modifica: comandi e apertura dei dettagli disabilitati', () => {
    const { callService } = renderLight({ w: 2, h: 1 }, { editMode: true });
    expect(knob()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Dettagli: Luce cucina' })).toBeDisabled();
    fireEvent.click(knob());
    expect(callService).not.toHaveBeenCalled();
  });

  it('il tocco sulla scheda apre i dettagli', () => {
    const openDetails = vi.fn();
    renderLight({ w: 2, h: 1 }, { openDetails });
    fireEvent.click(screen.getByRole('button', { name: 'Dettagli: Luce cucina' }));
    expect(openDetails).toHaveBeenCalledWith('light.cucina');
  });
});

describe('LightWidget: richiesto e confermato', () => {
  it('il tocco chiama light.toggle e resta in attesa fino alla conferma di HA', () => {
    const view = renderLight({ w: 2, h: 1 });
    fireEvent.click(knob());
    expect(view.callService).toHaveBeenCalledWith('light', 'toggle', { entity_id: 'light.cucina' });
    expect(knob()).toHaveAttribute('aria-checked', 'false');
    expect(knob()).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('In attesa di conferma…')).toBeInTheDocument();
    view.setEntities([kitchen('off', null)]);
    expect(knob()).not.toHaveAttribute('aria-busy');
    expect(knob()).toHaveAttribute('aria-checked', 'false');
  });

  it('un errore del comando non sembra riuscito: torna il valore confermato con un messaggio', async () => {
    const callService = serviceMock(async () => {
      throw new Error('rifiutato');
    });
    renderLight({ w: 2, h: 1 }, { callService });
    fireEvent.click(knob());
    await flush();
    expect(knob()).toHaveAttribute('aria-checked', 'true');
    expect(knob()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Comando non riuscito');
  });

  it('senza conferma entro il tempo massimo lo segnala e mostra lo stato reale', () => {
    vi.useFakeTimers();
    renderLight({ w: 2, h: 1 });
    fireEvent.click(knob());
    expect(knob()).toHaveAttribute('aria-checked', 'false');
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(knob()).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Nessuna conferma da Home Assistant')).toBeInTheDocument();
  });

  it('+/− chiedono la luminosità con light.turn_on e brightness 0–255', () => {
    const { callService } = renderLight({ w: 2, h: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Aumenta la luminosità di Luce cucina' }));
    expect(callService).toHaveBeenLastCalledWith('light', 'turn_on', {
      entity_id: 'light.cucina',
      brightness: 153,
    });
    expect(screen.getByText('60')).toBeInTheDocument();
  });

  it('le frecce sulla manopola regolano la luminosità', () => {
    const { callService } = renderLight({ w: 1, h: 1 });
    fireEvent.keyDown(knob(), { key: 'ArrowDown' });
    expect(callService).toHaveBeenLastCalledWith('light', 'turn_on', {
      entity_id: 'light.cucina',
      brightness: 102,
    });
  });
});

describe('LightWidget: gesto sulla luminosità con invii limitati', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('anteprima immediata, un invio ogni intervallo più quello finale, nessun toggle al rilascio', () => {
    const view = renderLight({ w: 1, h: 1 });
    const target = knob();
    const brightnessCalls = () =>
      view.callService.mock.calls.filter(([, service]) => service === 'turn_on');

    fireEvent.pointerDown(target, { pointerId: 1, clientY: 300, button: 0, pointerType: 'touch' });
    fireEvent.pointerMove(target, { pointerId: 1, clientY: 298, pointerType: 'touch' });
    expect(view.callService).not.toHaveBeenCalled();

    // 16 px up = +10%: 60% → brightness 153, sent at once.
    fireEvent.pointerMove(target, { pointerId: 1, clientY: 284, pointerType: 'touch' });
    expect(brightnessCalls()).toHaveLength(1);
    expect(view.callService).toHaveBeenLastCalledWith('light', 'turn_on', {
      entity_id: 'light.cucina',
      brightness: 153,
    });
    expect(screen.getByText('60')).toBeInTheDocument();
    expect(target).toHaveAttribute('aria-busy', 'true');

    act(() => {
      vi.advanceTimersByTime(50);
    });
    fireEvent.pointerMove(target, { pointerId: 1, clientY: 268, pointerType: 'touch' });
    act(() => {
      vi.advanceTimersByTime(50);
    });
    fireEvent.pointerMove(target, { pointerId: 1, clientY: 252, pointerType: 'touch' });
    // The preview follows every move, the light only every interval.
    expect(screen.getByText('80')).toBeInTheDocument();
    expect(brightnessCalls()).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(GESTURE_SEND_INTERVAL_MS - 100);
    });
    expect(brightnessCalls()).toHaveLength(2);
    expect(view.callService).toHaveBeenLastCalledWith('light', 'turn_on', {
      entity_id: 'light.cucina',
      brightness: 204,
    });

    fireEvent.pointerMove(target, { pointerId: 1, clientY: 236, pointerType: 'touch' });
    fireEvent.pointerUp(target, { pointerId: 1, clientY: 220, pointerType: 'touch' });
    // Final value at release, without waiting for the interval.
    expect(brightnessCalls()).toHaveLength(3);
    expect(view.callService).toHaveBeenLastCalledWith('light', 'turn_on', {
      entity_id: 'light.cucina',
      brightness: 255,
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(brightnessCalls()).toHaveLength(3);

    // The click that follows the drag does not switch the light.
    fireEvent.click(target);
    expect(view.callService).toHaveBeenCalledTimes(3);

    // Requested until HA reports it, then confirmed.
    expect(target).toHaveAttribute('aria-busy', 'true');
    view.setEntities([kitchen('on', 255)]);
    expect(target).not.toHaveAttribute('aria-busy');
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('un movimento sotto la soglia resta un tocco: accende o spegne', () => {
    const view = renderLight({ w: 1, h: 1 });
    const target = knob();
    fireEvent.pointerDown(target, { pointerId: 2, clientY: 200, button: 0, pointerType: 'touch' });
    fireEvent.pointerMove(target, { pointerId: 2, clientY: 197, pointerType: 'touch' });
    fireEvent.pointerUp(target, { pointerId: 2, clientY: 197, pointerType: 'touch' });
    fireEvent.click(target);
    expect(view.callService).toHaveBeenCalledTimes(1);
    expect(view.callService).toHaveBeenCalledWith('light', 'toggle', { entity_id: 'light.cucina' });
  });

  it('trascinare in basso fino a 0 chiede brightness 0 (spegnimento), come il cursore legacy', () => {
    const view = renderLight({ w: 1, h: 1 });
    const target = knob();
    fireEvent.pointerDown(target, { pointerId: 3, clientY: 100, button: 0, pointerType: 'touch' });
    fireEvent.pointerMove(target, { pointerId: 3, clientY: 300, pointerType: 'touch' });
    fireEvent.pointerUp(target, { pointerId: 3, clientY: 300, pointerType: 'touch' });
    expect(view.callService).toHaveBeenLastCalledWith('light', 'turn_on', {
      entity_id: 'light.cucina',
      brightness: 0,
    });
    expect(target).toHaveAttribute('aria-checked', 'false');
  });
});

describe('LightDetails', () => {
  const details = (entities: ReturnType<typeof fixtureEntity>[], id = 'light.cucina') => {
    const callService = serviceMock();
    const view = renderWithRuntime(
      <LightDetails id={id} settingsKey={id} settings={{}} onClose={() => undefined} />,
      { entities: fixtureEntities(entities), callService }
    );
    return { ...view, callService };
  };

  it('accensione e luminosità con gli stessi servizi del legacy', () => {
    const { callService } = details([kitchen()]);
    fireEvent.click(screen.getByRole('switch', { name: 'Accensione di Luce cucina' }));
    expect(callService).toHaveBeenLastCalledWith('light', 'toggle', { entity_id: 'light.cucina' });
    fireEvent.change(screen.getByRole('slider', { name: 'Luminosità di Luce cucina' }), {
      target: { value: '30' },
    });
    expect(callService).toHaveBeenLastCalledWith('light', 'turn_on', {
      entity_id: 'light.cucina',
      brightness: 77,
    });
  });

  it('temperatura del colore in kelvin quando supportata', () => {
    const { callService } = details([
      kitchen('on', 128, {
        supported_color_modes: ['color_temp'],
        min_color_temp_kelvin: 2000,
        max_color_temp_kelvin: 6500,
        color_temp_kelvin: 3000,
      }),
    ]);
    const slider = screen.getByRole('slider', { name: 'Temperatura del colore di Luce cucina' });
    expect(slider).toHaveValue('3000');
    fireEvent.change(slider, { target: { value: '4000' } });
    expect(callService).toHaveBeenLastCalledWith('light', 'turn_on', {
      entity_id: 'light.cucina',
      color_temp_kelvin: 4000,
    });
    expect(screen.queryByRole('slider', { name: /Tonalità/ })).toBeNull();
  });

  it('colore come hs_color [tonalità, 100] quando supportato', () => {
    const { callService } = details([
      kitchen('on', 128, { supported_color_modes: ['hs'], hs_color: [30, 100] }),
    ]);
    fireEvent.change(screen.getByRole('slider', { name: 'Tonalità di Luce cucina' }), {
      target: { value: '200' },
    });
    expect(callService).toHaveBeenLastCalledWith('light', 'turn_on', {
      entity_id: 'light.cucina',
      hs_color: [200, 100],
    });
  });

  it('sotto-luci del gruppo con interruttore e luminosità propri', () => {
    const { callService } = details(
      [
        fixtureEntity('light.gruppo', 'on', {
          friendly_name: 'Soggiorno',
          entity_id: ['light.a', 'light.b'],
          supported_color_modes: ['brightness'],
          brightness: 100,
        }),
        fixtureEntity('light.a', 'on', {
          friendly_name: 'Lampada A',
          supported_color_modes: ['brightness'],
          brightness: 255,
        }),
        fixtureEntity('light.b', 'off', {
          friendly_name: 'Lampada B',
          supported_color_modes: ['onoff'],
        }),
      ],
      'light.gruppo'
    );
    const members = screen.getByRole('list');
    fireEvent.click(within(members).getByRole('switch', { name: 'Accensione di Lampada B' }));
    expect(callService).toHaveBeenLastCalledWith('light', 'toggle', { entity_id: 'light.b' });
    fireEvent.change(within(members).getByRole('slider', { name: 'Luminosità di Lampada A' }), {
      target: { value: '20' },
    });
    expect(callService).toHaveBeenLastCalledWith('light', 'turn_on', {
      entity_id: 'light.a',
      brightness: 51,
    });
    expect(within(members).queryByRole('slider', { name: 'Luminosità di Lampada B' })).toBeNull();
  });
});
