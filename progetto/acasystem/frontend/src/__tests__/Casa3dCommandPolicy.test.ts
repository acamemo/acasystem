import { describe, expect, it } from 'vitest';
import {
  MAX_TARGETS,
  planCommand,
  type CommandPlan,
  type CommandStates,
} from '@/casa3d/commandPolicy';

/**
 * The closed list of services of the Casa 3D page and the questions it asks (ADR-0014, T7). The
 * states are plain objects: no browser, no Home Assistant.
 */

const states = (extra: CommandStates = {}): CommandStates => ({
  'light.sala': {
    state: 'on',
    attributes: { friendly_name: 'Lampada sala', brightness: 128 },
  },
  'light.cucina': { state: 'off', attributes: { friendly_name: 'Plafoniera cucina' } },
  'switch.pompa': { state: 'off', attributes: { friendly_name: 'Pompa' } },
  'input_boolean.prova': { state: 'off', attributes: { friendly_name: 'Interruttore di prova' } },
  'fan.studio': { state: 'on', attributes: { friendly_name: 'Ventola', percentage: 40 } },
  'cover.tapparella': {
    state: 'open',
    attributes: {
      friendly_name: 'Tapparella camera',
      current_position: 80,
      device_class: 'shutter',
    },
  },
  'cover.garage': {
    state: 'closed',
    attributes: { friendly_name: 'Garage', current_position: 0, device_class: 'garage' },
  },
  'lock.ingresso': { state: 'locked', attributes: { friendly_name: 'Porta d’ingresso' } },
  'lock.cantina': {
    state: 'locked',
    attributes: { friendly_name: 'Cantina', code_format: 'number' },
  },
  'alarm_control_panel.casa': {
    state: 'disarmed',
    attributes: { friendly_name: 'Allarme', code_format: 'number', supported_features: 3 },
  },
  'alarm_control_panel.senza_codice': {
    state: 'armed_home',
    attributes: { friendly_name: 'Allarme libero', code_format: 'none' },
  },
  'light.fuori': { state: 'unavailable', attributes: { friendly_name: 'Fuori servizio' } },
  'climate.termostato': { state: 'heat', attributes: {} },
  'media_player.tv': { state: 'playing', attributes: {} },
  ...extra,
});

function plan(
  domain: string,
  service: string,
  data?: Record<string, unknown>,
  current = states(),
  asked = false
): CommandPlan {
  const result = planCommand(domain, service, data, current, asked);
  if (!result.ok) throw new Error(`refused: ${result.reason} ${result.message}`);
  return result.plan;
}

const refusal = (
  domain: string,
  service: string,
  data?: Record<string, unknown>,
  current = states()
) => {
  const result = planCommand(domain, service, data, current);
  return result.ok ? null : result.reason;
};

