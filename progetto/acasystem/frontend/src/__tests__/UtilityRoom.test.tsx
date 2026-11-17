import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import type { LauncherApi, WidgetRuntime } from '@/@types/launcher';
import { LauncherProvider } from '@/hooks/launcher/LauncherContext';
import { RoomWidget, pagerIndex } from '@/components/widgets/utilities/room/RoomWidget';
import { RoomDetails } from '@/components/widgets/utilities/room/RoomDetails';
import { roomSummary } from '@/components/widgets/utilities/room/roomData';
import { SpacerWidget } from '@/components/widgets/utilities/spacer/SpacerWidget';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, renderWithRuntime as renderBase } from './UtilityHarness';

const conn = fakeConnection({
  'config/area_registry/list': () => [], 'config/entity_registry/list': () => [], 'config/device_registry/list': () => [],
}).conn;
const services = { light: { turn_on: {}, turn_off: {} }, media_player: { media_play_pause: {}, media_next_track: {}, media_previous_track: {} },
  vacuum: { start: {}, pause: {}, return_to_base: {} }, cover: { open_cover: {}, close_cover: {}, stop_cover: {} } };
const renderWithRuntime = (ui: ReactElement, overrides: Partial<WidgetRuntime> = {}) =>
  renderBase(ui, { conn, services, ...overrides });

const roomSettings = {
  areaName: 'Soggiorno',
  entityIds: [
    'light.soggiorno',
    'light.lampada',
    'sensor.soggiorno_temperature',
    'binary_sensor.soggiorno_motion',
    'media_player.soggiorno_tv',
    'vacuum.robot',
    'cover.soggiorno',
    'binary_sensor.porta',
    'switch.presa',
  ],
  excludedEntityIds: ['switch.presa'],
};

const entities = fixtureEntities([
  fixtureEntity('light.soggiorno', 'on', {
    brightness: 128,
    supported_color_modes: ['brightness'],
  }),
  fixtureEntity('light.lampada', 'off', { supported_color_modes: ['brightness'] }),
  fixtureEntity('sensor.soggiorno_temperature', '21.4', {
    device_class: 'temperature',
    unit_of_measurement: '°C',
  }),
  fixtureEntity('binary_sensor.soggiorno_motion', 'on', { device_class: 'motion' }),
  fixtureEntity('media_player.soggiorno_tv', 'playing', { media_title: 'Notiziario', supported_features: 1 | 16 | 32 | 16384 }),
  fixtureEntity('vacuum.robot', 'cleaning', { battery_level: 60, supported_features: 8192 | 4 | 16 }),
  fixtureEntity('cover.soggiorno', 'open', { supported_features: 1 | 2 | 8 }),
  fixtureEntity('binary_sensor.porta', 'on', { device_class: 'door' }),
  fixtureEntity('switch.presa', 'on'),
]);

const props = (
  settings: Record<string, unknown> = roomSettings,
  w = 2,
  h = 2,
  editMode = false
) => ({
  id: 'room_card_1',
  settingsKey: 'home::room_card_1',
  settings,
  size: { w, h },
  editMode,
});

const metric = createFixtureRuntime().haConfig;
const imperial = metric && { ...metric, unit_system: { ...metric.unit_system, temperature: '°F' } };

afterEach(() => {
  localStorage.clear();
});

describe('stanza: riepilogo', () => {
  it('rileva luci, temperatura, presenza, media, aspirapolvere, tapparella e porta (regole legacy)', () => {
    const summary = roomSummary(entities, roomSettings, metric);
    expect(summary.ids).not.toContain('switch.presa');
    expect(summary).toMatchObject({
      mainLightId: 'light.soggiorno',
      mainLightOn: true,
      temperature: 21.4,
      occupied: true,
      occupancyLabel: 'Movimento',
      lightsOn: 1,
      mediaPlaying: 1,
      vacuumLabel: 'Pulizia in corso',
      coverLabel: 'Aperta',
      doorOpen: true,
    });
    // media_player playing + cover open count as active devices.
    expect(summary.activeDevices).toBe(2);
  });

  it('temperatura nell’unità nativa del sensore anche con casa in °F', () => {
    expect(roomSummary(entities, roomSettings, imperial)).toMatchObject({ temperatureUnit: '°C' });
    expect(roomSummary(entities, roomSettings, imperial).temperature).toBe(21.4);
    // The reading remains in its native unit before the HA config is loaded too.
    expect(roomSummary(entities, roomSettings, null)).toMatchObject({
      temperature: 21.4,
      temperatureUnit: '°C',
    });
    renderWithRuntime(<RoomWidget {...props()} />, { entities, haConfig: imperial });
    expect(screen.getByText('21,4 °C')).toBeInTheDocument();
  });

  it('le impostazioni show* nascondono i chip', () => {
    renderWithRuntime(
      <RoomWidget {...props({ ...roomSettings, showTemp: false, showDoorChip: false })} />,
      { entities }
    );
    expect(screen.queryByText('21,4 °C')).not.toBeInTheDocument();
    expect(screen.queryByText('Porta aperta')).not.toBeInTheDocument();
    expect(screen.getByText('Pulizia in corso')).toBeInTheDocument();
  });
});

