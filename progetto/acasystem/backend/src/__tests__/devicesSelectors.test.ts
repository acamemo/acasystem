// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest';
import { createHarness } from './devicesHarness.ts';
import type { Harness } from './devicesHarness.ts';
import { buildGenericInput } from '../services/devices/flowInput.ts';
import { normalizeFlowResult } from '../services/devices/flowModel.ts';
import type { FlowFieldDto } from '../services/devices/flowModel.ts';
import { parseTranslations } from '../services/devices/haTexts.ts';

/**
 * The fields of a discovered flow that Acasystem draws without the installer (REP-20261028-003,
 * S1b): text subtypes, choices with a value of their own, countries, constants, sections,
 * suggested values and forms of any length; and what it still refuses.
 */

const form = (schema: unknown[]) => ({
  type: 'form',
  flow_id: 'flow1',
  handler: 'acme',
  step_id: 'user',
  data_schema: schema,
  errors: null,
  description_placeholders: null,
});

const fieldsOf = (schema: unknown[], handler = 'acme', translations = null as never) => {
  const normalized = normalizeFlowResult(form(schema), handler, translations);
  if (normalized.outcome !== 'step' || normalized.dto.type !== 'form') {
    throw new Error(`expected a form, got ${JSON.stringify(normalized)}`);
  }
  return { fields: normalized.dto.fields, constants: normalized.constants };
};

describe('text fields', () => {
  it('keeps the format of an address, an e-mail and a phone number', () => {
    const { fields } = fieldsOf([
      { name: 'site', required: true, selector: { text: { type: 'url' } } },
      { name: 'mail', optional: true, selector: { text: { type: 'email' } } },
      { name: 'phone', optional: true, selector: { text: { type: 'tel' } } },
      { name: 'plain', optional: true, selector: { text: { type: 'text' } } },
      { name: 'search', optional: true, selector: { text: { type: 'search' } } },
      { name: 'key', optional: true, selector: { text: { type: 'password' } } },
      { name: 'old_mail', type: 'string', format: 'email' },
      { name: 'old_url', type: 'string', format: 'url' },
    ]);
    expect(fields.map((field) => [field.name, field.kind, field.inputType])).toEqual([
      ['site', 'text', 'url'],
      ['mail', 'text', 'email'],
      ['phone', 'text', 'tel'],
      ['plain', 'text', undefined],
      ['search', 'text', undefined],
      ['key', 'password', undefined],
      ['old_mail', 'text', 'email'],
      ['old_url', 'text', 'url'],
    ]);
  });

  it('refuses a list of texts', () => {
    const normalized = normalizeFlowResult(
      form([{ name: 'tags', selector: { text: { multiple: true } } }]),
      'acme'
    );
    expect(normalized).toMatchObject({ outcome: 'unsupported', reason: 'unsupported_field' });
  });
});

describe('choices', () => {
  it('marks a choice that takes a value of its own and keeps a multiple one', () => {
    const { fields } = fieldsOf([
      {
        name: 'zone',
        required: true,
        selector: { select: { options: ['a', { value: 'b', label: 'Bi' }], custom_value: true } },
      },
      {
        name: 'many',
        optional: true,
        selector: { select: { options: ['x', 'y'], multiple: true } },
      },
    ]);
    expect(fields[0]).toMatchObject({
      kind: 'select',
      allowCustom: true,
      options: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'Bi' },
      ],
    });
    expect(fields[1]).toMatchObject({ kind: 'multiselect' });
    expect(fields[1]).not.toHaveProperty('allowCustom');
  });

  it('shows a translated-by-key value as a readable word, and leaves a label as it is', () => {
    const { fields } = fieldsOf([
      {
        name: 'mode',
        selector: { select: { options: ['auto_off', '192.168.1.5', { value: 'on', label: 'On' }] } },
      },
    ]);
    expect(fields[0]?.options).toEqual([
      { value: 'auto_off', label: 'Auto off' },
      { value: '192.168.1.5', label: '192.168.1.5' },
      { value: 'on', label: 'On' },
    ]);
  });

  it('keeps more than a hundred choices', () => {
    const options = Array.from({ length: 250 }, (_, index) => `v${index}`);
    const { fields } = fieldsOf([{ name: 'big', selector: { select: { options } } }]);
    expect(fields[0]?.options).toHaveLength(250);
  });

  it('draws a country selector with Italian names, sorted, and honours the allowed list', () => {
    const { fields } = fieldsOf([
      { name: 'country', required: true, selector: { country: {} } },
      { name: 'some', optional: true, selector: { country: { countries: ['IT', 'FR', 'DE'] } } },
      {
        name: 'fixed_order',
        optional: true,
        selector: { country: { countries: ['IT', 'FR', 'DE'], no_sort: true } },
      },
    ]);
    const all = fields[0]?.options ?? [];
    expect(all.length).toBeGreaterThan(200);
    expect(all.find((option) => option.value === 'IT')?.label).toBe('Italia');
    expect(all.find((option) => option.value === 'DE')?.label).toBe('Germania');
    const labels = all.map((option) => option.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, 'it')));
    expect(fields[1]?.options?.map((option) => option.value)).toEqual(['FR', 'DE', 'IT']);
    expect(fields[2]?.options?.map((option) => option.value)).toEqual(['IT', 'FR', 'DE']);
  });
});

