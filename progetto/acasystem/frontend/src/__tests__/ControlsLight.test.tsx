import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CellSize } from '@/@types/launcher';
import { LightDetails } from '@/components/widgets/controls/light/LightDetails';
import { LightTile } from '@/components/widgets/controls/light/LightTile';
import { GESTURE_SEND_INTERVAL_MS } from '@/components/widgets/controls/shared/useThrottledSender';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, flush, renderWithRuntime, serviceMock } from './ControlsHarness';

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
    extra?: ReturnType<typeof fixtureEntity>[];
    callService?: ReturnType<typeof serviceMock>;
    editMode?: boolean;
    entitiesLoaded?: boolean;
    openDetails?: (id: string) => void;
    id?: string;
    settings?: Record<string, unknown>;
    offline?: boolean;
  } = {}
) {
  const callService = options.callService ?? serviceMock();
  const id = options.id ?? 'light.cucina';
  const view = renderWithRuntime(
    <LightTile
      id={id}
      settingsKey={id}
      settings={options.settings ?? {}}
      size={size}
      editMode={options.editMode ?? false}
    />,
    {
      entities: fixtureEntities([...(options.entity ? [options.entity] : [kitchen()]), ...(options.extra ?? [])]),
      callService,
      conn: options.offline ? null : fakeConnection().conn,
      entitiesLoaded: options.entitiesLoaded ?? true,
      openDetails: options.openDetails ?? (() => undefined),
    }
  );
  return { ...view, callService };
}

const orb = () => screen.getByRole('button', { name: /^Luce cucina: (spegni|accendi)/ });
const format = (container: HTMLElement) =>
  container.querySelector('[data-cell-format]')?.getAttribute('data-cell-format');

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('LightTile: un formato per dimensione', () => {
  it('1×1: tutto il cerchio accende e spegne, nessun cursore', () => {
    const view = renderLight({ w: 1, h: 1 });
    expect(format(view.container)).toBe('round');
    expect(orb()).toHaveAttribute('aria-pressed', 'true');
    expect(orb()).toHaveAccessibleName('Luce cucina: spegni (Accesa)');
    expect(screen.queryByRole('slider')).toBeNull();
    fireEvent.click(orb());
    expect(view.callService).toHaveBeenCalledWith('light', 'toggle', { entity_id: 'light.cucina' });
  });

  it('2×1: cerchio, nome e stato con la luminosità; il testo apre i dettagli', () => {
    const openDetails = vi.fn();
    const view = renderLight({ w: 2, h: 1 }, { openDetails });
    expect(format(view.container)).toBe('pill');
    expect(screen.getByText('Luce cucina')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dettagli: Luce cucina' }));
    expect(openDetails).toHaveBeenCalledWith('light.cucina');
  });

  it('1×2: riempimento verticale come cursore della luminosità', () => {
    const view = renderLight({ w: 1, h: 2 });
    expect(format(view.container)).toBe('tall');
    const slider = screen.getByRole('slider', { name: 'Luminosità di Luce cucina' });
    expect(slider).toHaveAttribute('aria-valuenow', '50');
    expect(slider).toHaveAttribute('aria-valuetext', '50%');
    expect(slider).toHaveStyle({ '--aca-cell-fill': '50%' });
  });

  it('1×2 non dimmerabile: cerchio sopra e testo sotto, niente cursore', () => {
    const view = renderLight({ w: 1, h: 2 }, { entity: kitchen('on', null, { supported_color_modes: ['onoff'] }) });
    expect(format(view.container)).toBe('tall');
    expect(screen.queryByRole('slider')).toBeNull();
    expect(orb()).toBeEnabled();
    expect(screen.getByText('Accesa')).toBeInTheDocument();
  });

  it('2×2: cerchio in alto e testo in basso', () => {
    const view = renderLight({ w: 2, h: 2 });
    expect(format(view.container)).toBe('square');
    expect(orb()).toBeEnabled();
    expect(screen.getByText('Accesa · 50%')).toBeInTheDocument();
  });

  it('gruppo: conta le luci accese e in 2×2 mostra un cerchio per luce', () => {
    const group = fixtureEntity('light.gruppo', 'on', {
      friendly_name: 'Soggiorno',
      entity_id: ['light.a', 'light.b'],
      supported_color_modes: ['brightness'],
      brightness: 200,
    });
    const members = [
      fixtureEntity('light.a', 'on', { friendly_name: 'Lampadario' }),
      fixtureEntity('light.b', 'off', { friendly_name: 'Piantana' }),
    ];
    const pill = renderLight({ w: 2, h: 1 }, { id: 'light.gruppo', entity: group, extra: members });
    expect(pill.getByText('1 di 2 accese')).toBeInTheDocument();
    pill.unmount();
    const view = renderLight({ w: 2, h: 2 }, { id: 'light.gruppo', entity: group, extra: members });
    expect(view.container.querySelector('.aca-cell-tile--module')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Lampadario: spegni' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Piantana: accendi' }));
    expect(view.callService).toHaveBeenCalledWith('light', 'toggle', { entity_id: 'light.b' });
  });

  it('dispositivo con più canali: il modulo usa i canali, non quelli tecnici', () => {
    const settings = {
      productDevice: {
        version: 1,
        family: 'light',
        deviceId: 'dev1',
        primaryEntityId: 'light.cucina',
        channelEntityIds: ['light.cucina', 'light.isola', 'light.servizio'],
        secondaryEntityIds: [],
        technicalEntityIds: ['light.servizio'],
      },
    };
    renderLight({ w: 2, h: 2 }, {
      settings,
      extra: [
        fixtureEntity('light.isola', 'off', { friendly_name: 'Isola' }),
        fixtureEntity('light.servizio', 'off', { friendly_name: 'Servizio' }),
      ],
    });
    expect(screen.getByRole('button', { name: 'Isola: accendi' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Servizio/ })).toBeNull();
  });
});