describe('Casa 3D command policy: the list', () => {
  it('lets through the taps, the quick menu and the swipes of the view', () => {
    for (const [domain, service, data] of [
      ['light', 'toggle', { entity_id: 'light.sala' }],
      ['light', 'turn_on', { entity_id: 'light.sala', brightness_pct: 40 }],
      ['light', 'turn_on', { entity_id: 'light.sala', rgb_color: [255, 0, 10] }],
      ['light', 'turn_on', { entity_id: 'light.sala', color_temp_kelvin: 3000 }],
      ['light', 'turn_off', { entity_id: 'light.sala' }],
      ['switch', 'toggle', { entity_id: 'switch.pompa' }],
      ['input_boolean', 'toggle', { entity_id: 'input_boolean.prova' }],
      ['fan', 'toggle', { entity_id: 'fan.studio' }],
      ['homeassistant', 'toggle', { entity_id: 'switch.pompa' }],
      ['cover', 'open_cover', { entity_id: 'cover.tapparella' }],
      ['cover', 'close_cover', { entity_id: 'cover.tapparella' }],
      ['cover', 'stop_cover', { entity_id: 'cover.tapparella' }],
      ['cover', 'set_cover_position', { entity_id: 'cover.tapparella', position: 25 }],
      ['cover', 'set_cover_tilt_position', { entity_id: 'cover.tapparella', tilt_position: 50 }],
      ['lock', 'lock', { entity_id: 'lock.ingresso' }],
      ['lock', 'unlock', { entity_id: 'lock.ingresso' }],
    ] as const) {
      expect(planCommand(domain, service, data, states()).ok, `${domain}.${service}`).toBe(true);
    }
  });

  it('refuses every other service, whatever the view asks', () => {
    for (const [domain, service, data] of [
      ['climate', 'set_temperature', { entity_id: 'climate.termostato', temperature: 30 }],
      ['media_player', 'media_play', { entity_id: 'media_player.tv' }],
      ['script', 'turn_on', { entity_id: 'script.tutto' }],
      ['scene', 'turn_on', { entity_id: 'scene.cena' }],
      ['automation', 'trigger', { entity_id: 'automation.x' }],
      ['homeassistant', 'restart', {}],
      ['homeassistant', 'reload_all', {}],
      ['persistent_notification', 'create', { message: 'x' }],
      ['light', 'delete', { entity_id: 'light.sala' }],
      ['lock', 'toggle', { entity_id: 'lock.ingresso' }],
      ['shell_command', 'run', {}],
      // not emitted by a pin, the quick menu or a swipe: not enabled
      ['switch', 'turn_on', { entity_id: 'switch.pompa' }],
      ['fan', 'set_percentage', { entity_id: 'fan.studio', percentage: 60 }],
      ['cover', 'toggle', { entity_id: 'cover.tapparella' }],
      ['lock', 'open', { entity_id: 'lock.ingresso' }],
      ['homeassistant', 'turn_off', { entity_id: 'light.sala' }],
      ['homeassistant', 'turn_on', { entity_id: 'light.sala' }],
    ] as const) {
      expect(refusal(domain, service, data), `${domain}.${service}`).toBe('not_allowed');
    }
  });

  it('keeps homeassistant.toggle on switches and fans: a lock, a cover or a light cannot slip through it', () => {
    expect(refusal('homeassistant', 'toggle', { entity_id: 'lock.ingresso' })).toBe('not_allowed');
    expect(refusal('homeassistant', 'toggle', { entity_id: 'cover.garage' })).toBe('not_allowed');
    expect(refusal('homeassistant', 'toggle', { entity_id: 'light.sala' })).toBe('not_allowed');
    expect(refusal('homeassistant', 'toggle', { entity_id: 'alarm_control_panel.casa' })).toBe(
      'not_allowed'
    );
    // and a service of a domain acts on that domain only
    expect(refusal('light', 'toggle', { entity_id: 'switch.pompa' })).toBe('not_allowed');
    expect(refusal('cover', 'open_cover', { entity_id: 'lock.ingresso' })).toBe('not_allowed');
  });

  it('wants one valid target: the lights of a room together (the double tap on a room) are not enabled', () => {
    expect(refusal('light', 'toggle', {})).toBe('bad_request');
    expect(refusal('light', 'toggle', undefined)).toBe('bad_request');
    expect(refusal('light', 'toggle', { entity_id: '' })).toBe('bad_request');
    expect(refusal('light', 'toggle', { entity_id: [] })).toBe('bad_request');
    expect(refusal('light', 'toggle', { entity_id: 'LIGHT.sala' })).toBe('bad_request');
    expect(refusal('light', 'toggle', { entity_id: [4] })).toBe('bad_request');
    expect(refusal('light', 'toggle', { entity_id: 'all' })).toBe('bad_request');
    expect(refusal('light', 'turn_off', { entity_id: ['light.sala', 'light.cucina'] })).toBe(
      'bad_request'
    );
    expect(MAX_TARGETS).toBe(1);
  });

  it('accepts only the data a service takes, in the shape it takes it', () => {
    const target = { entity_id: 'light.sala' };
    expect(refusal('light', 'turn_on', { ...target, effect: 'colorloop' })).toBe('bad_request');
    expect(refusal('light', 'turn_on', { ...target, brightness: 100 })).toBe('bad_request');
    expect(refusal('light', 'turn_on', { ...target, brightness_pct: 101 })).toBe('bad_request');
    expect(refusal('light', 'turn_on', { ...target, brightness_pct: -1 })).toBe('bad_request');
    expect(refusal('light', 'turn_on', { ...target, brightness_pct: '40' })).toBe('bad_request');
    expect(refusal('light', 'turn_on', { ...target, rgb_color: [300, 0, 0] })).toBe('bad_request');
    expect(refusal('light', 'turn_on', { ...target, rgb_color: [1, 2] })).toBe('bad_request');
    expect(refusal('light', 'turn_on', { ...target, target: { area_id: 'x' } })).toBe(
      'bad_request'
    );
    expect(refusal('light', 'toggle', { ...target, brightness_pct: 10 })).toBe('bad_request');
  });

  it('refuses a device that does not exist or is unavailable', () => {
    expect(refusal('light', 'toggle', { entity_id: 'light.non_esiste' })).toBe('unknown_entity');
    expect(refusal('light', 'toggle', { entity_id: 'light.fuori' })).toBe('unavailable');
  });

  it('sends the target as one id, even when the view gave a list of one', () => {
    expect(plan('light', 'toggle', { entity_id: ['light.sala'] }).data).toEqual({
      entity_id: 'light.sala',
    });
  });
});

