import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findWidgetDefinition } from '@/components/widgets/registry';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { CategoryWidgetContent } from '@/templates/launcher/CategoryWidgetContent';
import {
  AdaptiveCategoryWidget,
  calculateWidgetTier,
} from '@/templates/launcher/AdaptiveCategoryWidget';
import { createFixtureRuntime as createBaseRuntime, fixtureEntity } from '@/utils/fixtures/runtime';
import { adaptiveFixtureServices } from '@/utils/fixtures/adaptiveData';
const createFixtureRuntime = () =>
  createBaseRuntime({ conn: {} as never, services: adaptiveFixtureServices });

beforeEach(() => {
  vi.stubGlobal(
    'PointerEvent',
    class extends MouseEvent {
      pointerId: number;
      constructor(type: string, init: PointerEventInit) {
        super(type, init);
        this.pointerId = init.pointerId ?? 1;
      }
    }
  );
});

describe('calculateWidgetTier', () => {
  it('assigns tiers based on grid cell dimensions', () => {
    expect(calculateWidgetTier(1, 1)).toBe('compact');
    expect(calculateWidgetTier(2, 1)).toBe('compact');
    expect(calculateWidgetTier(2, 2)).toBe('standard');
    expect(calculateWidgetTier(3, 2)).toBe('standard');
    expect(calculateWidgetTier(4, 2)).toBe('large');
    expect(calculateWidgetTier(3, 3)).toBe('large');
    expect(calculateWidgetTier(4, 4)).toBe('page');
  });
});