describe('constants, suggested values and long forms', () => {
  it('keeps a constant selector like a constant field: never drawn, always sent', () => {
    const { fields, constants } = fieldsOf([
      { name: 'ver', selector: { constant: { value: 2, label: 'Versione 2' } } },
      { name: 'fixed', type: 'constant', value: 'x' },
      { name: 'host', required: true, type: 'string' },
    ]);
    expect(fields.map((field) => field.name)).toEqual(['host']);
    expect(constants).toEqual({ ver: 2, fixed: 'x' });
  });

  it('shows the value HA suggests as the default, unless HA gave a default', () => {
    const { fields } = fieldsOf([
      { name: 'host', required: true, type: 'string', description: { suggested_value: '192.168.1.5' } },
      {
        name: 'port',
        optional: true,
        type: 'integer',
        default: 80,
        description: { suggested_value: 8080 },
      },
    ]);
    expect(fields[0]?.default).toBe('192.168.1.5');
    expect(fields[1]?.default).toBe(80);
  });

  it('has no limit on the number of fields', () => {
    const schema = Array.from({ length: 80 }, (_, index) => ({
      name: `campo_${index}`,
      optional: true,
      type: 'string',
    }));
    expect(fieldsOf(schema).fields).toHaveLength(80);
  });
});

describe('sections', () => {
  const schema = [
    { name: 'host', required: true, type: 'string' },
    {
      type: 'expandable',
      name: 'advanced',
      optional: true,
      expanded: false,
      schema: [
        { name: 'port', optional: true, type: 'integer', valueMin: 1, valueMax: 65535 },
        { name: 'verify', optional: true, type: 'boolean', default: true },
        { name: 'api', type: 'constant', value: 'v2' },
      ],
    },
  ];

  it('flattens the fields of a section, marked with it, and keeps its constants nested', () => {
    const { fields, constants } = fieldsOf(schema);
    expect(fields.map((field) => [field.name, field.section])).toEqual([
      ['host', undefined],
      ['advanced.port', 'advanced'],
      ['advanced.verify', 'advanced'],
    ]);
    expect(fields[1]).toMatchObject({
      kind: 'integer',
      min: 1,
      max: 65535,
      label: 'Porta',
      sectionLabel: 'Advanced',
    });
    expect(fields[1]).not.toHaveProperty('sectionRequired');
    expect(constants).toEqual({ advanced: { api: 'v2' } });
  });

  it('takes the Italian texts of the section and of its fields from HA', () => {
    const translations = parseTranslations('acme', {
      resources: {
        'component.acme.config.step.user.sections.advanced.name': 'Opzioni avanzate',
        'component.acme.config.step.user.sections.advanced.data.port': 'Porta del servizio',
        'component.acme.config.step.user.sections.advanced.data_description.port':
          'La porta che usa il dispositivo.',
      },
    });
    const { fields } = fieldsOf(schema, 'acme', translations as never);
    expect(fields[1]).toMatchObject({
      label: 'Porta del servizio',
      hint: 'La porta che usa il dispositivo.',
      sectionLabel: 'Opzioni avanzate',
    });
  });

  it('marks the fields of a required section', () => {
    const { fields } = fieldsOf([
      {
        type: 'expandable',
        name: 'auth',
        required: true,
        schema: [{ name: 'user', optional: true, type: 'string' }],
      },
    ]);
    expect(fields[0]).toMatchObject({ name: 'auth.user', sectionRequired: true });
  });

  it('puts a required section that has nothing to ask among the constants, and ignores an optional one', () => {
    expect(
      fieldsOf([{ type: 'expandable', name: 'empty', required: true, schema: [] }]).constants
    ).toEqual({ empty: {} });
    expect(
      fieldsOf([{ type: 'expandable', name: 'empty', optional: true, schema: [] }]).constants
    ).toEqual({});
  });

  it('refuses a section inside a section, a section with no name and a field of another kind in it', () => {
    for (const schema of [
      [
        {
          type: 'expandable',
          name: 'a',
          schema: [{ type: 'expandable', name: 'b', schema: [] }],
        },
      ],
      [{ type: 'expandable', schema: [] }],
      [{ type: 'expandable', name: 'a', schema: [{ name: 'o', selector: { object: {} } }] }],
    ]) {
      expect(normalizeFlowResult(form(schema), 'acme')).toMatchObject({
        outcome: 'unsupported',
        reason: 'unsupported_field',
      });
    }
  });
});

