/**
 * ADR-0019 on the real way in: AddWidgetSheet on the real page store. A widget removed with its
 * configuration and added again (an entity on another page, a room, a category widget) takes the
 * configuration back; nothing the sheet itself writes counts as an edit.
 */
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Connection } from '@/@types/ha';
import type { LauncherLayout } from '@/@types/launcher';
import { PageProvider, usePages } from '@/hooks/context/PageContext';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { AddWidgetSheet } from '@/templates/sheets';
import { WIDGET_MEMORY_STORAGE_KEY, type WidgetMemory } from '@/utils/launcher/deviceMemory';
import { LAUNCHER_LAYOUT_STORAGE_KEY } from '@/utils/launcher/storage';

vi.mock('@/api/haClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/haClient')>()),
  getAreas: vi.fn(async () => [{ area_id: 'cucina', name: 'Cucina', icon: null }]),
  getEntitiesForArea: vi.fn(async () => ['light.cucina']),
}));

const entities = fixtureEntities([
  fixtureEntity('light.cucina', 'on', { friendly_name: 'Luce cucina' }),
  fixtureEntity('media_player.salotto', 'playing', { friendly_name: 'Salotto' }),
]);

const rect = { x: 0, y: 0, w: 2, h: 2 };
const layoutWith = (pages: Record<string, string[]>) =>
  ({
    version: 1,
    categoryDefaultsVersion: 1,
    cover: { enabled: false },
    pages: Object.entries(pages).map(([id, widgets]) => ({
      id,
      label: id,
      kind: 'widgets',
      placements: { tablet: Object.fromEntries(widgets.map((widget) => [widget, rect])) },
    })),
  }) as LauncherLayout;

type Pages = ReturnType<typeof usePages>;
const probe: { pages: Pages | null } = { pages: null };

function Probe() {
  probe.pages = usePages();
  return null;
}

const wrap = (node: ReactNode) => (
  <PageProvider>
    <WidgetRuntimeProvider
      value={createFixtureRuntime({ entities, conn: {} as unknown as Connection })}
    >
      <Probe />
      {node}
    </WidgetRuntimeProvider>
  </PageProvider>
);

const pages = (): Pages => probe.pages!;

const chooseType = (type: string) =>
  fireEvent.click(document.querySelector<HTMLElement>(`[data-widget-type="${type}"]`)!);

/** The memory as stored (the page store keeps it in the browser storage). */
const memory = () =>
  JSON.parse(localStorage.getItem(WIDGET_MEMORY_STORAGE_KEY) ?? 'null') as WidgetMemory;

/** The configuration of a widget on `from`, removed the way the launcher does it. */
function removeWidget(from: string, widgetId: string, label: string | null = null) {
  act(() => pages().rememberRemovedWidget(from, widgetId, label));
  act(() => pages().persistLauncherLayout(layoutWith({ home: [], altra: [] })));
}

beforeEach(() => {
  localStorage.clear();
  probe.pages = null;
  localStorage.setItem(
    LAUNCHER_LAYOUT_STORAGE_KEY,
    JSON.stringify(layoutWith({ home: [], altra: [] }))
  );
  localStorage.setItem(
    'tunet_pages_config',
    JSON.stringify({ header: [], pages: ['home', 'altra'], home: [], altra: [] })
  );
});

afterEach(() => cleanup());

