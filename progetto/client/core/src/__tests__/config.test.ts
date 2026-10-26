import { describe, expect, it } from 'vitest';
import { parseHost, parsePort, parseStoredConfig, serverOrigin } from '../config.ts';
import { DEFAULT_SERVER_PORT } from '../defaults.ts';
import { compareVersionStrings, parseVersion } from '../version.ts';

describe('parseHost (procedura guidata, Q-A7 e Q-A10)', () => {
  it.each([
    ['192.168.1.184', '192.168.1.184'],
    ['  10.0.0.2 ', '10.0.0.2'],
    ['172.16.5.1', '172.16.5.1'],
    ['127.0.0.1', '127.0.0.1'],
    ['http://192.168.1.184:8123/onboarding.html', '192.168.1.184'],
    ['192.168.1.184:8123', '192.168.1.184'],
  ])('accetta %s', (input, host) => {
    expect(parseHost(input)).toEqual({ ok: true, value: host });
  });

  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['homeassistant.local', 'not-ipv4'],
    ['192.168.1', 'not-ipv4'],
    ['192.168.1.300', 'not-ipv4'],
    ['8.8.8.8', 'not-local'],
    ['172.32.0.1', 'not-local'],
  ])('rifiuta %j con %s', (input, error) => {
    expect(parseHost(input)).toEqual({ ok: false, error });
  });
});

describe('parsePort', () => {
  it('usa la porta predefinita se vuota', () => {
    expect(parsePort(undefined)).toEqual({ ok: true, value: DEFAULT_SERVER_PORT });
    expect(parsePort(' ')).toEqual({ ok: true, value: DEFAULT_SERVER_PORT });
  });

  it.each(['0', '65536', 'abc', '30.2', '-1'])('rifiuta %s', (input) => {
    expect(parsePort(input)).toEqual({ ok: false, error: 'invalid-port' });
  });
});

describe('configurazione salvata', () => {
  it('ricostruisce l\'origine del server', () => {
    expect(serverOrigin({ host: '192.168.1.7', port: 3002 })).toBe('http://192.168.1.7:3002');
  });

  it('scarta valori alterati o pubblici', () => {
    expect(parseStoredConfig({ host: '192.168.1.7', port: 3002 })).toEqual({ host: '192.168.1.7', port: 3002 });
    expect(parseStoredConfig({ host: 'http://192.168.1.7', port: 3002 })).toBeNull();
    expect(parseStoredConfig({ host: '8.8.8.8', port: 3002 })).toBeNull();
    expect(parseStoredConfig({ host: '192.168.1.7', port: 99999 })).toBeNull();
    expect(parseStoredConfig('192.168.1.7')).toBeNull();
  });
});

describe('versioni', () => {
  it('legge X.Y.Z con o senza v', () => {
    expect(parseVersion('v0.9.28')).toEqual([0, 9, 28]);
    expect(parseVersion('unknown')).toBeNull();
    expect(parseVersion('0.9')).toBeNull();
  });

  it('confronta numericamente', () => {
    expect(compareVersionStrings('0.10.0', '0.9.30')).toBeGreaterThan(0);
    expect(compareVersionStrings('0.9.28', '0.9.28')).toBe(0);
    expect(compareVersionStrings('unknown', '0.1.0')).toBeLessThan(0);
  });
});
