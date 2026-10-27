// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest';
import { buildGenericInput, buildMenuInput } from '../services/devices/flowInput.ts';
import type { FlowFieldDto } from '../services/devices/flowModel.ts';
import {
  cleanHaText,
  createTranslationCache,
  italianText,
  looksEnglish,
  parseTranslations,
} from '../services/devices/haTexts.ts';
import { createHarness, everythingVisible } from './devicesHarness.ts';
import type { Harness, HarnessOptions } from './devicesHarness.ts';
import type { ScriptedEntry, ScriptedStep } from './fakeHomeAssistant.ts';

/**
 * F4 (ADR-0024, annotation of 2026-10-27): a customer does at home what the installer does, with
 * the same steps. Generic forms from the schema of HA, Italian texts from HA, menu, progress and
 * external steps, the Samsung J series by address, and «Rimuovi dispositivo».
 */

const open: Harness[] = [];
const harnessFor = async (options: HarnessOptions = {}): Promise<Harness> => {
  const harness = await createHarness(options);
  open.push(harness);
  return harness;
};

afterEach(async () => {
  while (open.length) await open.pop()?.close();
});

const TRANSLATIONS = 'frontend/get_translations';
const FLOW_READ = 'GET /api/config/config_entries/flow/{flow_id}';
const ENTRY_DELETE = 'DELETE /api/config/config_entries/entry/{entry_id}';

const entry = (overrides: Partial<ScriptedEntry> = {}): ScriptedEntry => ({
  title: 'Acme lampada',
  manufacturer: 'Acme',
  model: 'L1',
  entityId: 'light.acme_lampada',
  ...overrides,
});

const start = (harness: Harness, handler: string, user: 'customer' | 'installer' = 'customer') =>
  harness.request('/flussi', { method: 'POST', user, body: { handler } });

const answer = (
  harness: Harness,
  flowId: unknown,
  input: unknown,
  user: 'customer' | 'installer' = 'customer'
) => harness.request(`/flussi/${String(flowId)}`, { method: 'POST', user, body: { input } });

