// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest';
import { createHarness } from './devicesHarness.ts';
import type { Harness } from './devicesHarness.ts';
import { buildGenericInput } from '../services/devices/flowInput.ts';
import {
  createUploadLedger,
  fillLookups,
  qrConfig,
  uploadFileName,
} from '../services/devices/flowExtras.ts';
import { normalizeFlowResult } from '../services/devices/flowModel.ts';
import type { FlowFieldDto } from '../services/devices/flowModel.ts';
import type { HaAdapter } from '../services/devices/haAdapter.ts';

/**
 * The fields that used to need the installer (REP-20261028-004, T7): `serial_port`, `file`,
 * `entity` and `qr_code`. Reading of the schema, the lookups in HA, the answer rules, and the
 * whole path (list, upload, answer) against the fake HA.
 */

const open: Harness[] = [];
afterEach(async () => {
  while (open.length) await open.pop()?.close();
});

const form = (schema: unknown[]) => ({
  type: 'form',
  flow_id: 'flow1',
  handler: 'acme',
  step_id: 'user',
  data_schema: schema,
  errors: null,
  description_placeholders: null,
});

const stepOf = (schema: unknown[]) => {
  const normalized = normalizeFlowResult(form(schema), 'acme');
  if (normalized.outcome !== 'step' || normalized.dto.type !== 'form') {
    throw new Error(`expected a form, got ${JSON.stringify(normalized)}`);
  }
  return normalized;
};

const fieldsOf = (schema: unknown[]): FlowFieldDto[] => {
  const step = stepOf(schema);
  return step.dto.type === 'form' ? step.dto.fields : [];
};

/** Only the two calls the lookups make. */
const adapterWith = (api: {
  serialPorts?: () => Promise<unknown[]>;
  entityChoices?: () => Promise<unknown[]>;
}): HaAdapter => ({ ws: () => api }) as unknown as HaAdapter;

describe('reading the four selectors', () => {
  it('reads a serial port, a file, an entity and a QR code', () => {
    const step = stepOf([
      {
        name: 'device',
        required: true,
        selector: { serial_port: { extra_recommended_domains: ['homeassistant_yellow'] } },
      },
      { name: 'backup', required: true, selector: { file: { accept: '.json, .zip' } } },
      {
        name: 'cam',
        optional: true,
        selector: { entity: { multiple: true, include_entities: ['camera.a', 'camera.b'] } },
      },
      {
        name: 'QR',
        optional: true,
        selector: { qr_code: { data: 'tuyaSmart--qrLogin?token=abc', scale: 5, error_correction_level: 'quartile' } },
      },
    ]);
    if (step.dto.type !== 'form') throw new Error('form expected');
    const [serial, file, entity, qr] = step.dto.fields;
    expect(serial).toMatchObject({ kind: 'select', allowCustom: true, options: [], required: true });
    expect(file).toMatchObject({ kind: 'file', accept: '.json, .zip' });
    expect(entity).toMatchObject({
      kind: 'multiselect',
      options: [
        { value: 'camera.a', label: 'camera.a' },
        { value: 'camera.b', label: 'camera.b' },
      ],
    });
    expect(qr).toMatchObject({
      kind: 'qr',
      required: false,
      qr: { data: 'tuyaSmart--qrLogin?token=abc', level: 'Q' },
    });
    expect(step.lookups?.map((lookup) => lookup.type)).toEqual(['serial_port', 'entity']);
  });

  it('maps the error correction levels and defaults to M', () => {
    expect(qrConfig({ data: 'x', error_correction_level: 'low' })?.level).toBe('L');
    expect(qrConfig({ data: 'x', error_correction_level: 'medium' })?.level).toBe('M');
    expect(qrConfig({ data: 'x', error_correction_level: 'high' })?.level).toBe('H');
    expect(qrConfig({ data: 'x' })?.level).toBe('M');
  });

  it('refuses a QR code with no text, a long one, and an odd accept list', () => {
    expect(qrConfig({})).toBeNull();
    expect(qrConfig({ data: 'x'.repeat(1001) })).toBeNull();
    expect(qrConfig({ data: 'a\nb' })).toBeNull();
    expect(
      normalizeFlowResult(
        form([{ name: 'f', required: true, selector: { file: { accept: '<script>' } } }]),
        'acme'
      )
    ).toMatchObject({ outcome: 'unsupported' });
  });
});

