import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CardSettings } from '@/@types/dashboard';
import { CategoryWidgetContent } from '@/templates/launcher/CategoryWidgetContent';
import { WidgetDetailsContent } from '@/templates/launcher/DetailsSheet';
import { CategoryBindingSection } from '@/templates/sheets/CategoryBindingSection';
import { findWidgetDefinition } from '@/components/widgets/registry';
import { applyUtilityBinding } from '@/utils/launcher/utilityBinding';
import { captureWidget, configOf, emptyWidgetMemory, memoryKey, type WidgetState } from '@/utils/launcher/deviceMemory';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, renderWithRuntime } from './UtilityHarness';

const entities = fixtureEntities([
  fixtureEntity('calendar.family', 'off', { friendly_name: 'Famiglia' }),
  fixtureEntity('todo.shopping', '1', { friendly_name: 'Spesa', supported_features: 7 }),
  fixtureEntity('light.sala', 'on', { friendly_name: 'Luce sala', supported_color_modes: ['onoff'] }),
]);
const source = () => fakeConnection({
  'todo/item/list': () => ({ items: [{ uid: 'milk', summary: 'Latte', status: 'needs_action' }] }),
  call_service: (message) => {
    if (message.domain !== 'calendar' || message.service !== 'get_events') throw new Error('Unexpected mutation');
    return { response: { 'calendar.family': { events: [] } } };
  },
  'config/area_registry/list': () => [{ area_id: 'sala', name: 'Sala' }],
  'config/device_registry/list': () => [{ id: 'device', area_id: 'sala' }],
  'config/entity_registry/list': () => [{ entity_id: 'light.sala', device_id: 'device', area_id: null }],
});
const cases: Array<{ kind: 'calendar' | 'todo' | 'room'; settings: CardSettings; widget: string; details: string; open: string }> = [
  { kind: 'calendar', settings: { categoryWidgetType: 'calendar', calendars: ['calendar.family'], subtitle: 'Agenda personale' },
    widget: '.home-widget', details: '.home-agenda-details', open: 'Apri il calendario Agenda personale' },
  { kind: 'todo', settings: { categoryWidgetType: 'todo', todoEntityId: 'todo.shopping', subtitle: 'Da fare' },
    widget: '.home-widget', details: '.home-agenda-details', open: 'Apri la lista Da fare' },
  { kind: 'room', settings: { categoryWidgetType: 'room', areaId: 'sala', areaName: 'Sala', entityIds: ['light.sala'], roomMembershipSource: 'area' },
    widget: '.room-widget', details: '.room-details', open: 'Sala, apri i dettagli' },
];
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