describe('the texts of HA', () => {
  const resources = {
    resources: {
      'component.samsungtv.config.step.encrypted_pairing.data.pin': 'Codice PIN',
      'component.samsungtv.config.step.encrypted_pairing.data_description.pin':
        'Il PIN visualizzato sulla tua TV.',
      'component.samsungtv.config.step.encrypted_pairing.description':
        'Digita il PIN visualizzato su {device}.',
      'component.samsungtv.config.step.user.data.host': 'Host',
      'component.samsungtv.config.step.user.description':
        'Enter the host name or IP address of your TV.',
      'component.samsungtv.config.step.menu.menu_options.cloud': 'Accedi al cloud',
      'component.samsungtv.config.error.invalid_pin': 'PIN errato.',
      'component.samsungtv.config.abort.not_supported': 'Questa TV non è supportata.',
      'component.samsungtv.config.progress.wait': 'Attendi la risposta della TV.',
      'component.other.config.step.user.data.host': 'Altro',
      'component.samsungtv.entity.sensor.x.name': 'ignorato',
    },
  };

  it('reads the keys of one handler and leaves the rest', () => {
    const parsed = parseTranslations('samsungtv', resources);
    expect(parsed.steps.encrypted_pairing?.data.pin).toBe('Codice PIN');
    expect(parsed.steps.encrypted_pairing?.dataDescription.pin).toBe(
      'Il PIN visualizzato sulla tua TV.'
    );
    expect(parsed.steps.user?.data.host).toBe('Host');
    expect(parsed.steps.menu?.menuOptions.cloud).toBe('Accedi al cloud');
    expect(parsed.errors.invalid_pin).toBe('PIN errato.');
    expect(parsed.aborts.not_supported).toBe('Questa TV non è supportata.');
    expect(parsed.progress.wait).toBe('Attendi la risposta della TV.');
    expect(JSON.stringify(parsed)).not.toContain('Altro');
    expect(parseTranslations('samsungtv', null)).toEqual({
      steps: {},
      errors: {},
      aborts: {},
      progress: {},
    });
  });

  it('tells English from Italian and keeps the short labels both languages share', () => {
    expect(looksEnglish('Enter the host name or IP address of your TV.')).toBe(true);
    expect(looksEnglish('Type the PIN shown on {device}.')).toBe(true);
    expect(looksEnglish('Digita il PIN visualizzato su {device}.')).toBe(false);
    expect(looksEnglish('Il nome host o l’indirizzo IP della tua TV.')).toBe(false);
    for (const label of ['Host', 'Password', 'Codice PIN', 'Porta', 'PIN']) {
      expect(looksEnglish(label), label).toBe(false);
    }
    expect(looksEnglish('Username')).toBe(true);
    expect(italianText('Enter your name', {})).toBeNull();
    expect(italianText(undefined, {})).toBeNull();
  });

  it('puts the placeholders in, without addresses, MACs, links or markup', () => {
    expect(
      cleanHaText('Digita il PIN su {device} ({host}).', {
        device: 'Samsung TV (192.168.1.10) 02:00:00:00:00:01',
        host: '192.168.1.10',
      })
    ).toBe('Digita il PIN su Samsung TV (questo dispositivo).');
    expect(cleanHaText('Apri [la guida]({url}) e **continua**.\n\nPoi `torna` qui.', { url: 'https://x.test' })).toBe(
      'Apri la guida e continua. Poi torna qui.'
    );
    expect(cleanHaText('<b>Ciao</b> {sconosciuto}', {})).toBe('Ciao questo dispositivo');
    expect(cleanHaText('   ', {})).toBeNull();
    expect(cleanHaText('x'.repeat(5000), {})?.length).toBeLessThanOrEqual(600);
  });

  it('keeps the answer for an hour, asks again after, and remembers a failure for a minute', async () => {
    let now = 1_000;
    let calls = 0;
    let failing = false;
    const cache = createTranslationCache({ now: () => now });
    const load = async () => {
      calls += 1;
      if (failing) throw new Error('unknown_command');
      return resources;
    };

    expect((await cache.get('samsungtv', load))?.errors.invalid_pin).toBe('PIN errato.');
    await cache.get('samsungtv', load);
    expect(calls).toBe(1);
    now += 3_599_000;
    await cache.get('samsungtv', load);
    expect(calls).toBe(1);
    now += 2_000;
    failing = true;
    expect((await cache.get('samsungtv', load))?.errors.invalid_pin).toBe(undefined);
    // The failed read is kept for a minute: no second try, the texts of Acasystem are used.
    expect(calls).toBe(2);
    now += 10_000;
    expect(await cache.get('samsungtv', load)).toBeNull();
    expect(calls).toBe(2);
    now += 60_000;
    failing = false;
    expect(await cache.get('samsungtv', load)).not.toBeNull();
    expect(calls).toBe(3);
  });
});