describe('Casa 3D command policy: what is asked first', () => {
  it('sends a lamp, a switch and a blind at once', () => {
    expect(plan('light', 'toggle', { entity_id: 'light.sala' }).question).toBeNull();
    expect(plan('cover', 'close_cover', { entity_id: 'cover.tapparella' }).question).toBeNull();
    expect(plan('cover', 'stop_cover', { entity_id: 'cover.garage' }).question).toBeNull();
  });

  it('asks before a lock opens, and takes the code the lock wants', () => {
    const unlock = plan('lock', 'unlock', { entity_id: 'lock.ingresso' });
    expect(unlock.question).toMatchObject({
      title: 'Sbloccare «Porta d’ingresso»?',
      confirmLabel: 'Sblocca',
      danger: true,
    });
    expect(unlock.question?.code).toBeUndefined();
    const withCode = plan('lock', 'unlock', { entity_id: 'lock.cantina' });
    expect(withCode.question?.code).toEqual({ label: 'Codice della serratura', mode: 'numeric' });
  });

  it('does not ask before locking, unless the lock wants a code', () => {
    expect(plan('lock', 'lock', { entity_id: 'lock.ingresso' }).question).toBeNull();
    const withCode = plan('lock', 'lock', { entity_id: 'lock.cantina' });
    expect(withCode.question?.code?.mode).toBe('numeric');
    expect(withCode.question?.danger).toBe(false);
  });

  it('asks before any action of an alarm panel, with the code its rules ask for', () => {
    const disarm = plan('alarm_control_panel', 'alarm_disarm', {
      entity_id: 'alarm_control_panel.casa',
    });
    expect(disarm.question).toMatchObject({
      title: 'Disinserire «Allarme»?',
      confirmLabel: 'Disinserisci',
      danger: true,
    });
    expect(disarm.question?.code).toEqual({ label: 'Codice dell’allarme', mode: 'numeric' });
    // arming asks for a code only when the panel says so (code_arm_required)
    const arm = plan('alarm_control_panel', 'alarm_arm_away', {
      entity_id: 'alarm_control_panel.casa',
    });
    expect(arm.question?.code).toBeUndefined();
    expect(arm.question?.danger).toBe(false);
    const armWithCode = plan(
      'alarm_control_panel',
      'alarm_arm_away',
      { entity_id: 'alarm_control_panel.casa' },
      states({
        'alarm_control_panel.casa': {
          state: 'disarmed',
          attributes: { friendly_name: 'Allarme', code_format: 'number', code_arm_required: true },
        },
      })
    );
    expect(armWithCode.question?.code?.mode).toBe('numeric');
    // a panel without code never gets a field, but still the question
    const free = plan('alarm_control_panel', 'alarm_disarm', {
      entity_id: 'alarm_control_panel.senza_codice',
    });
    expect(free.question).not.toBeNull();
    expect(free.question?.code).toBeUndefined();
  });

  it('asks before a garage door, a gate or a door opens, not before it closes', () => {
    expect(plan('cover', 'open_cover', { entity_id: 'cover.garage' }).question).toMatchObject({
      title: 'Aprire «Garage»?',
      danger: true,
    });
    expect(
      plan('cover', 'set_cover_position', { entity_id: 'cover.garage', position: 30 }).question
    ).not.toBeNull();
    expect(plan('cover', 'close_cover', { entity_id: 'cover.garage' }).question).toBeNull();
    expect(
      plan('cover', 'set_cover_position', { entity_id: 'cover.garage', position: 0 }).question
    ).toBeNull();
    expect(plan('cover', 'open_cover', { entity_id: 'cover.tapparella' }).question).toBeNull();
  });

  it('asks before a device the plan marks «ask first», whatever it is', () => {
    const asked = plan('light', 'toggle', { entity_id: 'light.sala' }, states(), true);
    expect(asked.question).toMatchObject({ title: 'Cambia Lampada sala?', confirmLabel: 'Cambia' });
    expect(asked.question?.danger).toBe(false);
    const blind = plan('cover', 'open_cover', { entity_id: 'cover.tapparella' }, states(), true);
    expect(blind.question?.confirmLabel).toBe('Apri');
  });
});

