// @vitest-environment node

import { chmodSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { macDigits, normalizeMacAddress } from '../helpers/macAddress.ts';
import {
  deriveBroadcastAddress,
  normalizeBroadcastAddress,
  normalizeDeviceHost,
  normalizePort,
  parseIpv4,
} from '../helpers/network.ts';
import { readSecretFile, removeSecretFile, writeSecretFile } from '../helpers/secretFile.ts';
import { createSlidingWindowLimiter } from '../helpers/slidingWindow.ts';
import { buildFlowInput, hasInputRules } from '../services/devices/flowInput.ts';
import { flowErrorsFromBadRequest, normalizeFlowResult } from '../services/devices/flowModel.ts';
import {
  parseIntegrationDescriptions,
  searchCatalog,
  toCatalogEntry,
} from '../services/devices/catalog.ts';
import {
  publicEntryTitle,
  translateAbortReason,
  translateFormError,
} from '../services/devices/messagesIt.ts';
import { createTtyPrompter } from '../helpers/ttyPrompter.ts';
import { openDatabase } from '../models/database.ts';
import { createDeviceModel } from '../models/deviceModel.ts';
import { createActionLog } from '../services/devices/actionLog.ts';

const tempDirs: string[] = [];
const tempDir = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'aca-devices-'));
  tempDirs.push(dir);
  return dir;
};

afterEach(() => {
  while (tempDirs.length) rmSync(tempDirs.pop() ?? '', { recursive: true, force: true });
});

describe('normalizeMacAddress', () => {
  it('accepts the usual notations and returns lower-case with colons', () => {
    expect(normalizeMacAddress('02:00:00:00:00:01')).toBe('02:00:00:00:00:01');
    expect(normalizeMacAddress('02-00-00-AA-BB-CC')).toBe('02:00:00:aa:bb:cc');
    expect(normalizeMacAddress('0200.00aa.bbcc')).toBe('02:00:00:aa:bb:cc');
    expect(normalizeMacAddress('0200 00AABBCC'.replace(' ', ''))).toBe('02:00:00:aa:bb:cc');
  });

  it.each([
    ['too short', '02:00:00:00:00'],
    ['mixed separators', '02:00-00:00-00:01'],
    ['not hex', '02:00:00:00:00:0g'],
    ['all zeros', '00:00:00:00:00:00'],
    ['broadcast', 'ff:ff:ff:ff:ff:ff'],
    ['multicast bit', '01:00:5e:00:00:01'],
    ['text around it', ' mac 02:00:00:00:00:01'],
  ])('refuses %s', (_label, value) => {
    expect(normalizeMacAddress(value)).toBeNull();
  });

  it('refuses a value that is not text', () => {
    expect(normalizeMacAddress(undefined)).toBeNull();
    expect(normalizeMacAddress(12)).toBeNull();
    expect(normalizeMacAddress({})).toBeNull();
  });

  it('reduces a MAC or a title to its hex digits, so a title can be matched with a MAC', () => {
    expect(macDigits('02:00:00:AA:BB:CC')).toBe('020000aabbcc');
    expect(macDigits('Wake on LAN 02:00:00:AA:BB:CC')).toContain(macDigits('02:00:00:aa:bb:cc'));
  });
});

