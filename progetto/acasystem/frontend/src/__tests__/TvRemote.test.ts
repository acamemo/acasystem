import { describe, expect, it } from 'vitest';
import { fixtureEntity } from '@/utils/fixtures/runtime';
import {
  TV_DIGITS,
  digitKey,
  tvHasKey,
  tvHasRemote,
  tvKeyCall,
  tvRemoteFlavor,
} from '@/components/widgets/media/model/tvRemote';

const TV = 'media_player.tv';
const REMOTE = 'remote.tv';
const on = (platform?: string) => fixtureEntity(TV, 'on', platform ? { platform } : {});

describe('tvRemote: flavour', () => {
  it('follows the platform, then the widget kind', () => {
    expect(tvRemoteFlavor('android', on('samsungtv'))).toBe('samsung');
    expect(tvRemoteFlavor('android', on('webostv'))).toBe('webos');
    expect(tvRemoteFlavor('android', on('androidtv_remote'))).toBe('androidtv');
    expect(tvRemoteFlavor('android', on())).toBe('androidtv');
    expect(tvRemoteFlavor('apple', on('apple_tv'))).toBe('apple');
  });

  it('only LG webOS works without a remote entity', () => {
    expect(tvHasRemote('webos', '')).toBe(true);
    expect(tvHasRemote('samsung', '')).toBe(false);
    expect(tvHasRemote('samsung', REMOTE)).toBe(true);
  });
});

describe('tvRemote: Samsung (remote.send_command)', () => {
  const send = (key: Parameters<typeof tvKeyCall>[3]) =>
    tvKeyCall('android', on('samsungtv'), REMOTE, key);
  const command = (command: string) => ({
    domain: 'remote',
    service: 'send_command',
    data: { entity_id: REMOTE, command },
  });

  it('maps the keys to KEY_* names', () => {
    expect(send('up')).toEqual(command('KEY_UP'));
    expect(send('ok')).toEqual(command('KEY_ENTER'));
    expect(send('back')).toEqual(command('KEY_RETURN'));
    expect(send('home')).toEqual(command('KEY_HOME'));
    expect(send('menu')).toEqual(command('KEY_MENU'));
    expect(send('info')).toEqual(command('KEY_INFO'));
    expect(send('guide')).toEqual(command('KEY_GUIDE'));
    expect(send('source')).toEqual(command('KEY_SOURCE'));
    expect(send('exit')).toEqual(command('KEY_EXIT'));
    expect(send('red')).toEqual(command('KEY_RED'));
    expect(send('green')).toEqual(command('KEY_GREEN'));
    expect(send('yellow')).toEqual(command('KEY_YELLOW'));
    expect(send('blue')).toEqual(command('KEY_CYAN'));
    expect(send('channelUp')).toEqual(command('KEY_CHUP'));
    expect(send('channelDown')).toEqual(command('KEY_CHDOWN'));
    expect(send('rewind')).toEqual(command('KEY_REWIND'));
    expect(send('fastForward')).toEqual(command('KEY_FF'));
    for (const digit of TV_DIGITS) {
      expect(send(digitKey(digit))).toEqual(command(`KEY_${digit}`));
    }
  });

  it('cannot send without its remote entity', () => {
    expect(tvKeyCall('android', on('samsungtv'), '', 'up')).toBeNull();
  });
});

describe('tvRemote: LG webOS (webostv.button on the media player)', () => {
  const send = (key: Parameters<typeof tvKeyCall>[3]) =>
    tvKeyCall('android', on('webostv'), '', key);
  const button = (button: string) => ({
    domain: 'webostv',
    service: 'button',
    data: { entity_id: TV, button },
  });

  it('maps the keys to webOS buttons, with no remote entity', () => {
    expect(send('up')).toEqual(button('UP'));
    expect(send('ok')).toEqual(button('ENTER'));
    expect(send('back')).toEqual(button('BACK'));
    expect(send('home')).toEqual(button('HOME'));
    expect(send('menu')).toEqual(button('MENU'));
    expect(send('info')).toEqual(button('INFO'));
    expect(send('exit')).toEqual(button('EXIT'));
    expect(send('red')).toEqual(button('RED'));
    expect(send('blue')).toEqual(button('BLUE'));
    expect(send('channelUp')).toEqual(button('CHANNELUP'));
    expect(send('channelDown')).toEqual(button('CHANNELDOWN'));
    expect(send(digitKey('0'))).toEqual(button('0'));
    expect(send(digitKey('7'))).toEqual(button('7'));
  });

  it('has no guide or source key', () => {
    expect(send('guide')).toBeNull();
    expect(tvHasKey('webos', 'source')).toBe(false);
  });
});

describe('tvRemote: Android TV and Apple TV', () => {
  it('Android TV keeps the adb names and adds channel, colours and numbers', () => {
    const call = (key: Parameters<typeof tvKeyCall>[3]) =>
      tvKeyCall('android', on(), REMOTE, key)?.data.command;
    expect(call('ok')).toBe('DPAD_CENTER');
    expect(call('back')).toBe('BACK');
    expect(call('source')).toBe('TV_INPUT');
    expect(call('red')).toBe('PROG_RED');
    expect(call('channelUp')).toBe('CHANNEL_UP');
    expect(call(digitKey('3'))).toBe('3');
    expect(tvKeyCall('android', on(), REMOTE, 'exit')).toBeNull();
  });

  it('Apple TV keeps its pyatv keys and has no numbers, colours or channels', () => {
    const call = (key: Parameters<typeof tvKeyCall>[3]) =>
      tvKeyCall('apple', on(), REMOTE, key)?.data.command;
    expect(call('ok')).toBe('select');
    expect(call('back')).toBe('menu');
    expect(call('home')).toBe('home');
    expect(tvKeyCall('apple', on(), REMOTE, 'menu')).toBeNull();
    expect(tvHasKey('apple', 'red')).toBe(false);
    expect(tvHasKey('apple', 'channelUp')).toBe(false);
    expect(tvHasKey('apple', digitKey('1'))).toBe(false);
  });
});