for (const entry of cases) {
  describe(`Raccordo ${entry.kind}`, () => {
    const id = `${entry.kind}_card_preset_integration`, settingsKey = `category_${entry.kind}::${id}`;
    it('monta la UI operativa corrente e apre l’identità del widget senza servizi al mount', async () => {
      const definition = findWidgetDefinition(id, entry.settings)!;
      const { conn, sendMessagePromise } = source(); const callService = vi.fn(), openDetails = vi.fn();
      const view = renderWithRuntime(<CategoryWidgetContent definition={definition} onConfigure={vi.fn()}
        id={id} settingsKey={settingsKey} settings={entry.settings} size={{ w: 2, h: 2 }} editMode={false} />,
        { conn, entities, callService, openDetails, services: { light: { turn_on: {}, turn_off: {} } } });
      await screen.findByRole('button', { name: entry.open });
      if (entry.kind === 'room') await waitFor(() => expect(view.container.querySelector('.utility-split')).not.toBeNull());
      await waitFor(() => expect(view.container.querySelectorAll(entry.widget)).toHaveLength(1));
      expect(view.container.querySelector('.aca-adaptive-widget')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: entry.open })); expect(openDetails).toHaveBeenCalledExactlyOnceWith(id);
      expect(callService).not.toHaveBeenCalled();
      expect(sendMessagePromise.mock.calls.every(([message]) => message.type !== 'call_service' ||
        message.domain === 'calendar' && message.service === 'get_events' && message.return_response === true)).toBe(true);
    });
    it('rende un solo corpo dettagli senza ricreare un header adattivo', async () => {
      const definition = findWidgetDefinition(id, entry.settings)!; const { conn } = source(); const callService = vi.fn();
      const view = renderWithRuntime(<WidgetDetailsContent definition={definition} onClose={vi.fn()}
        target={{ widgetId: id, pageId: `category_${entry.kind}`, settingsKey, settings: entry.settings, title: entry.kind }} />,
        { conn, entities, callService, services: { light: { turn_on: {}, turn_off: {} } } });
      await waitFor(() => expect(view.container.querySelectorAll(entry.details)).toHaveLength(1));
      expect(view.container.querySelector('.aca-adaptive-widget')).toBeNull();
      expect(view.container.querySelector('.aca-adaptive-widget__header')).toBeNull();
      expect(view.container.querySelector('.home-widget')).toBeNull();
      expect(callService).not.toHaveBeenCalled();
    });
    it('il binding di categoria usa il nuovo editor senza inviare associazioni al mount', async () => {
      const { conn } = source(); const save = vi.fn(), saveBinding = vi.fn(async () => {}), callService = vi.fn();
      renderWithRuntime(<CategoryBindingSection settings={entry.settings} resourceKey={settingsKey} save={save} saveBinding={saveBinding} />,
        { conn, entities, callService });
      if (entry.kind === 'calendar') expect(await screen.findByRole('button', { name: 'Applica i calendari' })).toBeTruthy();
      else if (entry.kind === 'room') expect(await screen.findByRole('button', { name: 'Collega la stanza' })).toBeTruthy();
      else expect(await screen.findByRole('heading', { name: 'Lista di attività' })).toBeTruthy();
      expect(save).not.toHaveBeenCalled(); expect(saveBinding).not.toHaveBeenCalled(); expect(callService).not.toHaveBeenCalled();
    });
  });
}

const stateOf = (patch: Partial<WidgetState> = {}): WidgetState => ({ layout: null, pagesConfig: null,
  cardSettings: {}, customNames: {}, customIcons: {}, memory: emptyWidgetMemory(), ...patch });