describe('input rules derived from the schema', () => {
  const fields: FlowFieldDto[] = [
    { name: 'host', kind: 'text', required: true, label: 'Host' },
    { name: 'secret', kind: 'password', required: true, label: 'Segreto' },
    { name: 'count', kind: 'integer', required: false, label: 'N', min: 1, max: 5 },
    { name: 'ratio', kind: 'number', required: false, label: 'R', min: 0, max: 1 },
    { name: 'flag', kind: 'boolean', required: false, label: 'F' },
    {
      name: 'mode',
      kind: 'select',
      required: false,
      label: 'M',
      options: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ],
    },
    {
      name: 'many',
      kind: 'multiselect',
      required: false,
      label: 'Mm',
      options: [
        { value: 'x', label: 'X' },
        { value: 'y', label: 'Y' },
      ],
    },
    { name: 'note', kind: 'text', required: false, label: 'Nota', multiline: true },
  ];
  const build = (raw: unknown) => buildGenericInput(fields, { fixed: 7 }, raw);

  it('accepts a good answer and sends constants, normalised addresses and untrimmed passwords', () => {
    expect(
      build({
        host: ' 192.168.1.9 ',
        secret: ' pa ss ',
        count: '3',
        ratio: 0.5,
        flag: false,
        mode: 'b',
        many: ['x', 'y', 'x'],
        note: 'riga 1\nriga 2',
      })
    ).toEqual({
      ok: true,
      input: {
        fixed: 7,
        host: '192.168.1.9',
        secret: ' pa ss ',
        count: 3,
        ratio: 0.5,
        flag: false,
        mode: 'b',
        many: ['x', 'y'],
        note: 'riga 1\nriga 2',
      },
    });
    expect(build({ host: 'tv', secret: 's' })).toMatchObject({ ok: true });
    expect(build({ host: 'tv.local', secret: 's' })).toMatchObject({ ok: true });
  });

  it.each([
    ['a public address as host', { host: '8.8.8.8', secret: 's' }, 'host'],
    ['a public name as host', { host: 'example.com', secret: 's' }, 'host'],
    ['a missing required field', { host: '192.168.1.9' }, 'secret'],
    ['an empty required field', { host: '192.168.1.9', secret: '' }, 'secret'],
    ['a control character', { host: '192.168.1.9', secret: 'a\u0000b' }, 'secret'],
    ['a text that is too long', { host: '192.168.1.9', secret: 'x'.repeat(1025) }, 'secret'],
    ['a number out of range', { host: '192.168.1.9', secret: 's', count: 6 }, 'count'],
    ['a decimal for an integer', { host: '192.168.1.9', secret: 's', count: 2.5 }, 'count'],
    ['a text for a number', { host: '192.168.1.9', secret: 's', ratio: 'molto' }, 'ratio'],
    ['a text for a boolean', { host: '192.168.1.9', secret: 's', flag: 'true' }, 'flag'],
    ['an option that is not listed', { host: '192.168.1.9', secret: 's', mode: 'z' }, 'mode'],
    ['a choice that is not listed', { host: '192.168.1.9', secret: 's', many: ['x', 'z'] }, 'many'],
    ['a key that is not a field', { host: '192.168.1.9', secret: 's', extra: 1 }, 'extra'],
  ])('refuses %s and names the field', (_label, raw, field) => {
    expect(build(raw)).toEqual({ ok: false, field });
  });

  it('leaves a required field with a default to HA, and refuses what is not an object', () => {
    expect(
      buildGenericInput(
        [{ name: 'port', kind: 'integer', required: true, label: 'P', default: 80 }],
        {},
        {}
      )
    ).toEqual({ ok: true, input: {} });
    expect(build([])).toEqual({ ok: false, field: null });
    expect(build('x')).toEqual({ ok: false, field: null });
  });

  it('answers a menu only with one of its options', () => {
    expect(buildMenuInput(['a', 'b'], { next_step_id: 'b' })).toEqual({
      ok: true,
      input: { next_step_id: 'b' },
    });
    expect(buildMenuInput(['a', 'b'], { next_step_id: 'c' })).toEqual({
      ok: false,
      field: 'next_step_id',
    });
    expect(buildMenuInput(['a'], { next_step_id: 'a', more: 1 })).toEqual({
      ok: false,
      field: 'more',
    });
    expect(buildMenuInput(['a'], undefined)).toEqual({ ok: false, field: null });
  });
});