describe('Casa 3D command policy: words and expected states', () => {
  it('names the command by what it does and to what', () => {
    expect(plan('light', 'turn_on', { entity_id: 'light.cucina' }).label).toBe(
      'Accendi Plafoniera cucina'
    );
    expect(plan('light', 'turn_on', { entity_id: 'light.sala', brightness_pct: 40.4 }).label).toBe(
      'Accendi Lampada sala al 40%'
    );
    expect(
      plan('cover', 'set_cover_position', { entity_id: 'cover.tapparella', position: 25 }).label
    ).toBe('Imposta Tapparella camera al 25%');
    expect(plan('homeassistant', 'toggle', { entity_id: 'switch.pompa' }).label).toBe(
      'Cambia Pompa'
    );
    expect(
      plan('alarm_control_panel', 'alarm_disarm', { entity_id: 'alarm_control_panel.casa' }).label
    ).toBe('Disinserisci: Allarme');
  });

  it('falls back to the id without the domain when a device has no name', () => {
    const current = states({ 'light.anonima': { state: 'on', attributes: {} } });
    expect(plan('light', 'toggle', { entity_id: 'light.anonima' }, current).label).toBe(
      'Cambia anonima'
    );
  });

  it('knows when a light, a switch or a fan shows what was asked', () => {
    const on = plan('light', 'turn_on', { entity_id: 'light.cucina' });
    expect(on.reached?.(states())).toBe(false);
    expect(on.reached?.(states({ 'light.cucina': { state: 'on', attributes: {} } }))).toBe(true);
    const off = plan('light', 'turn_off', { entity_id: 'light.sala' });
    expect(off.reached?.(states())).toBe(false);
    expect(off.reached?.(states({ 'light.sala': { state: 'off', attributes: {} } }))).toBe(true);
    const toggle = plan('switch', 'toggle', { entity_id: 'switch.pompa' });
    expect(toggle.reached?.(states())).toBe(false);
    expect(toggle.reached?.(states({ 'switch.pompa': { state: 'on', attributes: {} } }))).toBe(
      true
    );
  });

  it('checks the brightness a light reports, and takes a light that reports none as reached', () => {
    const dim = plan('light', 'turn_on', { entity_id: 'light.sala', brightness_pct: 40 });
    const at = (brightness?: number) =>
      states({
        'light.sala': { state: 'on', attributes: brightness === undefined ? {} : { brightness } },
      });
    expect(dim.reached?.(at(102))).toBe(true); // 40 % of 255
    expect(dim.reached?.(at(200))).toBe(false);
    expect(dim.reached?.(at(undefined))).toBe(true);
  });

  it('knows when a blind, a lock and an alarm panel show what was asked', () => {
    const closing = plan('cover', 'close_cover', { entity_id: 'cover.tapparella' });
    expect(closing.reached?.(states())).toBe(false);
    expect(
      closing.reached?.(states({ 'cover.tapparella': { state: 'closing', attributes: {} } }))
    ).toBe(true);
    const position = plan('cover', 'set_cover_position', {
      entity_id: 'cover.tapparella',
      position: 25,
    });
    expect(position.reached?.(states())).toBe(false);
    expect(
      position.reached?.(
        states({ 'cover.tapparella': { state: 'open', attributes: { current_position: 26 } } })
      )
    ).toBe(true);
    const unlock = plan('lock', 'unlock', { entity_id: 'lock.ingresso' });
    expect(unlock.reached?.(states())).toBe(false);
    expect(
      unlock.reached?.(states({ 'lock.ingresso': { state: 'unlocking', attributes: {} } }))
    ).toBe(true);
    const disarm = plan('alarm_control_panel', 'alarm_disarm', {
      entity_id: 'alarm_control_panel.senza_codice',
    });
    expect(disarm.reached?.(states())).toBe(false);
    expect(
      disarm.reached?.(
        states({ 'alarm_control_panel.senza_codice': { state: 'disarmed', attributes: {} } })
      )
    ).toBe(true);
  });

  it('has no state to wait for after the slats of a blind: the answer to the call is all there is', () => {
    expect(
      plan('cover', 'set_cover_tilt_position', { entity_id: 'cover.tapparella', tilt_position: 20 })
        .reached
    ).toBeNull();
  });

  it('knows a toggle is done when the state is not the one it started from', () => {
    const toggle = plan('homeassistant', 'toggle', { entity_id: 'switch.pompa' });
    expect(toggle.reached?.(states())).toBe(false);
    expect(toggle.reached?.(states({ 'switch.pompa': { state: 'on', attributes: {} } }))).toBe(
      true
    );
  });
});