describe('what is still not drawn', () => {
  it.each([
    ['object', { object: {} }],
    ['device', { device: {} }],
    ['area', { area: {} }],
    ['duration', { duration: {} }],
  ])('refuses the %s selector, naming the reason', (_name, selector) => {
    expect(normalizeFlowResult(form([{ name: 'x', required: true, selector }]), 'acme')).toEqual({
      outcome: 'unsupported',
      flowId: 'flow1',
      reason: 'unsupported_field',
    });
  });
});

describe('the answer, built again from the flat fields', () => {
  const { fields, constants } = fieldsOf([
    { name: 'host', required: true, type: 'string' },
    {
      type: 'expandable',
      name: 'advanced',
      optional: true,
      schema: [
        { name: 'port', optional: true, type: 'integer', valueMin: 1, valueMax: 65535 },
        { name: 'verify', optional: true, type: 'boolean' },
        { name: 'api', type: 'constant', value: 'v2' },
      ],
    },
    {
      type: 'expandable',
      name: 'login',
      required: true,
      schema: [{ name: 'user', optional: true, type: 'string' }],
    },
  ]);
  const build = (raw: unknown) => buildGenericInput(fields, constants, raw);

  it('nests the fields of a section and sends its constants with them', () => {
    expect(build({ host: 'tv', 'advanced.port': '8080', 'advanced.verify': false })).toEqual({
      ok: true,
      input: { host: 'tv', advanced: { api: 'v2', port: 8080, verify: false }, login: {} },
    });
  });

  it('sends a required section empty and an optional one with only its constants', () => {
    expect(build({ host: 'tv' })).toEqual({
      ok: true,
      input: { host: 'tv', advanced: { api: 'v2' }, login: {} },
    });
    expect(build({ host: 'tv', 'login.user': 'mario' })).toEqual({
      ok: true,
      input: { host: 'tv', advanced: { api: 'v2' }, login: { user: 'mario' } },
    });
  });

  it('does not change the constants of the step between two answers', () => {
    build({ host: 'tv', 'advanced.port': 80 });
    expect(constants).toEqual({ advanced: { api: 'v2' } });
    expect(build({ host: 'tv' })).toMatchObject({ input: { advanced: { api: 'v2' } } });
  });

  it.each([
    ['a value out of the range of a field in a section', { host: 'tv', 'advanced.port': 0 }, 'advanced.port'],
    ['a text for a boolean in a section', { host: 'tv', 'advanced.verify': 'si' }, 'advanced.verify'],
    ['the inner name without its section', { host: 'tv', port: 80 }, 'port'],
    ['an object instead of the flat fields', { host: 'tv', advanced: { port: 80 } }, 'advanced'],
    ['a constant sent by the person', { host: 'tv', 'advanced.api': 'v9' }, 'advanced.api'],
  ])('refuses %s and names the field', (_label, raw, field) => {
    expect(build(raw)).toEqual({ ok: false, field });
  });
});

