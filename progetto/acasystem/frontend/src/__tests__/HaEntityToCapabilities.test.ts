import { describe, expect, it } from 'vitest';
import {
  HA_FEATURES,
  haEntityToCapabilities,
  haEntityToValues,
  resolveHaService,
  translateState,
} from '@/utils/haEntityToCapabilities';

describe('haEntityToCapabilities (ISSUE-064 / Fase 1)', () => {
  describe('Light: filtraggio supported_features e color_modes senza controlli fantasma', () => {
    it('luce base solo on/off: genera solo il toggle power', () => {
      const profile = haEntityToCapabilities({
        entity_id: 'light.ingresso',
        state: 'on',
        attributes: {
          friendly_name: 'Luce Ingresso',
          supported_color_modes: ['onoff'],
          supported_features: 0,
        },
      });

      expect(profile.id).toBe('light.ingresso');
      expect(profile.label).toBe('Luce Ingresso');
      const ids = profile.capabilities.map((c) => c.id);
      expect(ids).toEqual(['power']);
      expect(profile.capabilities[0]).toMatchObject({
        id: 'power',
        kind: 'toggle',
        initial: true,
      });
    });

    it('luce dimmerabile: include power e brightness, esclude hue e white', () => {
      const profile = haEntityToCapabilities({
        entity_id: 'light.tavolo',
        state: 'on',
        attributes: {
          friendly_name: 'Tavolo Pranzo',
          brightness: 128,
          supported_color_modes: ['brightness'],
          supported_features: HA_FEATURES.LIGHT_BRIGHTNESS,
        },
      });

      const ids = profile.capabilities.map((c) => c.id);
      expect(ids).toContain('power');
      expect(ids).toContain('brightness');
      expect(ids).not.toContain('hue');
      expect(ids).not.toContain('white');

      const bri = profile.capabilities.find((c) => c.id === 'brightness');
      expect(bri).toMatchObject({
        kind: 'range',
        initial: 50, // 128 / 255 = 50%
        min: 0,
        max: 100,
        unit: '%',
      });
    });

    it('luce RGB completa: include brightness, hue e opzioni effetto', () => {
      const profile = haEntityToCapabilities({
        entity_id: 'light.salotto',
        state: 'on',
        attributes: {
          friendly_name: 'Striscia LED',
          brightness: 255,
          hs_color: [240, 100],
          effect: 'Arcobaleno',
          effect_list: ['Statico', 'Respiro', 'Arcobaleno'],
          supported_color_modes: ['hs', 'rgb'],
          supported_features:
            HA_FEATURES.LIGHT_BRIGHTNESS | HA_FEATURES.LIGHT_COLOR | HA_FEATURES.LIGHT_EFFECT,
        },
      });

      const ids = profile.capabilities.map((c) => c.id);
      expect(ids).toContain('power');
      expect(ids).toContain('brightness');
      expect(ids).toContain('hue');
      expect(ids).toContain('effect');
      expect(ids).not.toContain('white');

      const hue = profile.capabilities.find((c) => c.id === 'hue');
      expect(hue).toMatchObject({
        kind: 'range',
        initial: 240,
        colour: 'hue',
      });
    });

    it('luce bianco regolabile (color_temp): include white in Kelvin', () => {
      const profile = haEntityToCapabilities({
        entity_id: 'light.studio',
        state: 'on',
        attributes: {
          friendly_name: 'Lampada Studio',
          brightness: 200,
          color_temp_kelvin: 4000,
          min_color_temp_kelvin: 2700,
          max_color_temp_kelvin: 6500,
          supported_color_modes: ['color_temp'],
          supported_features: HA_FEATURES.LIGHT_BRIGHTNESS | HA_FEATURES.LIGHT_COLOR_TEMP,
        },
      });

      const ids = profile.capabilities.map((c) => c.id);
      expect(ids).toContain('white');
      expect(ids).not.toContain('hue');

      const white = profile.capabilities.find((c) => c.id === 'white');
      expect(white).toMatchObject({
        kind: 'range',
        initial: 4000,
        min: 2700,
        max: 6500,
        unit: 'K',
        colour: 'white',
      });
    });
  });

  describe('Climate: target, temperature, hvac modes e ventilazione', () => {
    it('estrae controlli climatici supportati con traduzione italiana', () => {
      const profile = haEntityToCapabilities({
        entity_id: 'climate.salotto',
        state: 'heat',
        attributes: {
          friendly_name: 'Clima Salotto',
          current_temperature: 20.5,
          temperature: 22,
          min_temp: 16,
          max_temp: 28,
          hvac_modes: ['off', 'heat', 'cool', 'auto'],
          fan_mode: 'Auto',
          fan_modes: ['Auto', 'Bassa', 'Alta'],
          supported_features:
            HA_FEATURES.CLIMATE_TARGET_TEMPERATURE |
            HA_FEATURES.CLIMATE_FAN_MODE |
            HA_FEATURES.CLIMATE_TURN_ON |
            HA_FEATURES.CLIMATE_TURN_OFF,
        },
      });

      const ids = profile.capabilities.map((c) => c.id);
      expect(ids).toContain('temperature');
      expect(ids).toContain('target');
      expect(ids).toContain('power');
      expect(ids).toContain('hvac');
      expect(ids).toContain('fan');

      const hvac = profile.capabilities.find((c) => c.id === 'hvac');
      expect(hvac).toMatchObject({
        kind: 'options',
        initial: 'Caldo',
        options: ['Spento', 'Caldo', 'Freddo', 'Auto'],
      });
    });
  });

  describe('Cover: posizione e lamelle (tilt)', () => {
    it('tapparella con percentuale e stop', () => {
      const profile = haEntityToCapabilities({
        entity_id: 'cover.camera',
        state: 'open',
        attributes: {
          friendly_name: 'Tapparella Camera',
          current_position: 80,
          supported_features:
            HA_FEATURES.COVER_OPEN |
            HA_FEATURES.COVER_CLOSE |
            HA_FEATURES.COVER_STOP |
            HA_FEATURES.COVER_SET_POSITION,
        },
      });

      const ids = profile.capabilities.map((c) => c.id);
      expect(ids).toContain('position');
      expect(ids).toContain('open');
      expect(ids).toContain('stop');
      expect(ids).toContain('close');
      expect(ids).not.toContain('tilt');
    });

    it('tapparella con lamelle orientabili (tilt)', () => {
      const profile = haEntityToCapabilities({
        entity_id: 'cover.veneziana',
        state: 'open',
        attributes: {
          friendly_name: 'Veneziana Studio',
          current_position: 100,
          current_tilt_position: 45,
          supported_features: HA_FEATURES.COVER_SET_POSITION | HA_FEATURES.COVER_SET_TILT_POSITION,
        },
      });

      const ids = profile.capabilities.map((c) => c.id);
      expect(ids).toContain('position');
      expect(ids).toContain('tilt');
    });
  });

  describe('Lock: blocco e scrocco opzionale', () => {
    it('serratura base senza scrocco', () => {
      const profile = haEntityToCapabilities({
        entity_id: 'lock.portone',
        state: 'locked',
        attributes: {
          friendly_name: 'Portone Principale',
          supported_features: 0,
        },
      });

      const ids = profile.capabilities.map((c) => c.id);
      expect(ids).toEqual(['locked']);
      expect((profile.capabilities[0] as { initial?: boolean }).initial).toBe(true);
    });

    it('serratura con scrocco (LOCK_OPEN) e batteria', () => {
      const profile = haEntityToCapabilities({
        entity_id: 'lock.smart',
        state: 'unlocked',
        attributes: {
          friendly_name: 'Smart Lock',
          battery_level: 85,
          supported_features: HA_FEATURES.LOCK_OPEN,
        },
      });

      const ids = profile.capabilities.map((c) => c.id);
      expect(ids).toContain('locked');
      expect(ids).toContain('open');
      expect(ids).toContain('battery');
    });
  });

  describe('Media Player & Sonos', () => {
    it('distingue icona brano tra media generico e sonos', () => {
      const entity = {
        entity_id: 'media_player.soggiorno',
        state: 'playing',
        attributes: {
          friendly_name: 'Soggiorno',
          media_title: 'Clair de Lune',
          media_artist: 'Debussy',
          volume_level: 0.5,
          supported_features:
            HA_FEATURES.MEDIA_PLAY |
            HA_FEATURES.MEDIA_PAUSE |
            HA_FEATURES.MEDIA_VOLUME_SET |
            HA_FEATURES.MEDIA_NEXT_TRACK,
        },
      };

      const mediaProfile = haEntityToCapabilities(entity, 'media');
      const sonosProfile = haEntityToCapabilities(entity, 'sonos');

      expect(mediaProfile.capabilities.find((c) => c.id === 'track')?.icon).toBe('music');
      expect(sonosProfile.capabilities.find((c) => c.id === 'track')?.icon).toBe('speaker');
      expect(
        (mediaProfile.capabilities.find((c) => c.id === 'track') as { initial?: string })?.initial
      ).toBe('Debussy - Clair de Lune');
      expect(
        (mediaProfile.capabilities.find((c) => c.id === 'volume') as { initial?: number })?.initial
      ).toBe(50);
      expect(mediaProfile.capabilities.find((c) => c.id === 'power')).toBeDefined();
    });

    it('TV (Android TV e Apple TV): estrae contenuto, power, play, volume, mute e sorgenti', () => {
      const tvEntity = {
        entity_id: 'media_player.sony_bravia',
        state: 'playing',
        attributes: {
          friendly_name: 'Sony Bravia',
          app_name: 'Netflix',
          media_title: 'Stranger Things',
          volume_level: 0.35,
          is_volume_muted: false,
          source: 'HDMI 1',
          source_list: ['HDMI 1', 'HDMI 2', 'Netflix', 'YouTube'],
          supported_features:
            HA_FEATURES.MEDIA_PLAY |
            HA_FEATURES.MEDIA_PAUSE |
            HA_FEATURES.MEDIA_VOLUME_SET |
            HA_FEATURES.MEDIA_VOLUME_MUTE |
            HA_FEATURES.MEDIA_SELECT_SOURCE |
            HA_FEATURES.MEDIA_STOP,
        },
      };

      const androidProfile = haEntityToCapabilities(tvEntity, 'androidtv');
      const appleProfile = haEntityToCapabilities(tvEntity, 'appletv');

      expect(androidProfile.capabilities.find((c) => c.id === 'programme')?.icon).toBe('tv');
      expect(appleProfile.capabilities.find((c) => c.id === 'programme')?.icon).toBe('play');
      expect(
        (androidProfile.capabilities.find((c) => c.id === 'programme') as { initial?: string })
          ?.initial
      ).toBe('Netflix: Stranger Things');
      expect(androidProfile.capabilities.find((c) => c.id === 'power')).toMatchObject({
        kind: 'toggle',
        initial: true,
      });
      expect(androidProfile.capabilities.find((c) => c.id === 'playing')).toMatchObject({
        kind: 'toggle',
        initial: true,
      });
      expect(androidProfile.capabilities.find((c) => c.id === 'volume')).toMatchObject({
        kind: 'range',
        initial: 35,
      });
      expect(androidProfile.capabilities.find((c) => c.id === 'source')).toMatchObject({
        kind: 'options',
        initial: 'HDMI 1',
        options: ['HDMI 1', 'HDMI 2', 'Netflix', 'YouTube'],
      });
      expect(androidProfile.capabilities.find((c) => c.id === 'stop')).toBeDefined();
    });
  });

  describe('Vacuum: robot aspirapolvere', () => {
    it('estrae stato pulizia in italiano, batteria e comandi di base', () => {
      const profile = haEntityToCapabilities({
        entity_id: 'vacuum.roborock',
        state: 'cleaning',
        attributes: {
          friendly_name: 'Roborock S7',
          battery_level: 72,
          supported_features:
            HA_FEATURES.VACUUM_START | HA_FEATURES.VACUUM_PAUSE | HA_FEATURES.VACUUM_RETURN_HOME,
        },
      });

      expect(
        (profile.capabilities.find((c) => c.id === 'state') as { initial?: string })?.initial
      ).toBe('Pulizia in corso');
      expect(
        (profile.capabilities.find((c) => c.id === 'battery') as { initial?: number })?.initial
      ).toBe(72);
      const ids = profile.capabilities.map((c) => c.id);
      expect(ids).toContain('start');
      expect(ids).toContain('pause');
      expect(ids).toContain('dock');
    });
  });

  describe('Mower: tosaerba robot', () => {
    it('estrae stato taglio in italiano, comandi start/pause/dock e batteria', () => {
      const profile = haEntityToCapabilities({
        entity_id: 'lawn_mower.automower',
        state: 'mowing',
        attributes: {
          friendly_name: 'Husqvarna Automower',
          battery_level: 85,
          supported_features:
            HA_FEATURES.LAWN_MOWER_START_MOWING |
            HA_FEATURES.LAWN_MOWER_PAUSE |
            HA_FEATURES.LAWN_MOWER_DOCK,
        },
      });

      expect(profile.capabilities.find((c) => c.id === 'state')).toMatchObject({
        kind: 'reading',
        initial: 'Taglio in corso',
      });
      expect(profile.capabilities.find((c) => c.id === 'battery')).toMatchObject({
        kind: 'reading',
        initial: 85,
        unit: '%',
      });
      const ids = profile.capabilities.map((c) => c.id);
      expect(ids).toContain('start');
      expect(ids).toContain('pause');
      expect(ids).toContain('dock');
    });
  });

  describe('Car: veicolo elettrico', () => {
    it('estrae autonomia, livello batteria e toggle ricarica', () => {
      const profile = haEntityToCapabilities(
        {
          entity_id: 'sensor.model_y_battery',
          state: '74',
          attributes: {
            friendly_name: 'Tesla Model Y',
            range: 340,
            charging: true,
          },
        },
        'car'
      );

      expect(profile.capabilities.find((c) => c.id === 'battery')).toMatchObject({
        kind: 'reading',
        initial: 74,
        unit: '%',
      });
      expect(profile.capabilities.find((c) => c.id === 'range')).toMatchObject({
        kind: 'reading',
        initial: 340,
        unit: 'km',
      });
      expect(profile.capabilities.find((c) => c.id === 'charging')).toMatchObject({
        kind: 'toggle',
        initial: true,
      });
    });
  });

  describe('Cost & Nordpool: energia e prezzi', () => {
    it('estrae metriche costo di oggi e questo mese', () => {
      const profile = haEntityToCapabilities(
        {
          entity_id: 'sensor.energia_costo',
          state: '3,12',
          attributes: {
            friendly_name: 'Costo energia',
            month_cost: '54,80',
            unit_of_measurement: '€',
          },
        },
        'cost'
      );

      expect(profile.capabilities.find((c) => c.id === 'today')).toMatchObject({
        kind: 'reading',
        initial: '3,12',
        unit: '€',
      });
      expect(profile.capabilities.find((c) => c.id === 'month')).toMatchObject({
        kind: 'reading',
        initial: '54,80',
        unit: '€',
      });
    });

    it('estrae prezzo attuale e minimo per Nordpool', () => {
      const profile = haEntityToCapabilities(
        {
          entity_id: 'sensor.nordpool_kwh',
          state: '0,14',
          attributes: {
            friendly_name: 'Nordpool IT',
            min: '0,09',
            unit_of_measurement: '€/kWh',
          },
        },
        'nordpool'
      );

      expect(profile.capabilities.find((c) => c.id === 'price')).toMatchObject({
        kind: 'reading',
        initial: '0,14',
        unit: '€/kWh',
      });
      expect(profile.capabilities.find((c) => c.id === 'minimum')).toMatchObject({
        kind: 'reading',
        initial: '0,09',
        unit: '€/kWh',
      });
    });
  });

  describe('haEntityToValues', () => {
    it('estrae mappa dei valori correnti escludendo le action', () => {
      const entity = {
        entity_id: 'light.studio',
        state: 'on',
        attributes: {
          brightness: 255,
          supported_color_modes: ['brightness'],
        },
      };
      const profile = haEntityToCapabilities(entity);
      const values = haEntityToValues(entity, profile.capabilities);

      expect(values.power).toBe(true);
      expect(values.brightness).toBe(100);
      expect(values).not.toHaveProperty('stop');
    });
  });

  describe('resolveHaService', () => {
    it('risolve comandi luce in chiamate turn_on/turn_off e attributi corretti', () => {
      expect(resolveHaService('light.sala', 'power', true)).toEqual({
        domain: 'light',
        service: 'turn_on',
        data: { entity_id: 'light.sala' },
      });
      expect(resolveHaService('light.sala', 'power', false)).toEqual({
        domain: 'light',
        service: 'turn_off',
        data: { entity_id: 'light.sala' },
      });
      expect(resolveHaService('light.sala', 'brightness', 75)).toEqual({
        domain: 'light',
        service: 'turn_on',
        data: { entity_id: 'light.sala', brightness_pct: 75 },
      });
      expect(resolveHaService('light.sala', 'hue', 180)).toEqual({
        domain: 'light',
        service: 'turn_on',
        data: { entity_id: 'light.sala', hs_color: [180, 100] },
      });
      expect(resolveHaService('light.sala', 'white', 3200)).toEqual({
        domain: 'light',
        service: 'turn_on',
        data: { entity_id: 'light.sala', color_temp_kelvin: 3200 },
      });
    });

    it('risolve comandi clima in set_temperature e set_hvac_mode', () => {
      expect(resolveHaService('climate.camera', 'target', 21.5)).toEqual({
        domain: 'climate',
        service: 'set_temperature',
        data: { entity_id: 'climate.camera', temperature: 21.5 },
      });
      expect(resolveHaService('climate.camera', 'hvac', 'Caldo')).toEqual({
        domain: 'climate',
        service: 'set_hvac_mode',
        data: { entity_id: 'climate.camera', hvac_mode: 'heat' },
      });
    });

    it('risolve comandi tapparella in open, close, stop e set_cover_position', () => {
      expect(resolveHaService('cover.salotto', 'open', true)).toEqual({
        domain: 'cover',
        service: 'open_cover',
        data: { entity_id: 'cover.salotto' },
      });
      expect(resolveHaService('cover.salotto', 'position', 60)).toEqual({
        domain: 'cover',
        service: 'set_cover_position',
        data: { entity_id: 'cover.salotto', position: 60 },
      });
    });

    it('risolve comandi serratura in lock, unlock e open', () => {
      expect(resolveHaService('lock.porta', 'locked', true)).toEqual({
        domain: 'lock',
        service: 'lock',
        data: { entity_id: 'lock.porta' },
      });
      expect(resolveHaService('lock.porta', 'locked', false)).toEqual({
        domain: 'lock',
        service: 'unlock',
        data: { entity_id: 'lock.porta' },
      });
      expect(resolveHaService('lock.porta', 'open', true)).toEqual({
        domain: 'lock',
        service: 'open',
        data: { entity_id: 'lock.porta' },
      });
    });

    it('risolve comandi media_player in play, pause, volume_set e tracce', () => {
      expect(resolveHaService('media_player.sonos', 'power', true)).toEqual({
        domain: 'media_player',
        service: 'turn_on',
        data: { entity_id: 'media_player.sonos' },
      });
      expect(resolveHaService('media_player.sonos', 'playing', true)).toEqual({
        domain: 'media_player',
        service: 'media_play',
        data: { entity_id: 'media_player.sonos' },
      });
      expect(resolveHaService('media_player.sonos', 'volume', 45)).toEqual({
        domain: 'media_player',
        service: 'volume_set',
        data: { entity_id: 'media_player.sonos', volume_level: 0.45 },
      });
      expect(resolveHaService('media_player.sonos', 'next', true)).toEqual({
        domain: 'media_player',
        service: 'media_next_track',
        data: { entity_id: 'media_player.sonos' },
      });
      expect(resolveHaService('media_player.sonos', 'mute', true)).toEqual({
        domain: 'media_player',
        service: 'volume_mute',
        data: { entity_id: 'media_player.sonos', is_volume_muted: true },
      });
      expect(resolveHaService('media_player.sony_bravia', 'source', 'HDMI 2')).toEqual({
        domain: 'media_player',
        service: 'select_source',
        data: { entity_id: 'media_player.sony_bravia', source: 'HDMI 2' },
      });
      expect(resolveHaService('media_player.sony_bravia', 'stop', true)).toEqual({
        domain: 'media_player',
        service: 'media_stop',
        data: { entity_id: 'media_player.sony_bravia' },
      });
      expect(resolveHaService('lawn_mower.giardino', 'start', true)).toEqual({
        domain: 'lawn_mower',
        service: 'start_mowing',
        data: { entity_id: 'lawn_mower.giardino' },
      });
      expect(resolveHaService('lawn_mower.giardino', 'dock', true)).toEqual({
        domain: 'lawn_mower',
        service: 'dock',
        data: { entity_id: 'lawn_mower.giardino' },
      });
      expect(resolveHaService('car.tesla', 'charging', false)).toEqual({
        domain: 'switch',
        service: 'turn_off',
        data: { entity_id: 'car.tesla' },
      });
    });

    it('restituisce null per entità o comandi non validi', () => {
      expect(resolveHaService('', 'power', true)).toBeNull();
      expect(resolveHaService('sensor.temp', 'unknown_cap', 10)).toBeNull();
    });
  });

  describe('translateState', () => {
    it('traduce stati standard in italiano', () => {
      expect(translateState('cleaning', 'vacuum')).toBe('Pulizia in corso');
      expect(translateState('docked', 'vacuum')).toBe('Alla base');
      expect(translateState('locked', 'lock')).toBe('Bloccata');
      expect(translateState('unlocked', 'lock')).toBe('Sbloccata');
      expect(translateState('open', 'cover')).toBe('Aperta');
      expect(translateState('closed', 'cover')).toBe('Chiusa');
      expect(translateState('heat', 'climate')).toBe('Caldo');
      expect(translateState('cool', 'climate')).toBe('Freddo');
      expect(translateState('unavailable', 'sensor')).toBe('Non disponibile');
    });
  });
});
