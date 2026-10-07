import { describe, expect, it } from 'vitest';
import type { StatusPillConfig } from '@/@types/dashboard';
import { fixtureEntities, fixtureEntity, fixtureTranslate } from '@/utils/fixtures/runtime';
import { pendingUpdateCount } from '@/utils/launcher/connection';
import {
  buildStatusChips,
  matchesMediaFilter,
  personStateText,
  stateWithUnit,
} from '@/utils/launcher/statusChips';

const now = Date.parse('2026-10-06T08:00:10.000Z');

const entities = fixtureEntities([
  fixtureEntity('person.mario', 'home', { friendly_name: 'Mario' }),
  fixtureEntity('person.giulia', 'not_home', { friendly_name: 'Giulia' }),
  fixtureEntity('alarm_control_panel.casa', 'armed_away', { friendly_name: 'Allarme' }),
  fixtureEntity('media_player.salotto', 'playing', {
    friendly_name: 'Salotto',
    media_title: 'Brano',
    media_artist: 'Artista',
  }),
  fixtureEntity('media_player.cucina', 'idle', { friendly_name: 'Cucina' }),
  fixtureEntity('light.a', 'on', { friendly_name: 'A' }),
  fixtureEntity('light.b', 'on', { friendly_name: 'B' }),
  fixtureEntity('sensor.temp', '21.46', { unit_of_measurement: '°C', device_class: 'temperature' }),
  fixtureEntity('update.core', 'on', {}),
  fixtureEntity('update.skip', 'on', { skipped_version: '1.2' }),
]);

function chips(header: string[], pills: StatusPillConfig[]) {
  return buildStatusChips({
    header,
    pills,
    entities,
    cardSettings: { 'header::person.giulia': { showState: false } },
    customNames: { 'person.mario': 'Papà' },
    t: fixtureTranslate,
    now,
  });
}

describe('launcher status chips', () => {
  it('shows the pinned people with their state', () => {
    const result = chips(['person.mario', 'person.giulia', 'person.missing'], []);
    expect(result).toEqual([
      {
        id: 'person.mario',
        kind: 'person',
        label: 'Papà',
        detail: 'A casa',
        icon: 'profile',
        tone: 'active',
        targetId: 'person.mario',
      },
      {
        id: 'person.giulia',
        kind: 'person',
        label: 'Giulia',
        icon: 'profile',
        tone: 'neutral',
        targetId: 'person.giulia',
      },
    ]);
    expect(personStateText('lavoro_milano')).toBe('Lavoro milano');
    expect(personStateText('unavailable')).toBe('Non disponibile');
  });

  it('builds alarm, media, group and entity pills, honouring visibility and conditions', () => {
    const result = chips(
      [],
      [
        { id: 'alarm', type: 'alarm', entityId: 'alarm_control_panel.casa' },
        { id: 'hidden', type: 'alarm', entityId: 'alarm_control_panel.casa', visible: false },
        { id: 'media', type: 'media_player', clickable: true, showCount: true },
        {
          id: 'group',
          type: 'group_status',
          groupPreset: 'lights_on',
          showCount: true,
          hideWhenEmpty: true,
        },
        {
          id: 'temp',
          type: 'sensor',
          entityId: 'sensor.temp',
          label: 'Soggiorno',
          decimals: 1,
          conditionEnabled: false,
        },
      ]
    );
    expect(result.map((chip) => chip.id)).toEqual(['alarm', 'media', 'group', 'temp']);
    expect(result[0]).toMatchObject({
      label: 'Inserito fuori casa',
      detail: 'Allarme',
      tone: 'active',
      targetId: 'alarm_control_panel.casa',
    });
    expect(result[1]).toMatchObject({
      kind: 'media',
      label: 'Brano',
      detail: 'Artista',
      count: 1,
      tone: 'active',
      targetId: 'media_player.salotto',
    });
    expect(result[2]).toMatchObject({ kind: 'group', count: 2, icon: 'light', tone: 'active' });
    expect(result[3]).toMatchObject({ label: 'Soggiorno', detail: '21.5 °C' });
  });

  it('hides a media pill when nothing plays and filters players like the legacy bar', () => {
    const quiet = buildStatusChips({
      header: [],
      pills: [{ id: 'media', type: 'media_player', entityId: 'media_player.cucina' }],
      entities,
      cardSettings: {},
      customNames: {},
      t: fixtureTranslate,
      now: now + 3_600_000,
    });
    expect(quiet).toEqual([]);
    expect(matchesMediaFilter('media_player.kodi_sala', 'media_player.kodi*', 'startsWith')).toBe(
      true
    );
    expect(matchesMediaFilter('media_player.sala', 'kodi', 'contains')).toBe(false);
    expect(matchesMediaFilter('media_player.sala', '^media_player\\.s', 'regex')).toBe(true);
  });

  it('formats a state with its unit and counts pending updates', () => {
    expect(
      stateWithUnit(
        { id: 'x', type: 'sensor', unitSource: 'custom', customUnit: 'gradi' },
        entities['sensor.temp']
      )
    ).toBe('21.46 gradi');
    expect(pendingUpdateCount(entities)).toBe(1);
  });
});