describe('AdaptiveCategoryWidget (Fase 4 / Tappa A - Controlli singoli)', () => {
  it('renders a bound light with brightness knob and dispatches HA service calls', () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    const lightEntity = fixtureEntity('light.salotto', 'on', {
      friendly_name: 'Luce Salotto',
      brightness: 128,
      supported_color_modes: ['brightness'],
    });

    const runtime = {
      ...createFixtureRuntime(),
      entities: { 'light.salotto': lightEntity },
      callService,
    };

    const { container } = render(
      <WidgetRuntimeProvider value={runtime}>
        <AdaptiveCategoryWidget
          type="light"
          entityId="light.salotto"
          size={{ w: 2, h: 2 }}
          editMode={false}
        />
      </WidgetRuntimeProvider>
    );

    expect(screen.getByRole('slider', { name: 'Luminosità della luce' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accensione luce' })).toBeInTheDocument();
    expect(container.querySelector('.uikwa-chart')).toBeInTheDocument();

    const toggleBtn = screen.getByRole('button', { name: 'Accensione luce' });
    fireEvent.click(toggleBtn);
    expect(callService).toHaveBeenCalledWith('light', 'turn_off', { entity_id: 'light.salotto' });
  });

  it('renders compact light without chart, centered with single primary knob or toggle', () => {
    const lightEntity = fixtureEntity('light.salotto', 'on', {
      friendly_name: 'Luce Salotto',
      brightness: 128,
      supported_color_modes: ['brightness'],
    });

    const runtime = {
      ...createFixtureRuntime(),
      entities: { 'light.salotto': lightEntity },
    };

    const { container } = render(
      <WidgetRuntimeProvider value={runtime}>
        <AdaptiveCategoryWidget
          type="light"
          entityId="light.salotto"
          size={{ w: 1, h: 1 }}
          editMode={false}
        />
      </WidgetRuntimeProvider>
    );

    expect(container.querySelector('.aca-adaptive-widget')).toHaveAttribute('data-tier', 'compact');
    expect(container.querySelector('.aca-adaptive-widget__chart-wrap')).toBeNull();
    expect(screen.getByRole('button', { name: 'Accensione luce' })).toBeInTheDocument();
  });

  it('renders a climate widget with target temperature and dispatches set_temperature', () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    const climateEntity = fixtureEntity('climate.soggiorno', 'heat', {
      friendly_name: 'Termostato',
      current_temperature: 20.5,
      temperature: 22.0,
      supported_features: 1,
      min_temp: 16,
      max_temp: 28,
      target_temp_step: 0.5,
    });

    const runtime = {
      ...createFixtureRuntime(),
      entities: { 'climate.soggiorno': climateEntity },
      callService,
    };

    render(
      <WidgetRuntimeProvider value={runtime}>
        <AdaptiveCategoryWidget
          type="climate"
          entityId="climate.soggiorno"
          size={{ w: 2, h: 2 }}
          editMode={false}
        />
      </WidgetRuntimeProvider>
    );

    const tempKnob = screen.getByRole('slider', { name: 'Temperatura desiderata' });
    expect(tempKnob).toBeInTheDocument();
    expect(screen.getByText('20,5')).toBeInTheDocument();

    fireEvent.keyDown(tempKnob, { key: 'ArrowUp' });
    expect(callService).toHaveBeenCalledWith('climate', 'set_temperature', {
      entity_id: 'climate.soggiorno',
      temperature: 22.5,
    });
  });

  it('renders a cover widget and dispatches set_cover_position', () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    const coverEntity = fixtureEntity('cover.salone', 'open', {
      friendly_name: 'Tapparella Salone',
      current_position: 80,
      supported_features: 15,
    });

    const runtime = {
      ...createFixtureRuntime(),
      entities: { 'cover.salone': coverEntity },
      callService,
    };

    render(
      <WidgetRuntimeProvider value={runtime}>
        <AdaptiveCategoryWidget
          type="cover"
          entityId="cover.salone"
          size={{ w: 2, h: 2 }}
          editMode={false}
        />
      </WidgetRuntimeProvider>
    );

    const coverKnob = screen.getByRole('slider', { name: 'Apertura tapparella' });
    expect(coverKnob).toBeInTheDocument();

    fireEvent.keyDown(coverKnob, { key: 'ArrowDown' });
    expect(callService).toHaveBeenCalledWith('cover', 'set_cover_position', {
      entity_id: 'cover.salone',
      position: 79,
    });
  });

  it('renders a lock widget and dispatches lock command', () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    const lockEntity = fixtureEntity('lock.ingresso', 'unlocked', {
      friendly_name: 'Serratura Ingresso',
    });

    const runtime = {
      ...createFixtureRuntime(),
      entities: { 'lock.ingresso': lockEntity },
      callService,
    };

    render(
      <WidgetRuntimeProvider value={runtime}>
        <AdaptiveCategoryWidget
          type="lock"
          entityId="lock.ingresso"
          size={{ w: 2, h: 2 }}
          editMode={false}
        />
      </WidgetRuntimeProvider>
    );

    const lockToggle = screen.getByRole('button', { name: 'Serratura' });
    expect(lockToggle).toBeInTheDocument();

    fireEvent.click(lockToggle);
    expect(callService).toHaveBeenCalledWith('lock', 'lock', {
      entity_id: 'lock.ingresso',
    });
  });

  it('renders a sensor widget with reading and telemetry chart', () => {
    const sensorEntity = fixtureEntity('sensor.temperatura_esterna', '19.4', {
      friendly_name: 'Sensore Esterno',
      unit_of_measurement: '°C',
    });

    const runtime = {
      ...createFixtureRuntime(),
      entities: { 'sensor.temperatura_esterna': sensorEntity },
    };

    const { container } = render(
      <WidgetRuntimeProvider value={runtime}>
        <AdaptiveCategoryWidget
          type="sensor"
          entityId="sensor.temperatura_esterna"
          size={{ w: 2, h: 2 }}
          editMode={false}
        />
      </WidgetRuntimeProvider>
    );

    expect(screen.getByText('19.4')).toBeInTheDocument();
    expect(container.querySelector('.uikwa-chart')).toBeInTheDocument();
  });
});

