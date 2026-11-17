import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CardSettings } from '@/@types/dashboard';
import { RoomDetails } from '@/components/widgets/utilities/room/RoomDetails';
import { RoomWidget } from '@/components/widgets/utilities/room/RoomWidget';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, renderWithRuntime } from './UtilityHarness';
const conn = () =>
  fakeConnection({
    'config/area_registry/list': () => [],
    'config/entity_registry/list': () => [],
    'config/device_registry/list': () => [],
  }).conn;
const services = {
  climate: { set_temperature: {}, set_hvac_mode: {} },
  light: { turn_on: {}, turn_off: {} },
  media_player: { media_play_pause: {}, media_next_track: {}, media_previous_track: {} },
  vacuum: { start: {}, pause: {}, return_to_base: {} },
};
const climate = (id: string, name: string, target: number) =>
  fixtureEntity(id, 'heat', {
    friendly_name: name,
    current_temperature: target - 1,
    temperature: target,
    min_temp: 10,
    max_temp: 30,
    target_temp_step: 0.5,
    temperature_unit: '°C',
    supported_features: 1,
    hvac_modes: ['heat', 'off'],
  });
const climates = fixtureEntities([
  climate('climate.a', 'Termostato A', 21),
  climate('climate.b', 'Termostato B', 19),
]);
const settings: CardSettings = {
  entityIds: ['climate.a', 'climate.b'],
  climateEntityId: 'climate.a',
  areaName: 'Sala',
};
const details = (value = settings) => (
  <RoomDetails
    id="room_card_targets"
    settingsKey="home::room_card_targets"
    settings={value}
    onClose={() => {}}
  />
);
async function ready() {
  await waitFor(() =>
    expect(screen.getByRole('slider', { name: 'Temperatura desiderata' })).not.toBeDisabled()
  );
}
function deferred() {
  let reject!: (error: Error) => void;
  const promise = new Promise<unknown>((_, no) => {
    reject = no;
  });
  return { promise, reject };
}
afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe('Stanze: destinazione dei controlli tra canali', () => {
  it('cambiare termostato cancella il debounce A senza inviare né ad A né a B', async () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    renderWithRuntime(details(), { entities: climates, conn: conn(), services, callService });
    await ready();
    vi.useFakeTimers();
    fireEvent.change(screen.getByRole('slider', { name: 'Temperatura desiderata' }), {
      target: { value: '22' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Termostato: Termostato A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Termostato B' }));
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(callService).not.toHaveBeenCalled();
    expect(screen.getByRole('slider', { name: 'Temperatura desiderata' })).toHaveValue('19');
    fireEvent.change(screen.getByRole('slider', { name: 'Temperatura desiderata' }), {
      target: { value: '20' },
    });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(callService).toHaveBeenCalledExactlyOnceWith('climate', 'set_temperature', {
      entity_id: 'climate.b',
      temperature: 20,
    });
  });
  it('cambiare il ruolo clima esplicito invalida il debounce anche con lista entità invariata', async () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    const ui = renderWithRuntime(details(), {
      entities: climates,
      conn: conn(),
      services,
      callService,
    });
    await ready();
    vi.useFakeTimers();
    fireEvent.change(screen.getByRole('slider', { name: 'Temperatura desiderata' }), {
      target: { value: '22' },
    });
    ui.update({}, details({ ...settings, climateEntityId: 'climate.b' }));
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(callService).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Termostato: Termostato B' })).toBeInTheDocument();
  });
  it('l’esito della precedente luce principale non compare sul nuovo ruolo', async () => {
    const pending = deferred(),
      callService = vi.fn(() => pending.promise);
    const lights = fixtureEntities([
      fixtureEntity('light.a', 'on'),
      fixtureEntity('light.b', 'off'),
    ]);
    const props = (main: string) => (
      <RoomWidget
        id="room_card_targets"
        settingsKey="home::room_card_targets"
        settings={{ areaName: 'Sala', entityIds: ['light.a', 'light.b'], mainLightEntityId: main }}
        size={{ w: 2, h: 2 }}
        editMode={false}
      />
    );
    const ui = renderWithRuntime(props('light.a'), {
      entities: lights,
      conn: conn(),
      services,
      callService,
    });
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Luce principale di Sala' })).not.toBeDisabled()
    );
    fireEvent.click(screen.getByRole('switch', { name: 'Luce principale di Sala' }));
    ui.update({}, props('light.b'));
    await act(async () => pending.reject(new Error('Late A')));
    expect(screen.queryByText('Comando non riuscito')).not.toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Luce principale di Sala' })).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });
  it.each(['media', 'vacuum'] as const)(
    'aggiornare i canali %s conserva richieste ed errori sull’esatto ID',
    async (kind) => {
      const pending = deferred(),
        callService = vi.fn(() => pending.promise),
        media = kind === 'media';
      const a = media ? 'media_player.a' : 'vacuum.a',
        b = media ? 'media_player.b' : 'vacuum.b';
      const entity = (id: string, state: string, name: string) =>
        fixtureEntity(id, state, {
          friendly_name: name,
          supported_features: media ? 1 | 16 | 32 | 16384 : 8192 | 4 | 16,
        });
      const data = fixtureEntities([
        entity(a, media ? 'playing' : 'idle', 'Canale A'),
        entity(b, media ? 'paused' : 'idle', 'Canale B'),
      ]);
      const current: CardSettings = { entityIds: media ? [b, a] : [a, b], areaName: 'Sala' };
      const ui = renderWithRuntime(details(current), {
        entities: data,
        conn: conn(),
        services,
        callService,
      });
      const action = media ? 'Brano successivo su Canale A' : 'Avvia Canale A';
      await waitFor(() => expect(screen.getByRole('button', { name: action })).not.toBeDisabled());
      fireEvent.click(screen.getByRole('button', { name: action }));
      ui.update(
        {
          entities: media
            ? {
                ...data,
                [a]: entity(a, 'paused', 'Canale A'),
                [b]: entity(b, 'playing', 'Canale B'),
              }
            : { ...data, [b]: entity(b, 'cleaning', 'Canale B') },
        },
        details(current)
      );
      const rowA = ui.container.querySelector(`[data-room-entity="${a}"]`) as HTMLElement;
      const rowB = ui.container.querySelector(`[data-room-entity="${b}"]`) as HTMLElement;
      expect(within(rowA).getByRole('button', { name: action })).toHaveAttribute(
        'aria-busy',
        'true'
      );
      expect(
        within(rowB).getByRole('button', {
          name: media ? 'Brano successivo su Canale B' : 'Metti in pausa Canale B',
        })
      ).not.toHaveAttribute('aria-busy', 'true');
      await act(async () => pending.reject(new Error('Late A')));
      expect(within(rowA).getByText('Comando non riuscito. Riprova.')).toBeInTheDocument();
      expect(within(rowB).queryByText('Comando non riuscito. Riprova.')).not.toBeInTheDocument();
    }
  );
});