describe('looking the choices up in HA', () => {
  const schema = [
    { name: 'device', required: true, selector: { serial_port: { extra_recommended_domains: ['zha'] } } },
    { name: 'light', required: true, selector: { entity: { filter: [{ domain: 'light', integration: 'hue' }] } } },
  ];

  it('lists the ports with the recommended ones first and filters the entities', async () => {
    const adapter = adapterWith({
      serialPorts: async () => [
        { device: '/dev/ttyUSB1', description: null, manufacturer: null, matchingIntegrations: [] },
        { device: '/dev/ttyUSB0', description: 'Sky', manufacturer: 'Nabu', matchingIntegrations: ['zha'] },
      ],
      entityChoices: async () => [
        { entityId: 'light.sala', platform: 'hue', name: 'Sala', deviceClass: null },
        { entityId: 'light.hall', platform: 'wiz', name: 'Hall', deviceClass: null },
        { entityId: 'switch.tv', platform: 'hue', name: 'Tv', deviceClass: null },
      ],
    });
    const filled = await fillLookups(adapter, 'token', stepOf(schema));
    if (filled.dto.type !== 'form') throw new Error('form expected');
    const [port, light] = filled.dto.fields;
    expect(port?.options?.map((option) => option.value)).toEqual(['/dev/ttyUSB0', '/dev/ttyUSB1']);
    expect(port?.options?.[0]?.label).toBe('Sky (/dev/ttyUSB0) – consigliata');
    expect(light?.options).toEqual([{ value: 'light.sala', label: 'Sala (light.sala)' }]);
  });

  it('keeps the field usable when HA does not answer', async () => {
    const fails = async () => {
      throw new Error('boom');
    };
    const filled = await fillLookups(
      adapterWith({ serialPorts: fails, entityChoices: fails }),
      'token',
      stepOf(schema)
    );
    if (filled.dto.type !== 'form') throw new Error('form expected');
    expect(filled.dto.fields[0]).toMatchObject({ options: [], allowCustom: true });
  });

  it('applies include_entities and exclude_entities', async () => {
    const adapter = adapterWith({
      entityChoices: async () => [
        { entityId: 'camera.a', platform: 'x', name: 'Ingresso', deviceClass: null },
        { entityId: 'camera.b', platform: 'x', name: 'Giardino', deviceClass: null },
      ],
    });
    const step = stepOf([
      {
        name: 'cam',
        required: true,
        selector: { entity: { include_entities: ['camera.a', 'camera.b', 'camera.c'], exclude_entities: ['camera.b'] } },
      },
    ]);
    const filled = await fillLookups(adapter, 'token', step);
    if (filled.dto.type !== 'form') throw new Error('form expected');
    expect(filled.dto.fields[0]?.options).toEqual([
      // Sorted by label.
      { value: 'camera.c', label: 'camera.c' },
      { value: 'camera.a', label: 'Ingresso (camera.a)' },
    ]);
  });
});