describe('CategoryWidgetContent integration with AdaptiveCategoryWidget', () => {
  it('switches to AdaptiveCategoryWidget when bound and ready for Tappa A widgets', () => {
    const lightEntity = fixtureEntity('light.cucina', 'on', {
      friendly_name: 'Luce Cucina',
      brightness: 200,
      supported_color_modes: ['brightness'],
    });

    const runtime = {
      ...createFixtureRuntime(),
      entities: { 'light.cucina': lightEntity },
    };

    const definition = findWidgetDefinition('light.preset')!;
    const { container } = render(
      <WidgetRuntimeProvider value={runtime}>
        <CategoryWidgetContent
          id="light.preset"
          settingsKey="pagina::light.preset"
          size={{ w: 2, h: 2 }}
          editMode={false}
          definition={definition}
          settings={{ categoryWidgetType: 'light', bindingEntityId: 'light.cucina' }}
          onConfigure={() => {}}
        />
      </WidgetRuntimeProvider>
    );

    expect(container.querySelector('.aca-adaptive-widget')).toBeInTheDocument();
    expect(container.querySelector('[data-widget-type="light"]')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Luminosità della luce' })).toBeInTheDocument();
  });

  it('switches to AdaptiveCategoryWidget when bound and ready for media widgets', () => {
    const mediaEntity = fixtureEntity('media_player.soggiorno', 'playing', {
      friendly_name: 'Diffusore Soggiorno',
      media_title: 'Sonata al chiaro di luna',
      media_artist: 'Beethoven',
      volume_level: 0.4,
      supported_features: 4 | 16384, // volume_set | play
    });

    const runtime = {
      ...createFixtureRuntime(),
      entities: { 'media_player.soggiorno': mediaEntity },
    };

    const definition = findWidgetDefinition('media_group_preset', {
      mediaIds: ['media_player.soggiorno'],
    })!;
    const { container } = render(
      <WidgetRuntimeProvider value={runtime}>
        <CategoryWidgetContent
          id="media_group_preset"
          settingsKey="pagina::media_group_preset"
          size={{ w: 2, h: 2 }}
          editMode={false}
          definition={definition}
          settings={{
            categoryWidgetType: 'media',
            mediaIds: ['media_player.soggiorno'],
          }}
          onConfigure={() => {}}
        />
      </WidgetRuntimeProvider>
    );

    expect(container.querySelector('.aca-adaptive-widget')).toBeInTheDocument();
    expect(container.querySelector('[data-widget-type="media"]')).toBeInTheDocument();
    expect(screen.getByText('Beethoven - Sonata al chiaro di luna')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Volume' })).toBeInTheDocument();
  });

  it('switches to AdaptiveCategoryWidget when bound for androidtv and appletv widgets', () => {
    const tvEntity = fixtureEntity('media_player.tv_sala', 'playing', {
      friendly_name: 'TV Sala',
      app_name: 'YouTube',
      media_title: 'Documentario 4K',
      volume_level: 0.25,
      supported_features: 4 | 16384,
    });

    const runtime = {
      ...createFixtureRuntime(),
      entities: { 'media_player.tv_sala': tvEntity },
    };

    const definition = findWidgetDefinition('androidtv_card_preset', {
      mediaPlayerId: 'media_player.tv_sala',
    })!;
    const { container } = render(
      <WidgetRuntimeProvider value={runtime}>
        <CategoryWidgetContent
          id="androidtv_card_preset"
          settingsKey="pagina::androidtv_card_preset"
          size={{ w: 2, h: 2 }}
          editMode={false}
          definition={definition}
          settings={{
            categoryWidgetType: 'androidtv',
            mediaPlayerId: 'media_player.tv_sala',
          }}
          onConfigure={() => {}}
        />
      </WidgetRuntimeProvider>
    );

    expect(container.querySelector('.aca-adaptive-widget')).toBeInTheDocument();
    expect(container.querySelector('[data-widget-type="androidtv"]')).toBeInTheDocument();
    expect(screen.getByText('YouTube: Documentario 4K')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Volume TV' })).toBeInTheDocument();
  });

  it('renders distinct icons for Multimedia (music) and Sonos (speaker) when unbound in placeholder state', () => {
    const runtime = createFixtureRuntime();
    const definition = findWidgetDefinition('media_group_preset', { mediaIds: [] })!;

    const { container: mediaContainer } = render(
      <WidgetRuntimeProvider value={runtime}>
        <CategoryWidgetContent
          id="media_group_1"
          settingsKey="pagina::media_group_1"
          size={{ w: 2, h: 2 }}
          editMode={false}
          definition={definition}
          settings={{ categoryWidgetType: 'media', mediaIds: [] }}
          onConfigure={() => {}}
        />
      </WidgetRuntimeProvider>
    );

    // Multimedia placeholder uses music icon, not speaker and not warning
    expect(mediaContainer.querySelector('[data-placeholder-icon="music"]')).toBeInTheDocument();
    expect(mediaContainer.querySelector('svg[data-icon="music"]')).toBeInTheDocument();

    const { container: sonosContainer } = render(
      <WidgetRuntimeProvider value={runtime}>
        <CategoryWidgetContent
          id="sonos_group_1"
          settingsKey="pagina::sonos_group_1"
          size={{ w: 2, h: 2 }}
          editMode={false}
          definition={definition}
          settings={{ categoryWidgetType: 'sonos', mediaIds: [] }}
          onConfigure={() => {}}
        />
      </WidgetRuntimeProvider>
    );

    // Sonos placeholder uses speaker icon, not music and not warning
    expect(sonosContainer.querySelector('[data-placeholder-icon="speaker"]')).toBeInTheDocument();
    expect(sonosContainer.querySelector('svg[data-icon="speaker"]')).toBeInTheDocument();
  });
});

describe('AdaptiveCategoryWidget (Fase 4 / Tappa B - Media & TV)', () => {
  it('renders a media widget with volume knob and dispatches volume_level and media_play_pause', () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    const mediaEntity = fixtureEntity('media_player.sala', 'playing', {
      friendly_name: 'Impianto Sala',
      media_title: 'Nocturne in E-flat',
      media_artist: 'Chopin',
      volume_level: 0.6,
      supported_features: 4 | 16384, // volume_set | play
    });

    const runtime = {
      ...createFixtureRuntime(),
      entities: { 'media_player.sala': mediaEntity },
      callService,
    };

    render(
      <WidgetRuntimeProvider value={runtime}>
        <AdaptiveCategoryWidget
          type="media"
          entityId="media_player.sala"
          size={{ w: 2, h: 2 }}
          editMode={false}
        />
      </WidgetRuntimeProvider>
    );

    expect(screen.getByText('Chopin - Nocturne in E-flat')).toBeInTheDocument();
    const volSlider = screen.getByRole('slider', { name: 'Volume' });
    expect(volSlider).toBeInTheDocument();

    fireEvent.keyDown(volSlider, { key: 'ArrowUp' });
    expect(callService).toHaveBeenCalledWith('media_player', 'volume_set', {
      entity_id: 'media_player.sala',
      volume_level: 0.61,
    });
  });

  it('renders sonos widget with speaker icon and supports play toggle', () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    const sonosEntity = fixtureEntity('media_player.sonos_move', 'playing', {
      friendly_name: 'Sonos Move',
      media_title: 'Jazz Classics',
      supported_features: 1 | 16384, // pause | play
    });

    const runtime = {
      ...createFixtureRuntime(),
      entities: { 'media_player.sonos_move': sonosEntity },
      callService,
    };

    const { container } = render(
      <WidgetRuntimeProvider value={runtime}>
        <AdaptiveCategoryWidget
          type="sonos"
          entityId="media_player.sonos_move"
          size={{ w: 2, h: 2 }}
          editMode={false}
        />
      </WidgetRuntimeProvider>
    );

    expect(container.querySelector('[data-widget-type="sonos"]')).toBeInTheDocument();
    const playBtn = screen.getByRole('button', { name: 'Riproduzione' });
    expect(playBtn).toBeInTheDocument();

    fireEvent.click(playBtn);
    expect(callService).toHaveBeenCalledWith('media_player', 'media_pause', {
      entity_id: 'media_player.sonos_move',
    });
  });

  it('renders androidtv widget with programme reading, volume, source options and dispatches select_source', () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    const tvEntity = fixtureEntity('media_player.android_tv', 'on', {
      friendly_name: 'Android TV Salotto',
      app_name: 'Plex',
      media_title: 'Interstellar',
      volume_level: 0.3,
      source: 'Plex',
      source_list: ['Plex', 'Prime Video', 'YouTube'],
      supported_features: 4 | 2048, // volume_set | select_source
    });

    const runtime = {
      ...createFixtureRuntime(),
      entities: { 'media_player.android_tv': tvEntity },
      callService,
    };

    const { container } = render(
      <WidgetRuntimeProvider value={runtime}>
        <AdaptiveCategoryWidget
          type="androidtv"
          entityId="media_player.android_tv"
          detailsMode
          size={{ w: 3, h: 3 }}
          editMode={false}
        />
      </WidgetRuntimeProvider>
    );

    expect(container.querySelector('[data-widget-type="androidtv"]')).toBeInTheDocument();
    expect(screen.getByText('Plex: Interstellar')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Volume TV' })).toBeInTheDocument();

    const sources = screen.getByRole('combobox');
    expect(sources).toBeInTheDocument();
    fireEvent.change(sources, { target: { value: 'Prime Video' } });
    expect(callService).toHaveBeenCalledWith('media_player', 'select_source', {
      entity_id: 'media_player.android_tv',
      source: 'Prime Video',
    });
  });
});

describe('AdaptiveCategoryWidget (Fase 4 / Tappa C - Utilità & Robot)', () => {
  it('renders fan widget with speed slider and dispatches set_percentage', () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    const fanEntity = fixtureEntity('fan.studio', 'on', {
      friendly_name: 'Ventilatore Studio',
      percentage: 50,
      supported_features: 1, // fan_set_speed
    });

    const runtime = {
      ...createFixtureRuntime(),
      entities: { 'fan.studio': fanEntity },
      callService,
    };

    render(
      <WidgetRuntimeProvider value={runtime}>
        <AdaptiveCategoryWidget
          type="fan"
          entityId="fan.studio"
          size={{ w: 2, h: 2 }}
          editMode={false}
        />
      </WidgetRuntimeProvider>
    );

    const speedSlider = screen.getByRole('slider', { name: 'Velocità del ventilatore' });
    expect(speedSlider).toBeInTheDocument();

    fireEvent.keyDown(speedSlider, { key: 'ArrowUp' });
    expect(callService).toHaveBeenCalledWith('fan', 'set_percentage', {
      entity_id: 'fan.studio',
      percentage: 51,
    });
  });

  it('renders vacuum widget and dispatches start action', () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    const vacuumEntity = fixtureEntity('vacuum.aspirapolvere', 'docked', {
      friendly_name: 'Aspirapolvere',
      battery_level: 90,
      supported_features: 8192 | 16, // start | return_home
    });

    const runtime = {
      ...createFixtureRuntime(),
      entities: { 'vacuum.aspirapolvere': vacuumEntity },
      callService,
    };

    render(
      <WidgetRuntimeProvider value={runtime}>
        <AdaptiveCategoryWidget
          type="vacuum"
          entityId="vacuum.aspirapolvere"
          size={{ w: 2, h: 2 }}
          editMode={false}
        />
      </WidgetRuntimeProvider>
    );

    expect(screen.getByText('Alla base')).toBeInTheDocument();
    const startBtn = screen.getByRole('button', { name: 'Avvia pulizia' });
    expect(startBtn).toBeInTheDocument();

    fireEvent.click(startBtn);
    expect(callService).toHaveBeenCalledWith('vacuum', 'start', {
      entity_id: 'vacuum.aspirapolvere',
    });
  });

  it('renders mower widget and dispatches start_mowing action', () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    const mowerEntity = fixtureEntity('lawn_mower.giardino', 'docked', {
      friendly_name: 'Tosaerba Giardino',
      battery_level: 80,
      supported_features: 1 | 4, // start | dock
    });

    const runtime = {
      ...createFixtureRuntime(),
      entities: { 'lawn_mower.giardino': mowerEntity },
      callService,
    };

    render(
      <WidgetRuntimeProvider value={runtime}>
        <AdaptiveCategoryWidget
          type="mower"
          entityId="lawn_mower.giardino"
          size={{ w: 2, h: 2 }}
          editMode={false}
        />
      </WidgetRuntimeProvider>
    );

    expect(screen.getByText('Alla base')).toBeInTheDocument();
    const startMowingBtn = screen.getByRole('button', { name: 'Avvia taglio' });
    expect(startMowingBtn).toBeInTheDocument();

    fireEvent.click(startMowingBtn);
    expect(callService).toHaveBeenCalledWith('lawn_mower', 'start_mowing', {
      entity_id: 'lawn_mower.giardino',
    });
  });

  it('renders car widget with battery level and range readings', () => {
    const carEntity = fixtureEntity('sensor.auto_batteria', '82', {
      friendly_name: 'Auto Elettrica',
      range: 360,
      charging: false,
    });

    const runtime = {
      ...createFixtureRuntime(),
      entities: { 'sensor.auto_batteria': carEntity },
    };

    render(
      <WidgetRuntimeProvider value={runtime}>
        <AdaptiveCategoryWidget
          type="car"
          entityId="sensor.auto_batteria"
          size={{ w: 2, h: 2 }}
          editMode={false}
        />
      </WidgetRuntimeProvider>
    );

    expect(screen.getByText('82')).toBeInTheDocument();
    expect(screen.getByText('360')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ricarica' })).not.toBeInTheDocument();
  });

  it('renders cost and nordpool widgets with live telemetry and chart', () => {
    const costEntity = fixtureEntity('sensor.costo_oggi', '3,45', {
      friendly_name: 'Costo Elettricità',
      unit_of_measurement: '€',
    });
    const nordpoolEntity = fixtureEntity('sensor.nordpool_kwh', '0,18', {
      friendly_name: 'Prezzo Nordpool',
      unit_of_measurement: '€/kWh',
    });

    const runtime = {
      ...createFixtureRuntime(),
      entities: {
        'sensor.costo_oggi': costEntity,
        'sensor.nordpool_kwh': nordpoolEntity,
      },
    };

    const { container: costContainer } = render(
      <WidgetRuntimeProvider value={runtime}>
        <AdaptiveCategoryWidget
          type="cost"
          entityId="sensor.costo_oggi"
          size={{ w: 2, h: 2 }}
          editMode={false}
        />
      </WidgetRuntimeProvider>
    );
    expect(costContainer.querySelector('[data-widget-type="cost"]')).toBeInTheDocument();
    expect(screen.getByText('3,45')).toBeInTheDocument();

    const { container: nordpoolContainer } = render(
      <WidgetRuntimeProvider value={runtime}>
        <AdaptiveCategoryWidget
          type="nordpool"
          entityId="sensor.nordpool_kwh"
          size={{ w: 2, h: 2 }}
          editMode={false}
        />
      </WidgetRuntimeProvider>
    );
    expect(nordpoolContainer.querySelector('[data-widget-type="nordpool"]')).toBeInTheDocument();
    expect(screen.getByText('0,18')).toBeInTheDocument();
  });

  it('switches to AdaptiveCategoryWidget when bound for vacuum and fan', () => {
    const fanEntity = fixtureEntity('fan.salotto', 'on', {
      friendly_name: 'Ventilatore Salotto',
      percentage: 70,
      supported_features: 1,
    });

    const runtime = {
      ...createFixtureRuntime(),
      entities: { 'fan.salotto': fanEntity },
    };

    const definition = findWidgetDefinition('fan.preset', {})!;
    const { container } = render(
      <WidgetRuntimeProvider value={runtime}>
        <CategoryWidgetContent
          id="fan.preset"
          settingsKey="pagina::fan.preset"
          size={{ w: 2, h: 2 }}
          editMode={false}
          definition={definition}
          settings={{
            categoryWidgetType: 'fan',
            bindingEntityId: 'fan.salotto',
          }}
          onConfigure={() => {}}
        />
      </WidgetRuntimeProvider>
    );

    expect(container.querySelector('.aca-adaptive-widget')).toBeInTheDocument();
    expect(container.querySelector('[data-widget-type="fan"]')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Velocità del ventilatore' })).toBeInTheDocument();
  });
});