describe('AddWidgetSheet takes the configuration back', () => {
  it('an entity edited, removed and added again on another page', async () => {
    localStorage.setItem(
      LAUNCHER_LAYOUT_STORAGE_KEY,
      JSON.stringify(layoutWith({ home: ['light.cucina'], altra: [] }))
    );
    localStorage.setItem(
      'tunet_pages_config',
      JSON.stringify({ header: [], pages: ['home', 'altra'], home: ['light.cucina'], altra: [] })
    );
    localStorage.setItem(
      'tunet_card_settings',
      JSON.stringify({ 'home::light.cucina': { bindingEntityId: 'light.cucina' } })
    );
    const onAdded = vi.fn();
    const { rerender } = render(wrap(null));

    // edited (name and heading mark the widget as edited), then removed
    act(() => pages().saveCardSetting('home::light.cucina', 'heading', 'Cucina grande'));
    act(() => pages().saveCustomName('light.cucina', 'Luce del tavolo'));
    expect(memory().touched['light.cucina']).toBeGreaterThan(0);
    removeWidget('home', 'light.cucina', 'Luce del tavolo');
    // the removal left its edit time with the entry: the id is free for a new widget
    expect(memory().touched).not.toHaveProperty('light.cucina');

    rerender(wrap(<AddWidgetSheet open onClose={vi.fn()} pageId="altra" onAdded={onAdded} />));
    chooseType('light');
    fireEvent.click(await screen.findByRole('button', { name: /Luce cucina/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi il widget' }));

    expect(onAdded).toHaveBeenCalledWith('light.cucina');
    await waitFor(() => expect(pages().widgetMemoryNotice).not.toBeNull());
    expect(pages().cardSettings['altra::light.cucina']).toMatchObject({ heading: 'Cucina grande' });
    expect(pages().customNames['light.cucina']).toBe('Luce del tavolo');
    expect(pages().widgetMemoryNotice).toMatchObject({ kind: 'memory' });
  });

  it('a room removed and added again keeps its name and its settings, not the defaults', async () => {
    localStorage.setItem(
      LAUNCHER_LAYOUT_STORAGE_KEY,
      JSON.stringify(layoutWith({ home: ['room_card_1'], altra: [] }))
    );
    localStorage.setItem(
      'tunet_card_settings',
      JSON.stringify({
        'home::room_card_1': {
          areaId: 'cucina',
          areaName: 'Cucina',
          showClimate: true,
          showLights: false,
          heading: 'Dove si cucina',
        },
      })
    );
    localStorage.setItem('tunet_custom_names', JSON.stringify({ room_card_1: 'La cucina' }));
    render(wrap(null));
    removeWidget('home', 'room_card_1', 'La cucina');
    expect(Object.keys(memory().entries)).toEqual(['room|cucina']);

    cleanup();
    render(wrap(<AddWidgetSheet open onClose={vi.fn()} pageId="altra" onAdded={vi.fn()} />));
    chooseType('room');
    fireEvent.click(await screen.findByRole('button', { name: /Cucina/ }));
    await screen.findByText(/entità trovat/);
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi la stanza' }));

    await waitFor(() => expect(pages().widgetMemoryNotice).not.toBeNull());
    const [roomKey] = Object.keys(pages().cardSettings).filter((key) =>
      key.startsWith('altra::room_card_')
    );
    expect(pages().cardSettings[roomKey!]).toMatchObject({
      areaId: 'cucina',
      showClimate: true,
      showLights: false,
      heading: 'Dove si cucina',
    });
    const roomId = roomKey!.slice('altra::'.length);
    expect(pages().customNames[roomId]).toBe('La cucina');
  });

  it('a room with nothing kept is born with the name of its area, not edited', async () => {
    render(wrap(<AddWidgetSheet open onClose={vi.fn()} pageId="altra" onAdded={vi.fn()} />));
    chooseType('room');
    fireEvent.click(await screen.findByRole('button', { name: /Cucina/ }));
    await screen.findByText(/entità trovat/);
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi la stanza' }));

    await waitFor(() => expect(Object.values(pages().customNames)).toContain('Cucina'));
    // the name written for the new room is no edit of the user
    expect(memory().touched).toEqual({});
    expect(pages().widgetMemoryNotice).toBeNull();
  });

  it('a category widget added for a device it had before takes the configuration back', async () => {
    localStorage.setItem(
      LAUNCHER_LAYOUT_STORAGE_KEY,
      JSON.stringify(layoutWith({ home: ['appletv_card_1'], altra: [] }))
    );
    localStorage.setItem(
      'tunet_card_settings',
      JSON.stringify({
        'home::appletv_card_1': {
          mediaPlayerId: 'media_player.salotto',
          heading: 'Salotto',
          tapAction: 'toggle',
        },
      })
    );
    render(wrap(null));
    removeWidget('home', 'appletv_card_1', 'TV');

    cleanup();
    render(wrap(<AddWidgetSheet open onClose={vi.fn()} pageId="altra" onAdded={vi.fn()} />));
    chooseType('appletv');
    fireEvent.click(await screen.findByRole('button', { name: /Salotto/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi il widget' }));

    await waitFor(() => expect(pages().widgetMemoryNotice).not.toBeNull());
    const [key] = Object.keys(pages().cardSettings).filter((item) =>
      item.startsWith('altra::appletv_card_')
    );
    expect(pages().cardSettings[key!]).toMatchObject({
      mediaPlayerId: 'media_player.salotto',
      heading: 'Salotto',
      tapAction: 'toggle',
    });
  });
});