describe('a form drawn from the schema of HA', () => {
  const schema = [
    { type: 'string', name: 'host', required: true },
    { name: 'password', required: true, selector: { text: { type: 'password' } } },
    { name: 'retries', optional: true, selector: { number: { min: 1, max: 5 } } },
    { type: 'boolean', name: 'ssl', default: true },
    {
      name: 'mode',
      optional: true,
      selector: {
        select: {
          options: [
            { value: 'fast', label: 'Veloce' },
            { value: 'slow', label: 'Lento' },
          ],
        },
      },
    },
    { type: 'multi_select', name: 'rooms', options: { a: 'Cucina', b: 'Bagno' }, optional: true },
    { type: 'constant', name: 'version', value: 2 },
  ];
  const acme = (steps: ScriptedStep[] = [{ stepId: 'user', schema }]) => ({
    steps,
    entry: entry(),
  });

  it('shows the fields with Italian labels and sends to HA only validated values', async () => {
    const harness = await harnessFor({});
    harness.fake.scriptHandler('acme', acme());

    const started = await start(harness, 'acme');
    expect(started.status).toBe(201);
    expect(started.body).toMatchObject({ type: 'form', handler: 'acme', stepId: 'user' });
    const fields = started.body.fields as { name: string; kind: string; label: string }[];
    expect(fields.map((field) => [field.name, field.kind])).toEqual([
      ['host', 'text'],
      ['password', 'password'],
      ['retries', 'number'],
      ['ssl', 'boolean'],
      ['mode', 'select'],
      ['rooms', 'multiselect'],
    ]);
    // No Italian text anywhere: the generic labels of the field names.
    expect(fields[0]?.label).toBe('Indirizzo IP o nome');
    expect(fields[1]?.label).toBe('Password');
    expect(started.body.title).toBe('Aggiungi un dispositivo');

    const wrong = await answer(harness, started.body.flowId, {
      host: '192.168.1.40',
      password: 'segreto-F4',
      retries: 9,
    });
    expect(wrong.status).toBe(400);
    expect(wrong.body).toMatchObject({ code: 'INVALID_INPUT', field: 'retries' });
    expect(harness.fake.received).toEqual([]);

    const done = await answer(harness, started.body.flowId, {
      host: '192.168.1.40',
      password: 'segreto-F4',
      retries: 3,
      ssl: false,
      mode: 'slow',
      rooms: ['b'],
    });
    expect(done.status).toBe(200);
    expect(done.body).toMatchObject({ type: 'create_entry', domain: 'acme', pending: false });
    expect(harness.fake.received[0]?.body).toEqual({
      version: 2,
      host: '192.168.1.40',
      password: 'segreto-F4',
      retries: 3,
      ssl: false,
      mode: 'slow',
      rooms: ['b'],
    });

    // The values went to HA and nowhere else: not in the logs, the registry or the database.
    const visible = everythingVisible(harness);
    expect(visible).not.toContain('segreto-F4');
    expect(visible).not.toContain('192.168.1.40');
    const registry = await harness.request('/registro', { user: 'installer' });
    expect(JSON.stringify(registry.body)).not.toContain('segreto-F4');
  });

  it('answers "Richiede l’installatore" for a field it cannot draw, and cancels the flow', async () => {
    const harness = await harnessFor({});
    harness.fake.scriptHandler(
      'acme',
      acme([{ stepId: 'user', schema: [{ name: 'area', selector: { area: {} } }] }])
    );
    harness.fake.resetCalls();

    const refused = await start(harness, 'acme');
    expect(refused.status).toBe(403);
    expect(refused.body.code).toBe('REQUIRES_INSTALLER');
    expect(harness.fake.flows.size).toBe(0);
    expect(harness.database.prepare('SELECT COUNT(*) AS n FROM device_flows').get()).toEqual({
      n: 0,
    });
  });

  it('refuses a key that is not in the schema, and answers HA errors in Italian', async () => {
    const harness = await harnessFor({});
    harness.fake.scriptHandler(
      'acme',
      acme([
        {
          stepId: 'user',
          schema: [{ type: 'string', name: 'host', required: true }],
          check: () => 'cannot_connect',
        },
      ])
    );
    const started = await start(harness, 'acme');
    const extra = await answer(harness, started.body.flowId, {
      host: '192.168.1.40',
      mac: CANARY_MAC,
    });
    expect(extra.status).toBe(400);
    expect(extra.body).toMatchObject({ code: 'INVALID_INPUT', field: 'mac' });

    const refused = await answer(harness, started.body.flowId, { host: '192.168.1.40' });
    expect(refused.status).toBe(200);
    // A device that is not a TV: the error does not talk about «il televisore».
    expect(refused.body).toMatchObject({
      type: 'form',
      errors: [{ field: null, code: 'cannot_connect' }],
    });
    const message = String((refused.body.errors as { message: string }[])[0]?.message);
    expect(message).toContain('dispositivo');
    expect(message).not.toContain('televisore');
  });

  it('uses the Italian texts of HA, ours first, and falls back when they are English or missing', async () => {
    const harness = await harnessFor({});
    harness.fake.knobs.translations.acme = {
      'component.acme.config.step.user.title': 'Collega Acme',
      'component.acme.config.step.user.description': 'Enter the address of your Acme bridge.',
      'component.acme.config.step.user.data.host': 'Indirizzo del ponte',
      'component.acme.config.step.user.data.password': 'Enter your password',
      'component.acme.config.step.user.data_description.host': 'Lo trovi sull’etichetta di {name}.',
      'component.acme.config.error.cannot_connect': 'Il ponte non risponde.',
    };
    harness.fake.scriptHandler(
      'acme',
      acme([
        {
          stepId: 'user',
          placeholders: { name: 'Acme 192.168.1.40' },
          schema: [
            { type: 'string', name: 'host', required: true },
            { type: 'string', name: 'password', required: true },
          ],
          check: () => 'cannot_connect',
        },
      ])
    );

    const started = await start(harness, 'acme');
    expect(started.body).toMatchObject({
      title: 'Collega Acme',
      // The description is English: dropped, not shown.
      description: null,
      fields: [
        { name: 'host', label: 'Indirizzo del ponte', hint: 'Lo trovi sull’etichetta di Acme.' },
        // English label: the generic Italian one.
        { name: 'password', label: 'Password' },
      ],
    });
    expect(JSON.stringify(started.body)).not.toContain('192.168.1.40');

    // The error text of HA is used when we have no text of our own for that key... which we do
    // for cannot_connect, so ours (generic for a device) wins.
    const refused = await answer(harness, started.body.flowId, {
      host: '192.168.1.40',
      password: 'p',
    });
    expect(refused.body.errors).toEqual([
      expect.objectContaining({ code: 'cannot_connect', message: 'Il ponte non risponde.' }),
    ]);
  });

  it('asks HA for the texts once per handler, and goes on without them if HA has no such command', async () => {
    const harness = await harnessFor({});
    harness.fake.scriptHandler('acme', acme());
    for (let index = 0; index < 3; index += 1) {
      const started = await start(harness, 'acme');
      await harness.request(`/flussi/${String(started.body.flowId)}`, { method: 'DELETE' });
    }
    const calls = harness.fake.callsFor(TRANSLATIONS);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ via: 'ws', tokenKind: 'llat' });

    const bare = await harnessFor({});
    bare.fake.knobs.translationsMissing = true;
    bare.fake.scriptHandler('acme', acme());
    const started = await start(bare, 'acme');
    expect(started.status).toBe(201);
    expect((started.body.fields as { label: string }[])[0]?.label).toBe('Indirizzo IP o nome');
    await start(bare, 'acme', 'installer');
    expect(bare.fake.callsFor(TRANSLATIONS)).toHaveLength(1);
  });
});