describe('Apertura dei dettagli dal corpo del widget (ADR-0016, G3)', () => {
  it('un tocco che ferma lo scorrimento del pager non apre i dettagli; a riposo li apre', () => {
    const openDetails = vi.fn();
    const runtime = {
      ...createFixtureRuntime(),
      entities: {
        'light.salotto': fixtureEntity('light.salotto', 'on', {
          friendly_name: 'Luce Salotto',
          brightness: 128,
          supported_color_modes: ['brightness'],
        }),
      },
    };
    const { container } = render(
      <div className="aca-pager">
        <WidgetRuntimeProvider value={runtime}>
          <AdaptiveCategoryWidget
            type="light"
            entityId="light.salotto"
            size={{ w: 2, h: 2 }}
            editMode={false}
            openDetails={openDetails}
          />
        </WidgetRuntimeProvider>
      </div>
    );
    const pager = container.querySelector('.aca-pager') as HTMLElement;
    Object.defineProperty(pager, 'clientWidth', { configurable: true, value: 1000 });
    const opener = container.querySelector('[data-widget-open]') as HTMLButtonElement;
    // between two pages
    pager.scrollLeft = 1400;
    fireEvent.click(opener);
    expect(openDetails).not.toHaveBeenCalled();
    // at rest on a page
    pager.scrollLeft = 2000;
    fireEvent.click(opener);
    expect(openDetails).toHaveBeenCalledTimes(1);
  });
});