describe('network helpers', () => {
  it('parses strict dotted IPv4 only', () => {
    expect(parseIpv4('192.168.1.26')).toEqual([192, 168, 1, 26]);
    expect(parseIpv4('192.168.001.26')).toBeNull();
    expect(parseIpv4('192.168.1')).toBeNull();
    expect(parseIpv4('192.168.1.256')).toBeNull();
    expect(parseIpv4('0x7f.0.0.1')).toBeNull();
  });

  it.each(['192.168.1.26', '10.0.0.5', '172.16.0.9', '172.31.255.1', '172.30.31.7', '172.30.34.2'])(
    'accepts the private LAN address %s',
    (host) => {
      expect(normalizeDeviceHost(host)).toBe(host);
    }
  );

  it.each([
    // Public addresses: HA would open a connection towards the Internet.
    '8.8.8.8',
    '203.0.113.7',
    '192.0.2.10',
    '172.15.0.1',
    '172.32.0.1',
    '100.64.0.1',
    // The internal network of the Home Assistant Supervisor (HAOS).
    '172.30.32.1',
    '172.30.33.254',
    // Names can resolve to loopback or to the Supervisor network: refused in D1.
    'tv.local',
    'lg-tv-soggiorno',
    'tv.casa.example.org',
    'localhost',
    'tv.localhost',
    '127.0.0.1',
    '0.0.0.0',
    '169.254.169.254',
    '224.0.0.1',
    '255.255.255.255',
    '::1',
    'http://192.168.1.26',
    '192.168.1.26:3000',
    'user@192.168.1.26',
    '192.168.1.26/path',
    '1234',
    '999.1.1.1',
    '',
    'a'.repeat(300),
  ])('refuses the device host %j', (host) => {
    expect(normalizeDeviceHost(host)).toBeNull();
  });

  it('trims the spaces around an address', () => {
    expect(normalizeDeviceHost('  192.168.1.26 ')).toBe('192.168.1.26');
  });

  it('validates broadcast addresses and ports', () => {
    expect(normalizeBroadcastAddress('192.168.1.255')).toBe('192.168.1.255');
    expect(normalizeBroadcastAddress('255.255.255.255')).toBe('255.255.255.255');
    expect(normalizeBroadcastAddress('10.1.255.255')).toBe('10.1.255.255');
    expect(normalizeBroadcastAddress('127.0.0.1')).toBeNull();
    expect(normalizeBroadcastAddress('169.254.1.1')).toBeNull();
    // A magic packet must not leave the local network.
    expect(normalizeBroadcastAddress('8.8.8.8')).toBeNull();
    expect(normalizeBroadcastAddress('203.0.113.255')).toBeNull();
    expect(normalizeBroadcastAddress('172.30.32.255')).toBeNull();
    expect(normalizeBroadcastAddress('tv.local')).toBeNull();
    expect(normalizePort(9)).toBe(9);
    expect(normalizePort('7')).toBe(7);
    expect(normalizePort(0)).toBeNull();
    expect(normalizePort(70000)).toBeNull();
    expect(normalizePort(1.5)).toBeNull();
    expect(normalizePort('abc')).toBeNull();
  });

  it('derives the broadcast address of the /24 network without looking at the network', () => {
    expect(deriveBroadcastAddress('192.168.1.26')).toBe('192.168.1.255');
    expect(deriveBroadcastAddress('10.1.2.3', 16)).toBe('10.1.255.255');
    expect(deriveBroadcastAddress('172.16.5.130', 25)).toBe('172.16.5.255');
    expect(deriveBroadcastAddress('172.16.5.10', 25)).toBe('172.16.5.127');
    expect(deriveBroadcastAddress('not an ip')).toBeNull();
    expect(deriveBroadcastAddress('192.168.1.26', 31)).toBeNull();
  });
});

describe('createSlidingWindowLimiter', () => {
  it('allows `max` hits per window and then says how long to wait', () => {
    let now = 1_000;
    const limiter = createSlidingWindowLimiter(2, 10_000, () => now);

    expect(limiter.take('a').allowed).toBe(true);
    expect(limiter.take('a').allowed).toBe(true);
    const third = limiter.take('a');
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSeconds).toBe(10);

    expect(limiter.take('b').allowed).toBe(true);

    now += 10_001;
    expect(limiter.take('a').allowed).toBe(true);
  });
});

describe('secret file', () => {
  it('writes atomically, reads back and removes', () => {
    const file = join(tempDir(), 'secrets', 'service-identity.json');
    expect(readSecretFile(file)).toEqual({ ok: false, reason: 'missing' });

    writeSecretFile(file, '{"a":1}\n');
    expect(readSecretFile(file)).toEqual({ ok: true, content: '{"a":1}\n' });

    removeSecretFile(file);
    expect(readSecretFile(file)).toEqual({ ok: false, reason: 'missing' });
  });

  it.skipIf(process.platform === 'win32')(
    'creates the file 0600 in a 0700 folder and refuses a wider mode',
    () => {
      const folder = join(tempDir(), 'secrets');
      const file = join(folder, 'service-identity.json');
      writeSecretFile(file, 'secret');

      expect(statSync(file).mode & 0o777).toBe(0o600);
      expect(statSync(folder).mode & 0o777).toBe(0o700);

      chmodSync(file, 0o644);
      expect(readSecretFile(file)).toEqual({ ok: false, reason: 'too_open' });
      chmodSync(file, 0o600);
      expect(readSecretFile(file)).toEqual({ ok: true, content: 'secret' });
    }
  );
});