describe('LightTile: stati', () => {
  it('caricamento: skeleton con stato annunciato', () => {
    renderLight({ w: 1, h: 1 }, { entitiesLoaded: false });
    expect(screen.getByRole('status')).toHaveTextContent('Caricamento del dispositivo…');
  });

  it('entità mancante: messaggio chiaro, nessun comando', () => {
    renderWithRuntime(
      <LightTile id="light.sparita" settingsKey="light.sparita" settings={{}} size={{ w: 2, h: 2 }} editMode={false} />
    );
    expect(screen.getByText('Dispositivo non trovato')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('non disponibile: comando disabilitato, glifo di avviso e testo esplicito', () => {
    const { callService, container } = renderLight({ w: 2, h: 1 }, { entity: kitchen('unavailable', null) });
    expect(orb()).toBeDisabled();
    expect(screen.getByText('Non disponibile')).toBeInTheDocument();
    expect(container.querySelector('.aca-cell-warning')).not.toBeNull();
    fireEvent.click(orb());
    expect(callService).not.toHaveBeenCalled();
  });

  it('1×1 non disponibile: il glifo di avviso e lo stato nel nome accessibile', () => {
    renderLight({ w: 1, h: 1 }, { entity: kitchen('unavailable', null) });
    expect(orb()).toBeDisabled();
    expect(orb()).toHaveAccessibleName('Luce cucina: accendi (Non disponibile)');
  });

  it('modalità modifica: comandi e apertura dei dettagli disabilitati', () => {
    const { callService } = renderLight({ w: 2, h: 1 }, { editMode: true });
    expect(orb()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Dettagli: Luce cucina' })).toBeDisabled();
    fireEvent.click(orb());
    expect(callService).not.toHaveBeenCalled();
  });

  it('senza collegamento con la casa nessun comando parte e chi usa un lettore lo sente', () => {
    const { callService } = renderLight({ w: 2, h: 1 }, { offline: true });
    expect(orb()).toBeDisabled();
    expect(screen.getByText('Collegamento assente')).toHaveClass('sr-only');
    fireEvent.click(orb());
    expect(callService).not.toHaveBeenCalled();
  });

  it('i comandi non avviano la pressione lunga del launcher', () => {
    renderLight({ w: 1, h: 2 });
    expect(screen.getByRole('slider')).toHaveAttribute('data-no-long-press');
    cleanup();
    renderLight({ w: 2, h: 1 });
    expect(orb()).toHaveAttribute('data-no-long-press');
  });
});

describe('LightTile: richiesto e confermato', () => {
  it('il tocco chiama light.toggle e resta in attesa fino alla conferma di HA', () => {
    const view = renderLight({ w: 2, h: 1 });
    fireEvent.click(orb());
    expect(view.callService).toHaveBeenCalledWith('light', 'toggle', { entity_id: 'light.cucina' });
    expect(orb()).toHaveAttribute('aria-pressed', 'false');
    expect(orb()).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('In attesa di conferma…')).toBeInTheDocument();
    view.setEntities([kitchen('off', null)]);
    expect(orb()).not.toHaveAttribute('aria-busy');
    expect(orb()).toHaveAttribute('aria-pressed', 'false');
  });

  it('un errore del comando non sembra riuscito: torna il valore confermato con un messaggio', async () => {
    const callService = serviceMock(async () => {
      throw new Error('rifiutato');
    });
    const { container } = renderLight({ w: 2, h: 1 }, { callService });
    fireEvent.click(orb());
    await flush();
    expect(orb()).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Comando non riuscito');
    expect(container.querySelector('[data-widget-error="true"]')).not.toBeNull();
  });

  it('senza conferma entro il tempo massimo lo segnala e mostra lo stato reale', () => {
    vi.useFakeTimers();
    renderLight({ w: 2, h: 1 });
    fireEvent.click(orb());
    expect(orb()).toHaveAttribute('aria-pressed', 'false');
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(orb()).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByText('Nessuna conferma dal dispositivo').length).toBeGreaterThan(0);
  });

  it('le frecce sul riempimento regolano la luminosità con light.turn_on e brightness 0–255', () => {
    const { callService } = renderLight({ w: 1, h: 2 });
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    expect(callService).toHaveBeenLastCalledWith('light', 'turn_on', {
      entity_id: 'light.cucina',
      brightness: 153,
    });
    expect(slider).toHaveAttribute('aria-valuenow', '60');
    fireEvent.keyDown(slider, { key: 'Enter' });
    expect(callService).toHaveBeenLastCalledWith('light', 'toggle', { entity_id: 'light.cucina' });
  });
});

describe('LightTile: trascinamento sul riempimento con invii limitati', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  const box = (element: HTMLElement) => {
    element.getBoundingClientRect = () =>
      ({ top: 100, bottom: 300, height: 200, left: 0, right: 80, width: 80, x: 0, y: 100, toJSON: () => ({}) }) as DOMRect;
  };

  it('anteprima immediata, invii limitati più quello finale, nessun toggle al rilascio', () => {
    const view = renderLight({ w: 1, h: 2 });
    const slider = screen.getByRole('slider');
    box(slider);
    const brightnessCalls = () => view.callService.mock.calls.filter(([, service]) => service === 'turn_on');

    fireEvent.pointerDown(slider, { pointerId: 1, clientY: 200, button: 0, pointerType: 'touch' });
    fireEvent.pointerMove(slider, { pointerId: 1, clientY: 197, pointerType: 'touch' });
    expect(view.callService).not.toHaveBeenCalled();

    // y 180 on a 100–300 box = 60%: brightness 153, sent at once.
    fireEvent.pointerMove(slider, { pointerId: 1, clientY: 180, pointerType: 'touch' });
    expect(brightnessCalls()).toHaveLength(1);
    expect(view.callService).toHaveBeenLastCalledWith('light', 'turn_on', { entity_id: 'light.cucina', brightness: 153 });
    expect(slider).toHaveAttribute('aria-valuenow', '60');

    fireEvent.pointerMove(slider, { pointerId: 1, clientY: 140, pointerType: 'touch' });
    expect(slider).toHaveAttribute('aria-valuenow', '80');
    expect(brightnessCalls()).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(GESTURE_SEND_INTERVAL_MS);
    });
    expect(brightnessCalls()).toHaveLength(2);

    fireEvent.pointerUp(slider, { pointerId: 1, clientY: 100, pointerType: 'touch' });
    expect(view.callService).toHaveBeenLastCalledWith('light', 'turn_on', { entity_id: 'light.cucina', brightness: 255 });
    expect(view.callService.mock.calls.some(([, service]) => service === 'toggle')).toBe(false);

    view.setEntities([kitchen('on', 255)]);
    expect(slider).toHaveAttribute('aria-valuenow', '100');
  });

  it('un movimento sotto la soglia resta un tocco: accende o spegne', () => {
    const view = renderLight({ w: 1, h: 2 });
    const slider = screen.getByRole('slider');
    box(slider);
    fireEvent.pointerDown(slider, { pointerId: 2, clientY: 200, button: 0, pointerType: 'touch' });
    fireEvent.pointerMove(slider, { pointerId: 2, clientY: 197, pointerType: 'touch' });
    fireEvent.pointerUp(slider, { pointerId: 2, clientY: 197, pointerType: 'touch' });
    expect(view.callService).toHaveBeenCalledTimes(1);
    expect(view.callService).toHaveBeenCalledWith('light', 'toggle', { entity_id: 'light.cucina' });
  });

  it('trascinare in fondo chiede brightness 0 (spegnimento)', () => {
    const view = renderLight({ w: 1, h: 2 });
    const slider = screen.getByRole('slider');
    box(slider);
    fireEvent.pointerDown(slider, { pointerId: 3, clientY: 150, button: 0, pointerType: 'touch' });
    fireEvent.pointerMove(slider, { pointerId: 3, clientY: 320, pointerType: 'touch' });
    fireEvent.pointerUp(slider, { pointerId: 3, clientY: 320, pointerType: 'touch' });
    expect(view.callService).toHaveBeenLastCalledWith('light', 'turn_on', { entity_id: 'light.cucina', brightness: 0 });
    expect(slider).toHaveAttribute('aria-valuenow', '0');
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