describe('stanza: widget', () => {
  it('2×2: nome, chip e luce principale (light.turn_off/turn_on)', async () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    renderWithRuntime(<RoomWidget {...props()} />, { entities, callService });
    expect(screen.getByText('Soggiorno')).toBeInTheDocument();
    expect(screen.getByText('21,4 °C')).toBeInTheDocument();
    // Visible chip on wide cells, icon-only chip on narrow cells (container query).
    expect(screen.getAllByText('Movimento')).toHaveLength(2);
    expect(screen.getByText('1 luce accesa')).toBeInTheDocument();
    expect(screen.getByText('Porta aperta')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Luce principale di Soggiorno' })).not.toBeDisabled());
    const toggle = screen.getByRole('switch', { name: 'Luce principale di Soggiorno' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(toggle);
    expect(callService).toHaveBeenCalledWith('light', 'turn_off', { entity_id: 'light.soggiorno' });
    // Requested: the switch shows «off» while waiting for confirmation.
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(toggle).toHaveAttribute('aria-busy', 'true');
  });

  it('luce principale scelta nelle impostazioni e taglia 2×1', async () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    renderWithRuntime(
      <RoomWidget {...props({ ...roomSettings, mainLightEntityId: 'light.lampada' }, 2, 1)} />,
      {
        entities,
        callService,
      }
    );
    expect(screen.getByText('21,4 °C · 1 luce accesa · Movimento')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Luce principale di Soggiorno' })).not.toBeDisabled());
    fireEvent.click(screen.getByRole('switch', { name: 'Luce principale di Soggiorno' }));
    expect(callService).toHaveBeenCalledWith('light', 'turn_on', { entity_id: 'light.lampada' });
  });

  it('il tocco apre i dettagli, oppure la pagina configurata (navigateOnTap)', () => {
    const openDetails = vi.fn();
    const view = renderWithRuntime(<RoomWidget {...props()} />, { entities, openDetails });
    const opener = screen.getByRole('button', { name: 'Soggiorno, apri i dettagli' });
    // Only the transparent opener presses the launcher frame; the light switch stays outside it.
    expect(opener).toHaveAttribute('data-widget-open');
    expect(view.container.querySelectorAll('[data-widget-open]')).toHaveLength(1);
    expect(
      opener.contains(screen.getByRole('switch', { name: 'Luce principale di Soggiorno' }))
    ).toBe(false);
    fireEvent.click(opener);
    expect(openDetails).toHaveBeenCalledWith('room_card_1');

    const goToPage = vi.fn();
    const launcher = {
      layout: {
        version: 1,
        cover: { enabled: true },
        pages: [
          { id: 'home', label: 'Casa', kind: 'widgets', placements: {} },
          { id: 'nascosta', label: 'Nascosta', kind: 'widgets', hidden: true, placements: {} },
          { id: 'soggiorno', label: 'Soggiorno', kind: 'widgets', placements: {} },
        ],
      },
      goToPage,
    } as unknown as LauncherApi;
    expect(pagerIndex(launcher, 'soggiorno')).toBe(2);
    view.update(
      {},
      <LauncherProvider value={launcher}>
        <RoomWidget
          {...props({ ...roomSettings, navigateOnTap: true, navigateToPageId: 'soggiorno' })}
        />
      </LauncherProvider>
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Soggiorno, vai alla pagina della stanza' })
    );
    expect(goToPage).toHaveBeenCalledWith(2);
  });

  it('stati: caricamento, stanza senza dispositivi, modifica inerte', () => {
    const view = renderWithRuntime(<RoomWidget {...props()} />, {
      entities,
      entitiesLoaded: false,
    });
    expect(screen.getByRole('status')).toHaveTextContent(/Caricamento/);
    view.update({ entitiesLoaded: true }, <RoomWidget {...props({ areaName: 'Vuota' })} />);
    expect(screen.getByText('Nessun dispositivo associato alla stanza')).toBeInTheDocument();
    const { container } = renderWithRuntime(<RoomWidget {...props(roomSettings, 2, 2, true)} />, {
      entities,
    });
    expect(container.querySelector('.utility-card')).toHaveAttribute('inert');
  });
});

describe('stanza: dettagli (servizi di RoomModal)', () => {
  const details = (settings: Record<string, unknown> = roomSettings) => (
    <RoomDetails
      id="room_card_1"
      settingsKey="home::room_card_1"
      settings={settings}
      onClose={() => {}}
    />
  );

  it('accendi o spegni tutte le luci, una chiamata per luce', async () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    renderWithRuntime(details(), { entities, callService });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Spegni tutte' })).not.toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: 'Spegni tutte' }));
    await waitFor(() => expect(callService).toHaveBeenCalledTimes(2));
    expect(callService).toHaveBeenCalledWith('light', 'turn_off', { entity_id: 'light.soggiorno' });
    expect(callService).toHaveBeenCalledWith('light', 'turn_off', { entity_id: 'light.lampada' });
  });

  it('media con media_play_pause, aspirapolvere con pause e return_to_base', async () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    renderWithRuntime(details(), { entities, callService });
    await waitFor(() => expect(screen.getByRole('button', { name: /Metti in pausa soggiorno tv/ })).not.toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: /Metti in pausa soggiorno tv/ }));
    expect(callService).toHaveBeenLastCalledWith('media_player', 'media_play_pause', {
      entity_id: 'media_player.soggiorno_tv',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Brano successivo su soggiorno tv' }));
    expect(callService).toHaveBeenLastCalledWith('media_player', 'media_next_track', {
      entity_id: 'media_player.soggiorno_tv',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Metti in pausa robot' }));
    expect(callService).toHaveBeenLastCalledWith('vacuum', 'pause', { entity_id: 'vacuum.robot' });
    fireEvent.click(screen.getByRole('button', { name: 'robot alla base' }));
    expect(callService).toHaveBeenLastCalledWith('vacuum', 'return_to_base', {
      entity_id: 'vacuum.robot',
    });
  });

  it('altre entità: tapparella aperta/ferma/chiusa; sezioni ripiegabili salvate come il legacy', async () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    renderWithRuntime(details(), { entities, callService });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Chiudi soggiorno' })).not.toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi soggiorno' }));
    expect(callService).toHaveBeenLastCalledWith('cover', 'close_cover', {
      entity_id: 'cover.soggiorno',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ferma soggiorno' }));
    expect(callService).toHaveBeenLastCalledWith('cover', 'stop_cover', {
      entity_id: 'cover.soggiorno',
    });
    const header = screen.getByRole('button', { name: 'Tapparelle' });
    expect(header).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(header);
    expect(header).toHaveAttribute('aria-expanded', 'false');
    expect(JSON.parse(localStorage.getItem('tunet_room_collapsed_soggiorno') ?? '{}')).toEqual({
      cover: true,
    });
  });

  it('luminosità di una luce: turn_on con brightness_pct, a 0 turn_off', async () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    renderWithRuntime(details(), { entities, callService });
    await waitFor(() => expect(screen.getByRole('slider', { name: 'Luminosità di lampada' })).not.toBeDisabled());
    const lights = screen.getByRole('button', { name: /Luci/ }).closest('section') as HTMLElement;
    // The slider holds the pointer: it never starts the launcher's long press.
    expect(
      within(lights)
        .getByRole('slider', { name: 'Luminosità di lampada' })
        .closest('[data-no-long-press]')
    ).not.toBeNull();
    fireEvent.change(within(lights).getByRole('slider', { name: 'Luminosità di lampada' }), {
      target: { value: '40' },
    });
    await waitFor(() =>
      expect(callService).toHaveBeenCalledWith('light', 'turn_on', {
        entity_id: 'light.lampada',
        brightness_pct: 40,
      })
    );
    fireEvent.change(within(lights).getByRole('slider', { name: 'Luminosità di soggiorno' }), {
      target: { value: '0' },
    });
    await waitFor(() =>
      expect(callService).toHaveBeenCalledWith('light', 'turn_off', {
        entity_id: 'light.soggiorno',
      })
    );
  });
});

describe('separatore', () => {
  const spacer = (settings: Record<string, unknown>, editMode = false) => (
    <SpacerWidget
      id="spacer_card_1"
      settingsKey="home::spacer_card_1"
      settings={settings}
      size={{ w: 4, h: 1 }}
      editMode={editMode}
    />
  );

  it('spazio vuoto, contorno leggero solo in modifica', () => {
    const view = renderWithRuntime(spacer({}));
    const root = view.container.querySelector('.utility-spacer');
    expect(root).not.toHaveAttribute('data-editing');
    expect(root?.textContent).toBe('');
    view.update({}, spacer({}, true));
    expect(view.container.querySelector('.utility-spacer')).toHaveAttribute('data-editing', 'true');
  });

  it('divisore con titolo allineato', () => {
    const { container } = renderWithRuntime(
      spacer({ variant: 'divider', heading: ' Esterno ', headingAlign: 'left' })
    );
    expect(screen.getByRole('separator', { name: 'Esterno' })).toBeInTheDocument();
    expect(container.querySelectorAll('.utility-divider__line')).toHaveLength(1);
  });
});