describe('flow input rules', () => {
  it('knows the steps of the TV only: the Wake on LAN flow is built by the server recipe', () => {
    expect(hasInputRules('webostv', 'user')).toBe(true);
    expect(hasInputRules('webostv', 'pairing')).toBe(true);
    expect(hasInputRules('webostv', 'reauth_confirm')).toBe(false);
    // Its MAC, broadcast address and port are installer-only values: a customer has no rule.
    expect(hasInputRules('wake_on_lan', 'user')).toBe(false);
    expect(hasInputRules('hue', 'user')).toBe(false);
  });

  it('rebuilds the body for HA from validated values', () => {
    expect(buildFlowInput('webostv', 'user', { host: ' 192.168.1.26 ' })).toEqual({
      ok: true,
      input: { host: '192.168.1.26' },
    });
    expect(buildFlowInput('webostv', 'pairing', undefined)).toEqual({ ok: true, input: {} });
    expect(buildFlowInput('webostv', 'pairing', {})).toEqual({ ok: true, input: {} });
  });

  it('has no way to build the Wake on LAN body from what a customer sends', () => {
    for (const raw of [
      { mac: '02:00:00:00:00:01' },
      { mac: '02:00:00:00:00:01', broadcast_address: '8.8.8.8', broadcast_port: 53 },
      {},
      undefined,
    ]) {
      expect(buildFlowInput('wake_on_lan', 'user', raw)).toEqual({ ok: false, field: null });
    }
  });

  it('names the wrong field and refuses extra keys instead of passing them on', () => {
    expect(buildFlowInput('webostv', 'user', {})).toEqual({ ok: false, field: 'host' });
    for (const host of ['127.0.0.1', '8.8.8.8', 'tv.local', '172.30.32.2']) {
      expect(buildFlowInput('webostv', 'user', { host })).toEqual({ ok: false, field: 'host' });
    }
    expect(buildFlowInput('webostv', 'user', { host: '192.168.1.26', extra: 'x' })).toEqual({
      ok: false,
      field: 'extra',
    });
    expect(buildFlowInput('webostv', 'pairing', { host: '192.168.1.26' })).toEqual({
      ok: false,
      field: 'host',
    });
    expect(buildFlowInput('webostv', 'user', 'host')).toEqual({ ok: false, field: null });
    expect(buildFlowInput('webostv', 'user', ['192.168.1.26'])).toEqual({ ok: false, field: null });
    expect(buildFlowInput('hue', 'user', { host: '192.168.1.5' })).toEqual({
      ok: false,
      field: null,
    });
  });
});