describe('a choice with a value of its own', () => {
  const field: FlowFieldDto = {
    name: 'zone',
    kind: 'select',
    required: true,
    label: 'Zona',
    allowCustom: true,
    options: [{ value: 'a', label: 'A' }],
  };

  it('accepts a listed value and any plain text, and refuses an empty or a control one', () => {
    expect(buildGenericInput([field], {}, { zone: 'a' })).toEqual({ ok: true, input: { zone: 'a' } });
    expect(buildGenericInput([field], {}, { zone: ' soggiorno ' })).toEqual({
      ok: true,
      input: { zone: 'soggiorno' },
    });
    expect(buildGenericInput([field], {}, { zone: '' })).toEqual({ ok: false, field: 'zone' });
    expect(buildGenericInput([field], {}, { zone: 'a\u0000b' })).toEqual({
      ok: false,
      field: 'zone',
    });
  });

  it('still refuses a value that is not listed when the choice does not take its own', () => {
    expect(
      buildGenericInput([{ ...field, allowCustom: false }], {}, { zone: 'soggiorno' })
    ).toEqual({ ok: false, field: 'zone' });
  });

  it('checks every value of a multiple choice that takes its own', () => {
    const many: FlowFieldDto = { ...field, name: 'zones', kind: 'multiselect' };
    expect(buildGenericInput([many], {}, { zones: ['a', 'cucina', 'a'] })).toEqual({
      ok: true,
      input: { zones: ['a', 'cucina'] },
    });
  });

  it('accepts a country code of the list and refuses another', () => {
    const { fields: country } = fieldsOf([{ name: 'country', required: true, selector: { country: {} } }]);
    expect(buildGenericInput(country, {}, { country: 'IT' })).toEqual({
      ok: true,
      input: { country: 'IT' },
    });
    expect(buildGenericInput(country, {}, { country: 'XX' })).toEqual({
      ok: false,
      field: 'country',
    });
  });
});

describe('a discovered flow with sections and many fields, end to end', () => {
  const open: Harness[] = [];
  afterEach(async () => {
    while (open.length) await open.pop()?.close();
  });

  it('is shown, answered with the nested body and finished without the installer', async () => {
    const harness = await createHarness({});
    open.push(harness);
    const extra = Array.from({ length: 50 }, (_, index) => ({
      name: `extra_${index}`,
      optional: true,
      type: 'string',
    }));
    const flowId = harness.fake.seedDiscovery({
      handler: 'acme',
      name: 'Acme Hub',
      steps: [
        {
          stepId: 'settings',
          schema: [
            { name: 'host', required: true, type: 'string' },
            ...extra,
            {
              type: 'expandable',
              name: 'advanced',
              optional: true,
              schema: [
                { name: 'port', optional: true, type: 'integer' },
                { name: 'api', type: 'constant', value: 'v2' },
              ],
            },
          ],
        },
      ],
      entry: { title: 'Acme Hub', manufacturer: 'Acme', model: 'H1', entityId: 'sensor.acme_hub' },
    });

    const listed = await harness.request('/scoperti');
    expect(listed.body.devices).toEqual([expect.objectContaining({ flowId, addable: true })]);

    const taken = await harness.request(`/scoperti/${flowId}/aggiungi`, { method: 'POST' });
    expect(taken.status).toBe(200);
    const fields = (taken.body as { fields: { name: string }[] }).fields;
    expect(fields).toHaveLength(52);
    expect(fields.map((field) => field.name)).toContain('advanced.port');

    const done = await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      body: { input: { host: '192.168.1.40', 'advanced.port': 8080 } },
    });
    expect(done.status).toBe(200);
    expect(done.body.type).toBe('create_entry');
    expect(harness.fake.received.at(-1)?.body).toEqual({
      host: '192.168.1.40',
      advanced: { api: 'v2', port: 8080 },
    });
  });

  it('still answers «Richiede l’installatore» for a field it cannot draw', async () => {
    const harness = await createHarness({});
    open.push(harness);
    const flowId = harness.fake.seedDiscovery({
      handler: 'acme',
      steps: [{ stepId: 'files', schema: [{ name: 'when', required: true, selector: { duration: {} } }] }],
      entry: { title: 'Acme', manufacturer: 'Acme', model: 'H1', entityId: 'sensor.acme' },
    });
    const taken = await harness.request(`/scoperti/${flowId}/aggiungi`, { method: 'POST' });
    expect(taken.status).toBe(403);
    expect(taken.body.code).toBe('REQUIRES_INSTALLER');
  });
});