describe('the answer', () => {
  const FILE_ID = 'a'.repeat(31) + '1';
  const fields = fieldsOf([
    { name: 'backup', required: true, selector: { file: { accept: '.json' } } },
    { name: 'QR', optional: true, selector: { qr_code: { data: 'x' } } },
  ]);

  it('takes the id of a file this flow uploaded and nothing else', () => {
    const uploaded = (id: string) => id === FILE_ID;
    expect(buildGenericInput(fields, {}, { backup: FILE_ID }, uploaded)).toEqual({
      ok: true,
      input: { backup: FILE_ID },
    });
    for (const value of ['b'.repeat(32), 'not-an-id', 12, '../../x']) {
      expect(buildGenericInput(fields, {}, { backup: value }, uploaded)).toEqual({
        ok: false,
        field: 'backup',
      });
    }
    // Without the check, no id is accepted.
    expect(buildGenericInput(fields, {}, { backup: FILE_ID })).toEqual({ ok: false, field: 'backup' });
    expect(buildGenericInput(fields, {}, {}, uploaded)).toEqual({ ok: false, field: 'backup' });
  });

  it('never sends the QR code, and refuses a value for it', () => {
    const uploaded = () => true;
    expect(buildGenericInput(fields, {}, { backup: FILE_ID, QR: 'x' }, uploaded)).toEqual({
      ok: false,
      field: 'QR',
    });
  });

  it('cleans the name of an uploaded file', () => {
    expect(uploadFileName('C:\\temp\\radio backup.json')).toBe('radio_backup.json');
    expect(uploadFileName('../../etc/passwd')).toBe('passwd');
    expect(uploadFileName('.hidden')).toBe('hidden');
    expect(uploadFileName('')).toBe('file');
    expect(uploadFileName(42)).toBe('file');
    expect(uploadFileName('a'.repeat(300)).length).toBe(100);
  });

  it('limits the files of a flow and forgets finished flows', () => {
    const ledger = createUploadLedger();
    for (let index = 0; index < 5; index += 1) expect(ledger.add('f1', `id${index}`)).toBe(true);
    expect(ledger.add('f1', 'one-too-many')).toBe(false);
    expect(ledger.has('f1', 'id0')).toBe(true);
    expect(ledger.has('f2', 'id0')).toBe(false);
    ledger.prune(() => false);
    expect(ledger.has('f1', 'id0')).toBe(false);
  });
});