describe('Associazioni utilità atomiche e memoria', () => {
  it.each([
    ['calendar', { calendars: ['calendar.family', 'calendar.work'] }],
    ['todo', { todoEntityId: 'todo.shopping' }],
    ['room', { areaId: 'sala', areaName: 'Sala', entityIds: ['light.sala'], roomMembershipSource: 'area', areaIcon: 'mdi:sofa' }],
  ] as const)('applica %s senza mutare sorgente, impostazioni estranee o disposizione', (kind, patch) => {
    const id = `${kind}.preset_new`, key = `home::${id}`;
    const original = stateOf({ cardSettings: { [key]: { categoryWidgetType: kind, appearanceFrame: false },
      'home::other': { subtitle: 'Intatto', entityIds: ['sensor.other'] } },
      customNames: { other: 'Altro' }, customIcons: { other: 'sensor' } });
    const before = structuredClone(original); const result = applyUtilityBinding(original, key, { ...patch }, 100);
    expect(original).toEqual(before);
    expect(result.cardSettings[key]).toMatchObject({ categoryWidgetType: kind, appearanceFrame: false, ...patch });
    expect(result.cardSettings['home::other']).toEqual(before.cardSettings['home::other']);
    expect(result.layout).toBe(original.layout); expect(result.pagesConfig).toBe(original.pagesConfig);
    expect(result.customNames).toEqual(original.customNames); expect(result.customIcons).toEqual(original.customIcons);
    expect(result.memory.touched[id]).toBeUndefined();
  });
  it('ritrova nome e preferenze del calendario ricordato senza sostituire le nuove fonti ordinate', () => {
    const id = 'calendar.preset_new', key = `home::${id}`, memory = emptyWidgetMemory();
    memory.entries[memoryKey('calendar', 'calendar.family')] = { type: 'calendar', deviceKey: 'calendar.family',
      updatedAt: 5, label: 'Agenda ricordata', name: 'Agenda ricordata', icon: 'calendar', settings: { heading: 'Promemoria', appearanceFrame: false } };
    const original = stateOf({ cardSettings: { [key]: { categoryWidgetType: 'calendar' } }, memory });
    const result = applyUtilityBinding(original, key, { calendars: ['calendar.family', 'calendar.work'] }, 100);
    expect(result.cardSettings[key]).toMatchObject({ calendars: ['calendar.family', 'calendar.work'], heading: 'Promemoria', appearanceFrame: false });
    expect(result.customNames[id]).toBe('Agenda ricordata'); expect(result.customIcons[id]).toBe('calendar');
    expect(result.memory.touched[id]).toBe(100); expect(original.memory.touched[id]).toBeUndefined();
  });
  it('ritrova la configurazione delle attività da un altro widget della medesima lista', () => {
    const id = 'todo.preset_new', key = `home::${id}`;
    const original = stateOf({ cardSettings: { [key]: { categoryWidgetType: 'todo' },
      'other::todo_card_old': { todoEntityId: 'todo.shopping', heading: 'Le mie attività' } },
      customNames: { todo_card_old: 'Lista precedente' }, memory: { entries: {}, touched: { todo_card_old: 20 } } });
    const result = applyUtilityBinding(original, key, { todoEntityId: 'todo.shopping' }, 100);
    expect(result.cardSettings[key]).toMatchObject({ todoEntityId: 'todo.shopping', heading: 'Le mie attività' });
    expect(result.customNames[id]).toBe('Lista precedente'); expect(result.memory.touched[id]).toBe(100);
    expect(original.customNames[id]).toBeUndefined();
  });
  it('marker e dati di provenienza della stanza restano strutturali e non entrano nella memoria', () => {
    const settings = { categoryWidgetType: 'room', areaId: 'sala', areaName: 'Sala', entityIds: ['light.sala'],
      roomMembershipSource: 'area', areaIcon: 'mdi:sofa', showTemp: false };
    expect(configOf('room', settings)).toEqual({ showTemp: false });
    const captured = captureWidget({ widgetId: 'room.preset_a', settings, name: 'Sala', updatedAt: 1 });
    expect(captured?.settings).toEqual({ showTemp: false });
    expect(captured?.deviceKey).toBe('sala');
  });
  it('la scelta area conserva il marker nuovo e non converte un altro widget legacy della stessa stanza', () => {
    const id = 'room.preset_new', key = `home::${id}`;
    const original = stateOf({ cardSettings: { [key]: { categoryWidgetType: 'room', showTemp: true },
      'other::room_card_old': { areaId: 'sala', areaName: 'Sala precedente', entityIds: ['light.old'], showTemp: false } },
      customNames: { room_card_old: 'Stanza precedente' }, memory: { entries: {}, touched: { room_card_old: 10 } } });
    const before = structuredClone(original);
    const result = applyUtilityBinding(original, key, { areaId: 'sala', areaName: 'Sala attuale',
      roomMembershipSource: 'area', areaIcon: 'mdi:sofa', entityIds: ['light.sala'] }, 100);
    expect(result.cardSettings[key]).toMatchObject({ areaId: 'sala', areaName: 'Sala attuale',
      roomMembershipSource: 'area', areaIcon: 'mdi:sofa', entityIds: ['light.sala'], showTemp: false });
    expect(result.cardSettings['other::room_card_old']).toEqual(before.cardSettings['other::room_card_old']);
    expect(original).toEqual(before); expect(result.customNames[id]).toBe('Stanza precedente');
  });
  it('scollega solo la fonte richiesta e conserva preferenze e memoria', () => {
    const key = 'home::todo_card_old', original = stateOf({ cardSettings: { [key]: { todoEntityId: 'todo.shopping', subtitle: 'Mia lista' } },
      customNames: { todo_card_old: 'Attività' } });
    const result = applyUtilityBinding(original, key, { todoEntityId: null }, 100);
    expect(result.cardSettings[key]).toEqual({ todoEntityId: null, subtitle: 'Mia lista' });
    expect(result.customNames).toEqual(original.customNames); expect(result.memory).toEqual(original.memory);
  });
});