describe('normalizeFlowResult', () => {
  const form = (overrides: Record<string, unknown> = {}) => ({
    type: 'form',
    flow_id: 'flow1',
    handler: 'webostv',
    step_id: 'user',
    data_schema: [{ type: 'string', name: 'host', required: true }],
    errors: null,
    description_placeholders: { host: '192.168.1.10' },
    last_step: null,
    ...overrides,
  });

  it('turns a form into a step with Italian texts and no placeholders', () => {
    const normalized = normalizeFlowResult(form(), 'webostv');
    expect(normalized.outcome).toBe('step');
    if (normalized.outcome !== 'step') return;
    expect(normalized.dto).toMatchObject({
      type: 'form',
      flowId: 'flow1',
      stepId: 'user',
      title: 'Aggiungi il televisore LG',
      fields: [{ name: 'host', kind: 'text', required: true, label: 'Indirizzo del televisore' }],
      errors: [],
    });
    expect(JSON.stringify(normalized.dto)).not.toContain('192.168.1.10');
  });

  it('translates the errors of a form and keeps the machine code', () => {
    const normalized = normalizeFlowResult(
      form({ errors: { base: 'cannot_connect', host: 'weird_key' } }),
      'webostv'
    );
    if (normalized.outcome !== 'step' || normalized.dto.type !== 'form')
      throw new Error('expected a form');
    expect(normalized.dto.errors).toEqual([
      { field: null, code: 'cannot_connect', message: translateFormError('cannot_connect') },
      { field: 'host', code: 'weird_key', message: 'Qualcosa non ha funzionato. Riprova.' },
    ]);
    expect(normalized.dto.errors[0]?.message).toMatch(/televisore/);
  });

  it('reads selectors and typed fields, and gives up on a field it cannot draw', () => {
    const fields = [
      { name: 'mac', required: true, selector: { text: { type: 'text' } } },
      { name: 'secret', optional: true, selector: { text: { type: 'password' } } },
      { name: 'port', optional: true, selector: { number: { min: 0, max: 65535 } } },
      { name: 'flag', type: 'boolean', default: true },
      {
        name: 'mode',
        type: 'select',
        options: [
          ['a', 'Uno'],
          ['b', 'Due'],
        ],
      },
    ];
    const normalized = normalizeFlowResult(form({ data_schema: fields }), 'wake_on_lan');
    if (normalized.outcome !== 'step' || normalized.dto.type !== 'form')
      throw new Error('expected a form');
    expect(normalized.dto.fields.map((field) => [field.name, field.kind])).toEqual([
      ['mac', 'text'],
      ['secret', 'password'],
      ['port', 'number'],
      ['flag', 'boolean'],
      ['mode', 'select'],
    ]);
    expect(normalized.dto.fields[2]).toMatchObject({ min: 0, max: 65535 });
    expect(normalized.dto.fields[4]?.options).toEqual([
      { value: 'a', label: 'Uno' },
      { value: 'b', label: 'Due' },
    ]);

    const unknown = normalizeFlowResult(
      form({ data_schema: [{ name: 'object', selector: { object: { fields: {} } } }] }),
      'webostv'
    );
    expect(unknown).toEqual({
      outcome: 'unsupported',
      flowId: 'flow1',
      reason: 'unsupported_field',
    });
    expect(
      normalizeFlowResult(
        form({ data_schema: [{ type: 'expandable', name: 'section', schema: [] }] }),
        'webostv'
      )
    ).toMatchObject({ outcome: 'unsupported' });
  });

  it('tolerates nulls and extra fields (CT-06)', () => {
    const normalized = normalizeFlowResult(
      form({
        errors: null,
        description_placeholders: null,
        last_step: null,
        preview: null,
        extra: { a: 1 },
      }),
      'webostv'
    );
    expect(normalized.outcome).toBe('step');
  });

  it('keeps abort reasons translated', () => {
    const normalized = normalizeFlowResult(
      { type: 'abort', flow_id: 'flow1', handler: 'webostv', reason: 'already_configured' },
      'webostv'
    );
    expect(normalized).toEqual({
      outcome: 'terminal',
      nextFlowId: null,
      dto: {
        type: 'abort',
        handler: 'webostv',
        reason: 'already_configured',
        message: translateAbortReason('already_configured'),
      },
    });
  });

  it('reduces a created entry to ids and a title, hiding the MAC in the Wake on LAN title', () => {
    const created = normalizeFlowResult(
      {
        type: 'create_entry',
        flow_id: 'flow1',
        handler: 'wake_on_lan',
        title: 'Wake on LAN 02:00:00:00:00:01',
        data: { token: 'secret' },
        result: {
          entry_id: 'ENTRY1',
          domain: 'wake_on_lan',
          title: 'Wake on LAN 02:00:00:00:00:01',
          state: 'loaded',
        },
        next_flow: ['config_flow', 'next1'],
      },
      'wake_on_lan'
    );
    expect(created).toEqual({
      outcome: 'terminal',
      nextFlowId: 'next1',
      dto: {
        type: 'create_entry',
        handler: 'wake_on_lan',
        entryId: 'ENTRY1',
        domain: 'wake_on_lan',
        title: 'Accensione via rete',
      },
    });
    expect(publicEntryTitle('webostv', 'LG webOS TV UA751C0LA')).toBe('LG webOS TV UA751C0LA');
  });

  it.each([
    [
      'an external step',
      { type: 'external', flow_id: 'f', step_id: 'auth', url: 'https://example.org' },
    ],
    ['a type from a later HA', { type: 'shiny_new_type', flow_id: 'f' }],
    ['a created entry without its id', { type: 'create_entry', flow_id: 'f', result: {} }],
    ['a form without a step', { type: 'form', flow_id: 'f' }],
    ['something that is not an object', 'oops'],
  ])('does not guess %s', (_label, raw) => {
    expect(normalizeFlowResult(raw, 'webostv').outcome).toBe('unsupported');
  });

  it('translates the errors of a rejected step', () => {
    expect(
      flowErrorsFromBadRequest({
        errors: { host: 'required key not provided', base: ['cannot_connect'] },
      })
    ).toEqual([
      {
        field: 'host',
        code: 'required key not provided',
        message: 'Qualcosa non ha funzionato. Riprova.',
      },
      { field: null, code: 'cannot_connect', message: translateFormError('cannot_connect') },
    ]);
    expect(flowErrorsFromBadRequest('Failed dependencies')).toEqual([]);
  });
});