const CANARY_MAC = '02:00:00:00:00:77';

describe('steps that are not forms', () => {
  it('shows a menu with Italian options and goes where the person chooses', async () => {
    const harness = await harnessFor({});
    harness.fake.knobs.translations.acme = {
      'component.acme.config.step.menu.menu_options.cloud': 'Usa il cloud',
    };
    harness.fake.scriptHandler('acme', {
      steps: [
        { stepId: 'menu', type: 'menu', menuOptions: ['cloud', 'local_setup'] },
        { stepId: 'cloud', schema: [{ type: 'string', name: 'api_key', required: true }] },
        { stepId: 'local_setup', schema: [] },
      ],
      entry: entry(),
    });

    const started = await start(harness, 'acme');
    expect(started.body).toMatchObject({
      type: 'menu',
      stepId: 'menu',
      options: [
        { id: 'cloud', label: 'Usa il cloud' },
        { id: 'local_setup', label: 'Local setup' },
      ],
    });

    const bad = await answer(harness, started.body.flowId, { next_step_id: 'other' });
    expect(bad.status).toBe(400);
    expect(bad.body).toMatchObject({ code: 'INVALID_INPUT', field: 'next_step_id' });

    const chosen = await answer(harness, started.body.flowId, { next_step_id: 'cloud' });
    expect(chosen.status).toBe(200);
    expect(chosen.body).toMatchObject({
      type: 'form',
      stepId: 'cloud',
      fields: [{ name: 'api_key', label: 'Chiave API' }],
    });
    expect(harness.fake.received[0]?.body).toEqual({ next_step_id: 'cloud' });
  });

  it('waits for a progress step by reading the flow until HA moves on', async () => {
    const harness = await harnessFor({});
    harness.fake.knobs.translations.acme = {
      'component.acme.config.progress.scan': 'Cerco il dispositivo.',
    };
    harness.fake.scriptHandler('acme', {
      steps: [
        { stepId: 'scan', type: 'progress', progressAction: 'scan', readsBeforeNext: 3 },
        { stepId: 'done', schema: [] },
      ],
      entry: entry(),
    });

    const started = await start(harness, 'acme');
    expect(started.body).toMatchObject({
      type: 'progress',
      stepId: 'scan',
      description: 'Cerco il dispositivo.',
      progressAction: 'scan',
    });

    const flowId = started.body.flowId as string;
    expect((await harness.request(`/flussi/${flowId}`)).body).toMatchObject({ type: 'progress' });
    expect((await harness.request(`/flussi/${flowId}`)).body).toMatchObject({ type: 'progress' });
    const moved = await harness.request(`/flussi/${flowId}`);
    expect(moved.body).toMatchObject({ type: 'form', stepId: 'done' });

    // A progress step is never answered by a person.
    const again = await start(harness, 'acme', 'installer');
    const refused = await answer(harness, again.body.flowId, {}, 'installer');
    expect(refused.status).toBe(400);
    expect(refused.body.code).toBe('INVALID_INPUT');
  });

  it('reads through progress_done and external_done to the next step', async () => {
    const harness = await harnessFor({});
    harness.fake.scriptHandler('acme', {
      steps: [
        {
          stepId: 'scan',
          type: 'progress',
          readsBeforeNext: 1,
          doneType: 'progress_done',
        },
        { stepId: 'done', schema: [] },
      ],
      entry: entry(),
    });
    const started = await start(harness, 'acme');
    const moved = await harness.request(`/flussi/${String(started.body.flowId)}`);
    expect(moved.status).toBe(200);
    expect(moved.body).toMatchObject({ type: 'form', stepId: 'done' });
    expect(harness.fake.callsFor(FLOW_READ)).toHaveLength(2);
  });

  it('gives the page of the maker for an external step and reads the flow until it is done', async () => {
    const harness = await harnessFor({});
    harness.fake.scriptHandler('acme', {
      steps: [
        {
          stepId: 'auth',
          type: 'external',
          url: 'https://accounts.example.test/oauth?state=abc',
          readsBeforeNext: 2,
          doneType: 'external_done',
        },
        { stepId: 'finish', schema: [] },
      ],
      entry: entry(),
    });

    const started = await start(harness, 'acme');
    expect(started.body).toMatchObject({
      type: 'external',
      stepId: 'auth',
      url: 'https://accounts.example.test/oauth?state=abc',
    });
    expect(String(started.body.description)).toContain('sito del produttore');

    const flowId = started.body.flowId as string;
    expect((await harness.request(`/flussi/${flowId}`)).body).toMatchObject({ type: 'external' });
    const next = await harness.request(`/flussi/${flowId}`);
    expect(next.body).toMatchObject({ type: 'form', stepId: 'finish' });

    const created = await answer(harness, flowId, {});
    expect(created.body).toMatchObject({ type: 'create_entry', domain: 'acme' });
    // The entry was made by a person from Acasystem: it is theirs to read, rename and remove.
    const entryId = (created.body as { entryId: string }).entryId;
    expect((await harness.request(`/voci/${entryId}`)).status).toBe(200);
  });

  it('registers who created an entry that appeared while the flow was only being read', async () => {
    const harness = await harnessFor({});
    harness.fake.scriptHandler('acme', {
      steps: [{ stepId: 'auth', type: 'external', readsBeforeNext: 1 }],
      entry: entry(),
    });
    const started = await start(harness, 'acme');
    const created = await harness.request(`/flussi/${String(started.body.flowId)}`);
    expect(created.body).toMatchObject({ type: 'create_entry' });
    const registry = await harness.request('/registro', { user: 'installer' });
    expect(registry.body.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: 'flow.read', outcome: 'ok', domain: 'acme' }),
      ])
    );
    const entryId = (created.body as { entryId: string }).entryId;
    expect((await harness.request(`/voci/${entryId}`)).status).toBe(200);
  });

  it.each([
    ['a link that is not http', 'javascript:alert(1)'],
    ['a link with a password', 'https://user:pass@example.test/'],
  ])('refuses an external step with %s and cancels the flow', async (_label, url) => {
    const harness = await harnessFor({});
    harness.fake.scriptHandler('acme', {
      steps: [{ stepId: 'auth', type: 'external', url }],
      entry: entry(),
    });
    const refused = await start(harness, 'acme');
    expect(refused.status).toBe(422);
    expect(refused.body.code).toBe('UNSUPPORTED_STEP');
    expect(harness.fake.flows.size).toBe(0);
    expect(JSON.stringify(refused.body)).not.toContain('example.test');
  });

  it('tells why a flow ended: our text, the Italian text of HA, or a plain sentence', async () => {
    const harness = await harnessFor({});
    harness.fake.knobs.translations.acme = {
      'component.acme.config.abort.account_locked': 'L’account è bloccato.',
      'component.acme.config.abort.region_not_ready': 'The region is not ready.',
    };
    const reasons = [
      ['not_supported', 'Questo dispositivo non è supportato.'],
      ['account_locked', 'L’account è bloccato.'],
      ['region_not_ready', "L'aggiunta non è andata a buon fine."],
      ['never_seen', "L'aggiunta non è andata a buon fine."],
    ] as const;
    for (const [reason, message] of reasons) {
      harness.fake.scriptHandler('acme', {
        steps: [
          {
            stepId: 'user',
            schema: [{ type: 'string', name: 'host', required: true }],
            abort: () => reason,
          },
        ],
        entry: entry(),
      });
      const started = await start(harness, 'acme');
      const ended = await answer(harness, started.body.flowId, { host: '192.168.1.40' });
      expect(ended.body, reason).toMatchObject({ type: 'abort', reason, message });
    }
  });
});