describe('the whole path against the fake HA', () => {
  const seed = async () => {
    const harness = await createHarness({});
    open.push(harness);
    harness.fake.serialPorts = [
      {
        device: '/dev/ttyUSB0',
        description: 'Adattatore',
        manufacturer: 'Acme',
        matching_integrations: [],
        present: true,
      },
    ];
    harness.fake.entities.push({
      entity_id: 'light.sala',
      platform: 'hue',
      device_id: 'd1',
      config_entry_id: 'e1',
      hidden_by: null,
      disabled_by: null,
    });
    const flowId = harness.fake.seedDiscovery({
      handler: 'acme',
      name: 'Acme Radio',
      steps: [
        {
          stepId: 'setup',
          schema: [
            { name: 'device', required: true, selector: { serial_port: {} } },
            { name: 'backup', required: true, selector: { file: { accept: '.json' } } },
            { name: 'light', optional: true, selector: { entity: { filter: { domain: 'light' } } } },
          ],
        },
        {
          stepId: 'scan',
          schema: [{ name: 'QR', optional: true, selector: { qr_code: { data: 'acme://login?t=1' } } }],
        },
      ],
      entry: { title: 'Acme Radio', manufacturer: 'Acme', model: 'R1', entityId: 'sensor.acme_radio' },
    });
    return { harness, flowId };
  };

  it('shows the ports and entities, uploads the file, answers and shows the QR code', async () => {
    const { harness, flowId } = await seed();
    const taken = await harness.request(`/scoperti/${flowId}/aggiungi`, { method: 'POST' });
    expect(taken.status).toBe(200);
    const fields = taken.body.fields as FlowFieldDto[];
    expect(fields.map((field) => field.kind)).toEqual(['select', 'file', 'select']);
    expect(fields[0]?.options).toEqual([
      { value: '/dev/ttyUSB0', label: 'Adattatore (/dev/ttyUSB0)' },
    ]);
    expect(fields[2]?.options).toEqual([{ value: 'light.sala', label: 'light.sala' }]);
    // Nothing of the lookups leaks into the answer to the browser.
    expect(JSON.stringify(taken.body)).not.toContain('lookups');

    // An id that was not uploaded here is refused.
    const forged = await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      body: { input: { device: '/dev/ttyUSB0', backup: 'c'.repeat(32) } },
    });
    expect(forged.status).toBe(400);

    const uploaded = await harness.request(`/flussi/${flowId}/file?campo=backup&nome=radio%20backup.json`, {
      method: 'POST',
      raw: Buffer.from('{"a":1}'),
    });
    expect(uploaded.status).toBe(200);
    expect(uploaded.body).toEqual({ fileId: expect.stringMatching(/^[0-9a-f]{32}$/), fileName: 'radio_backup.json' });
    expect(harness.fake.uploads).toEqual([
      expect.objectContaining({ filename: 'radio_backup.json' }),
    ]);

    const next = await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      body: { input: { device: '/dev/ttyUSB0', backup: uploaded.body.fileId, light: 'light.sala' } },
    });
    expect(next.status).toBe(200);
    expect(harness.fake.received.at(-1)?.body).toEqual({
      device: '/dev/ttyUSB0',
      backup: uploaded.body.fileId,
      light: 'light.sala',
    });
    expect((next.body.fields as FlowFieldDto[])[0]).toMatchObject({
      kind: 'qr',
      qr: { data: 'acme://login?t=1', level: 'M' },
    });

    const done = await harness.request(`/flussi/${flowId}`, { method: 'POST', body: { input: {} } });
    expect(done.body.type).toBe('create_entry');
    expect(harness.fake.received.at(-1)?.body).toEqual({});
  });

  it('lets a typed port path through and refuses an upload for the wrong field or flow', async () => {
    const { harness, flowId } = await seed();
    await harness.request(`/scoperti/${flowId}/aggiungi`, { method: 'POST' });

    const wrongField = await harness.request(`/flussi/${flowId}/file?campo=device&nome=x.json`, {
      method: 'POST',
      raw: Buffer.from('x'),
    });
    expect(wrongField.status).toBe(400);
    const missingField = await harness.request(`/flussi/${flowId}/file?nome=x.json`, {
      method: 'POST',
      raw: Buffer.from('x'),
    });
    expect(missingField.status).toBe(400);
    const empty = await harness.request(`/flussi/${flowId}/file?campo=backup&nome=x.json`, {
      method: 'POST',
      raw: Buffer.alloc(0),
    });
    expect(empty.status).toBe(400);
    const otherUser = await harness.request(`/flussi/${flowId}/file?campo=backup&nome=x.json`, {
      method: 'POST',
      user: 'customer2',
      raw: Buffer.from('x'),
    });
    expect(otherUser.status).toBe(403);
    const unknown = await harness.request(`/flussi/nope/file?campo=backup&nome=x.json`, {
      method: 'POST',
      raw: Buffer.from('x'),
    });
    expect(unknown.status).toBe(404);
    expect(harness.fake.uploads).toEqual([]);

    const typed = await harness.request(`/flussi/${flowId}/file?campo=backup&nome=x.json`, {
      method: 'POST',
      raw: Buffer.from('x'),
    });
    const answered = await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      body: { input: { device: 'socket://192.168.1.50:6638', backup: typed.body.fileId } },
    });
    expect(answered.status).toBe(200);
  });

  it('answers 413 for a file over the limit', async () => {
    const { harness, flowId } = await seed();
    await harness.request(`/scoperti/${flowId}/aggiungi`, { method: 'POST' });
    const big = await harness.request(`/flussi/${flowId}/file?campo=backup&nome=big.bin`, {
      method: 'POST',
      raw: Buffer.alloc(10 * 1024 * 1024 + 1),
    });
    expect(big.status).toBe(413);
    expect(harness.fake.uploads).toEqual([]);
  });
});