describe('catalogue', () => {
  const descriptions = {
    core: {
      integration: {
        lg: {
          name: 'LG',
          integrations: {
            webostv: {
              integration_type: 'device',
              config_flow: true,
              iot_class: 'local_push',
              name: 'LG webOS TV',
            },
            lg_thinq: { integration_type: 'hub', config_flow: true, name: 'LG ThinQ' },
          },
        },
        wake_on_lan: { integration_type: 'service', config_flow: true, name: 'Wake on LAN' },
        hue: { integration_type: 'hub', config_flow: true, name: 'Philips Hue' },
        sun: { integration_type: 'service', config_flow: false, name: 'Sun' },
        hue_friend: { integration_type: 'virtual', supported_by: 'hue', name: 'Hue Friend' },
        'bad domain!': { config_flow: true, name: 'Nope' },
      },
      helper: {},
    },
    custom: { integration: { shady: { config_flow: true, name: 'Shady' } } },
  };

  it('lists integrations with a flow, flattening brands, and ignores custom ones', () => {
    const items = parseIntegrationDescriptions(descriptions);
    expect(items.map((item) => item.domain).sort()).toEqual([
      'hue',
      'hue_friend',
      'lg_thinq',
      'wake_on_lan',
      'webostv',
    ]);
    expect(items.find((item) => item.domain === 'webostv')).toMatchObject({
      brand: 'LG',
      startDomain: 'webostv',
    });
    expect(items.find((item) => item.domain === 'hue_friend')).toMatchObject({
      startDomain: 'hue',
    });
  });

  it('marks only the listed integrations as startable and sorts them first', () => {
    const entries = searchCatalog(parseIntegrationDescriptions(descriptions), '');
    expect(entries.map((entry) => [entry.domain, entry.startable])).toEqual([
      ['webostv', true],
      ['hue_friend', false],
      ['lg_thinq', false],
      ['hue', false],
      // Its flow takes a MAC and a broadcast address: only the server recipe starts it.
      ['wake_on_lan', false],
    ]);
    expect(entries.find((entry) => entry.domain === 'hue')?.requiresInstaller).toBe(true);
  });

  it('searches by words in name, brand or domain, ignoring case and accents', () => {
    const items = parseIntegrationDescriptions(descriptions);
    expect(searchCatalog(items, 'lg tv').map((entry) => entry.domain)).toEqual(['webostv']);
    expect(searchCatalog(items, 'PHILIPS').map((entry) => entry.domain)).toEqual(['hue']);
    expect(searchCatalog(items, 'wake').map((entry) => entry.domain)).toEqual(['wake_on_lan']);
    expect(searchCatalog(items, 'nothing like this')).toEqual([]);
  });

  it('tolerates an answer that is not the expected shape', () => {
    expect(parseIntegrationDescriptions(null)).toEqual([]);
    expect(parseIntegrationDescriptions({ core: {} })).toEqual([]);
    expect(
      toCatalogEntry({
        domain: 'a',
        name: 'A',
        brand: null,
        integrationType: null,
        iotClass: null,
        startDomain: 'a',
      }).startable
    ).toBe(false);
  });
});