describe('the Samsung J series by address (REP-20261026-006)', () => {
  const scriptSamsung = (harness: Harness) =>
    harness.fake.scriptHandler('samsungtv', {
      steps: [
        { stepId: 'user', schema: [{ type: 'string', name: 'host', required: true }] },
        {
          stepId: 'encrypted_pairing',
          schema: [{ type: 'string', name: 'pin', required: true }],
          check: (body) => (body.pin === '4321' ? null : 'invalid_pin'),
        },
      ],
      entry: {
        title: 'UE50J6200',
        manufacturer: 'Samsung',
        model: 'UE50J6200',
        entityId: 'media_player.tv_samsung_50_j6200',
      },
    });

  it('goes from the address to the PIN on the TV to a device that is the customer’s own', async () => {
    const harness = await harnessFor({});
    harness.fake.knobs.version = '2026.10.4';
    harness.fake.knobs.translations.samsungtv = {
      'component.samsungtv.config.step.user.data.host': 'Host',
      'component.samsungtv.config.step.user.data_description.host':
        'Il nome host o l’indirizzo IP della tua TV.',
      'component.samsungtv.config.step.encrypted_pairing.data.pin': 'Codice PIN',
    };
    scriptSamsung(harness);
    await harness.module.start();

    const status = await harness.request('/stato');
    expect(status.body).toMatchObject({ features: { flows: true } });

    const started = await start(harness, 'samsungtv');
    expect(started.status).toBe(201);
    expect(started.body).toMatchObject({
      type: 'form',
      stepId: 'user',
      title: 'Aggiungi il televisore Samsung',
      fields: [{ name: 'host', label: 'Indirizzo del televisore' }],
    });

    const flowId = started.body.flowId as string;
    expect((await answer(harness, flowId, { host: '8.8.8.8' })).body).toMatchObject({
      code: 'INVALID_INPUT',
      field: 'host',
    });
    const pairing = await answer(harness, flowId, { host: '192.168.1.60' });
    expect(pairing.body).toMatchObject({
      type: 'form',
      stepId: 'encrypted_pairing',
      title: 'Scrivi il codice',
      fields: [{ name: 'pin', label: 'Codice mostrato sul televisore' }],
    });

    const wrong = await answer(harness, flowId, { pin: '0000' });
    expect(wrong.body).toMatchObject({
      type: 'form',
      stepId: 'encrypted_pairing',
      errors: [{ code: 'invalid_pin', message: 'Il codice non è quello mostrato sul televisore. Riprova.' }],
    });
    expect((await answer(harness, flowId, { pin: '12' })).body.field).toBe('pin');

    const done = await answer(harness, flowId, { pin: '4321' });
    expect(done.body).toMatchObject({
      type: 'create_entry',
      domain: 'samsungtv',
      pending: false,
      entry: {
        loaded: true,
        mediaPlayerEntityId: 'media_player.tv_samsung_50_j6200',
        device: { name: 'UE50J6200', manufacturer: 'Samsung' },
      },
    });
    expect(harness.fake.received.map((item) => item.body)).toEqual([
      { host: '192.168.1.60' },
      { pin: '0000' },
      { pin: '4321' },
    ]);

    // Name, room and removal work on it, although its source is `user` like a hand-made entry.
    const created = done.body as { entryId: string; entry: { device: { id: string } } };
    expect(
      (
        await harness.request(`/dispositivi/${created.entry.device.id}`, {
          method: 'PATCH',
          body: { name: 'Televisore sala' },
        })
      ).body
    ).toMatchObject({ name: 'Televisore sala' });

    const visible = everythingVisible(harness);
    expect(visible).not.toContain('192.168.1.60');
    expect(visible).not.toContain('4321');
  });
});