describe('the registry of actions', () => {
  it('keeps only strict identifiers: an address, a MAC or free text cannot get in', () => {
    const database = openDatabase(':memory:');
    const log = createActionLog(createDeviceModel(database), () => 1_700_000_000_000);

    log.record({
      user: { id: 'user-1', name: 'Mario\u0007 Rossi' },
      source: 'api',
      action: 'flow.step',
      domain: '192.168.1.10',
      entryId: '02:00:00:00:00:01',
      outcome: 'error',
      code: 'host 192.168.1.10 refused',
    });
    log.record({
      user: { id: 'user 1 with spaces', name: 'x'.repeat(200) },
      source: 'api',
      action: 'flow.step',
      domain: 'webostv',
      entryId: '01ABC',
      outcome: 'ok',
      code: 'cannot_connect',
    });
    log.record({ user: null, source: 'timer', action: 'not an action!', outcome: 'ok' });

    const rows = database.prepare('SELECT * FROM device_actions ORDER BY id').all();
    expect(rows).toEqual([
      expect.objectContaining({
        ha_user_id: 'user-1',
        ha_user_name: 'Mario Rossi',
        domain: null,
        entry_id: null,
        code: null,
        outcome: 'error',
      }),
      expect.objectContaining({
        ha_user_id: null,
        ha_user_name: 'x'.repeat(80),
        domain: 'webostv',
        entry_id: '01ABC',
        code: 'cannot_connect',
      }),
    ]);
    expect(JSON.stringify(rows)).not.toMatch(/192\.0\.2|02:00:00/);
    database.close();
  });

  it('never breaks the operation it describes', () => {
    const database = openDatabase(':memory:');
    const log = createActionLog(createDeviceModel(database));
    database.close();
    expect(() =>
      log.record({ user: null, source: 'api', action: 'flow.start', outcome: 'ok' })
    ).not.toThrow();
  });
});

describe('the hidden prompt of the terminal', () => {
  const makeTerminal = () => {
    const listeners = new Set<(chunk: string) => void>();
    const modes: boolean[] = [];
    const written: string[] = [];
    const input = {
      setRawMode: (mode: boolean) => void modes.push(mode),
      resume: () => undefined,
      pause: () => undefined,
      setEncoding: () => undefined,
      on: (_event: 'data', listener: (chunk: string) => void) => void listeners.add(listener),
      removeListener: (_event: 'data', listener: (chunk: string) => void) =>
        void listeners.delete(listener),
    };
    const type = (text: string) => listeners.forEach((listener) => listener(text));
    return {
      input,
      output: { write: (text: string) => void written.push(text) },
      type,
      modes,
      written,
      listeners,
    };
  };

  it('reads what is typed in raw mode, handles backspace and never echoes it', async () => {
    const terminal = makeTerminal();
    const prompter = createTtyPrompter({ input: terminal.input, output: terminal.output });

    const pending = prompter.askHidden('Password: ');
    terminal.type('abc');
    terminal.type('\u007fd');
    terminal.type('e\r');
    const value = await pending;

    expect(value).toBe('abde');
    expect(terminal.modes).toEqual([true, false]);
    expect(terminal.listeners.size).toBe(0);
    expect(terminal.written.join('')).toBe('Password: \n');
  });

  it('puts the terminal back and stops on Ctrl+C', async () => {
    const terminal = makeTerminal();
    let interrupted = 0;
    const prompter = createTtyPrompter({
      input: terminal.input,
      output: terminal.output,
      onInterrupt: () => void (interrupted += 1),
    });

    const pending = prompter.askHidden('Password: ');
    terminal.type('ab\u0003');
    expect(await pending).toBe('');
    expect(interrupted).toBe(1);
    expect(terminal.modes).toEqual([true, false]);
  });
});