describe('«Rimuovi dispositivo»', () => {
  const addAcme = async (harness: Harness) => {
    harness.fake.scriptHandler('acme', { steps: [{ stepId: 'user', schema: [] }], entry: entry() });
    const started = await start(harness, 'acme');
    const done = await answer(harness, started.body.flowId, {});
    return done.body as { entryId: string };
  };

  it('removes an entry the customer created, and writes it in the registry', async () => {
    const harness = await harnessFor({});
    const { entryId } = await addAcme(harness);
    harness.fake.resetCalls();

    const removed = await harness.request(`/voci/${entryId}`, { method: 'DELETE' });
    expect(removed.status).toBe(200);
    expect(removed.body).toEqual({ removed: true });
    expect(harness.fake.callsFor(ENTRY_DELETE)).toHaveLength(1);
    expect(harness.fake.callsFor(ENTRY_DELETE)[0]).toMatchObject({
      userId: harness.serviceUserId,
      tokenKind: 'llat',
    });
    expect(harness.fake.entries.some((item) => item.entry_id === entryId)).toBe(false);
    expect((await harness.request(`/voci/${entryId}`)).status).toBe(404);

    const registry = await harness.request('/registro', { user: 'installer' });
    expect(registry.body.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'entry.remove',
          outcome: 'ok',
          domain: 'acme',
          entryId,
          user: 'user-customer',
        }),
      ])
    );
  });

  it('never touches a system integration or an entry made by hand in HA', async () => {
    const harness = await harnessFor({});
    const seed = (domain: string, source: string) => {
      const id = `SEED${domain.toUpperCase()}${source.toUpperCase()}`.slice(0, 26);
      harness.fake.entries.push({
        entry_id: id,
        domain,
        title: domain,
        loadedAt: 0,
        host: null,
        mac: null,
        source,
      });
      return id;
    };
    const system = ['hassio', 'backup', 'sun', 'met', 'go2rtc', 'person', 'zone'].map((domain) =>
      seed(domain, 'system')
    );
    // Even a «discovery» of a system integration is not removable from here.
    const sneaky = seed('analytics', 'zeroconf');
    const byHand = seed('hue', 'user');
    harness.fake.resetCalls();

    for (const id of [...system, sneaky, byHand]) {
      const refused = await harness.request(`/voci/${id}`, { method: 'DELETE' });
      expect(refused.status, id).toBe(403);
      expect(refused.body.code, id).toBe('REQUIRES_INSTALLER');
      const read = await harness.request(`/voci/${id}`);
      expect(read.status, `read ${id}`).toBe(403);
    }
    expect(harness.fake.callsFor(ENTRY_DELETE)).toHaveLength(0);
    expect(harness.fake.entries).toHaveLength(system.length + 2);

    const registry = await harness.request('/registro', { user: 'installer' });
    expect(registry.body.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: 'entry.remove', outcome: 'denied', domain: 'hassio' }),
      ])
    );
  });

  it('answers not found for an entry that does not exist, and "servizio non attivo" without the service', async () => {
    const harness = await harnessFor({});
    const missing = await harness.request('/voci/NOPE', { method: 'DELETE' });
    expect(missing.status).toBe(404);
    expect(missing.body.code).toBe('ENTRY_NOT_FOUND');

    const off = await harnessFor({ activeService: false });
    const refused = await off.request('/voci/ABC', { method: 'DELETE' });
    expect(refused.status).toBe(503);
    expect(refused.body.code).toBe('SERVICE_NOT_ACTIVE');
    expect(
      (await off.request('/voci/ABC', { method: 'DELETE', user: null })).status
    ).toBe(401);
  });

  it('takes the power-on recipe of a TV away with it, and keeps the Wake on LAN entry out of reach', async () => {
    const harness = await harnessFor({});
    harness.fake.knobs.tvMacInRegistry = '02:00:00:00:00:05';
    const tv = harness.fake.seedTv({ host: '192.168.1.99' });
    const setup = await harness.request(`/accensione/${tv.entry_id}`, {
      method: 'POST',
      body: {},
    });
    expect(setup.status).toBe(200);
    const link = harness.module.context.model.links.get(tv.entry_id);
    expect(link).toBeDefined();
    const wolId = link?.wol_entry_id ?? '';

    // The Wake on LAN entry belongs to the recipe: it goes with the TV, not by itself.
    const alone = await harness.request(`/voci/${wolId}`, { method: 'DELETE' });
    expect(alone.status).toBe(403);

    const removed = await harness.request(`/voci/${tv.entry_id}`, { method: 'DELETE' });
    expect(removed.status).toBe(200);
    expect(harness.fake.entries.map((item) => item.entry_id)).not.toContain(tv.entry_id);
    expect(harness.fake.entries.map((item) => item.entry_id)).not.toContain(wolId);
    expect(harness.fake.automations.size).toBe(0);
    expect(harness.module.context.model.links.get(tv.entry_id)).toBeUndefined();
  });
});
