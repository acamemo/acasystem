/**
 * «Dispositivi trovati» inside the launcher (REP-20261028-003): it opens by itself at the first
 * opening only, the widget «Trova dispositivi» brings it back, and a widget made by itself lands
 * on the current page at the first free place while the screen stays open. Real launcher, real
 * widget registry, the fake device facade and a fake Home Assistant.
 */
import { useMemo } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  headers: vi.fn(() => Promise.resolve({ Authorization: 'Bearer test' })),
  method: vi.fn(() => 'oauth'),
  unauthorized: vi.fn((message: string) => Object.assign(new Error(message), { status: 401 })),
}));

vi.mock('@/api/apiAuth', () => ({
  getValidatedHomeAssistantRequestHeadersAsync: auth.headers,
  getStoredAuthMethod: auth.method,
  notifyHomeAssistantApiUnauthorized: auth.unauthorized,
}));

import type { LauncherLayout } from '@/@types/launcher';
import { findWidgetDefinition } from '@/components/widgets/registry';
import { PageProvider, usePages } from '@/hooks/context/PageContext';
import { ToastProvider } from '@/hooks/context/ToastContext';
import { DISCOVERY_SEEN_KEY } from '@/hooks/launcher/useDiscoveryScreen';
import {
  useLauncherController,
  type LauncherController,
  type LauncherStore,
} from '@/hooks/launcher/useLauncherController';
import { LauncherScreen } from '@/templates/launcher/LauncherScreen';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { LAUNCHER_LAYOUT_STORAGE_KEY } from '@/utils/launcher/storage';
import { fakeConnection } from './UtilityHarness';
import { installFakeDevices } from './devicesFakeServer';

const layout: LauncherLayout = {
  version: 1,
  cover: { enabled: false },
  pages: [{ id: 'home', label: 'Casa', kind: 'widgets', placements: { tablet: {} } }],
};

const deviceRegistry = [{ id: 'lampada', name: 'Lampada studio' }, { id: 'relay', name: 'Relè studio' }, { id: 'termostato', name: 'Termostato studio' }, { id: 'veneziana', name: 'Veneziana studio' }, { id: 'ventilatore', name: 'Ventilatore studio' }, { id: 'serratura', name: 'Serratura studio' }, { id: 'allarme', name: 'Allarme studio' }, { id: 'videocamera', name: 'Videocamera studio' }, { id: 'robot', name: 'Aspirapolvere studio' }, { id: 'giardino', name: 'Tagliaerba studio' }];
const entityRegistry = [{ entity_id: 'light.studio', device_id: 'lampada', platform: 'hue' },
  { entity_id: 'switch.studio_a', device_id: 'relay', platform: 'mqtt' },
  { entity_id: 'switch.studio_b', device_id: 'relay', platform: 'mqtt' },
  { entity_id: 'light.studio_led', device_id: 'relay', platform: 'mqtt', entity_category: 'config' },
  { entity_id: 'climate.studio', device_id: 'termostato', platform: 'mqtt' },
  { entity_id: 'cover.studio', device_id: 'veneziana', platform: 'mqtt' },
  { entity_id: 'fan.studio', device_id: 'ventilatore', platform: 'mqtt' },
  { entity_id: 'lock.studio', device_id: 'serratura', platform: 'mqtt' },
  { entity_id: 'alarm_control_panel.studio', device_id: 'allarme', platform: 'mqtt' },
  { entity_id: 'camera.studio', device_id: 'videocamera', platform: 'onvif' },
  { entity_id: 'vacuum.studio', device_id: 'robot', platform: 'mqtt' },
  { entity_id: 'lawn_mower.studio', device_id: 'giardino', platform: 'mqtt' }];
let registryGate: { devices: Promise<typeof deviceRegistry>; entities: Promise<typeof entityRegistry> } | null = null;
const connection = () =>
  fakeConnection({
    'config/device_registry/list': () => registryGate?.devices ?? deviceRegistry,
    'config/entity_registry/list': () => registryGate?.entities ?? entityRegistry,
  });

let latest: LauncherController | null = null;

function Harness({ firstOpen = true }: { firstOpen?: boolean }) {
  const pages = usePages();
  const store = useMemo<LauncherStore>(
    () => ({
      ready: pages.settingsLoaded,
      layout: pages.launcherLayout,
      persistLayout: pages.persistLauncherLayout,
      pagesConfig: pages.pagesConfig,
      pageSettings: pages.pageSettings,
      cardSettings: pages.cardSettings,
      persistPagesConfig: pages.persistConfig,
      persistPageSettings: pages.persistPageSettings,
      persistCardSettings: pages.persistCardSettings,
      commitWidgetAddition: pages.commitWidgetAddition,
    }),
    [pages]
  );
  const controller = useLauncherController({
    store,
    deviceClass: 'tablet',
    resolveSizes: (id, settings) => findWidgetDefinition(id, settings)?.sizes,
  });
  latest = controller;
  const runtime = useMemo(
    () =>
      createFixtureRuntime({
        entities: fixtureEntities([
          fixtureEntity('light.studio', 'off', { friendly_name: 'Lampada studio' }),
          fixtureEntity('switch.studio_a', 'on', { friendly_name: 'Uscita monitor' }),
          fixtureEntity('switch.studio_b', 'unavailable', { friendly_name: 'Uscita caricatore' }),
          fixtureEntity('light.studio_led', 'on', { friendly_name: 'LED di stato', supported_color_modes: ['onoff'] }),
          fixtureEntity('vacuum.studio', 'docked', { friendly_name: 'Aspirapolvere studio', supported_features: 8192 | 4096 | 4 | 8 | 16 }),
          fixtureEntity('lawn_mower.studio', 'docked', { friendly_name: 'Tagliaerba studio', supported_features: 15 }),
          fixtureEntity('camera.studio', 'idle', { friendly_name: 'Videocamera studio', supported_features: 3 }),
          fixtureEntity('alarm_control_panel.studio', 'disarmed', { friendly_name: 'Allarme studio', supported_features: 3, code_format: null, code_arm_required: false }),
          fixtureEntity('lock.studio', 'locked', { friendly_name: 'Serratura studio', supported_features: 1 }),
          fixtureEntity('fan.studio', 'on', { friendly_name: 'Ventilatore studio', supported_features: 49, percentage: 50, percentage_step: 25 }),
          fixtureEntity('cover.studio', 'open', { friendly_name: 'Veneziana studio', supported_features: 255, current_position: 40, current_tilt_position: 30 }),
          fixtureEntity('climate.studio', 'heat', { friendly_name: 'Termostato studio', current_temperature: 21, temperature: 22,
            temperature_unit: '°C', supported_features: 385, hvac_modes: ['off', 'heat'], min_temp: 15, max_temp: 25, target_temp_step: 0.5 }),
        ]),
        conn: connection().conn,
      }),
    []
  );
  return (
    <LauncherScreen
      controller={controller}
      runtime={runtime}
      connection={{ phase: 'connected', label: 'Connesso' }}
      chips={[]}
      onOpenSystem={vi.fn()}
      detailsWidgetId={null}
      onCloseDetails={vi.fn()}
      discoveryOnFirstOpen={firstOpen}
    />
  );
}

async function openLauncher(firstOpen = true) {
  const view = render(
    <ToastProvider>
      <PageProvider>
        <Harness firstOpen={firstOpen} />
      </PageProvider>
    </ToastProvider>
  );
  await waitFor(() => expect(latest?.ready).toBe(true));
  act(() => latest?.goToPageId('home'));
  // Controller readiness precedes the public grid measurement needed by placement.
  await waitFor(() => expect(document.querySelector('[data-launcher-page="home"] .aca-launcher-grid'))
    .toHaveAttribute('data-layout-ready', 'true'));
  return view;
}

const discovery = () => screen.queryByRole('dialog', { name: 'Trova dispositivi' });

beforeEach(() => {
  registryGate = null;
  // The real grid requires a positive physical page; jsdom supplies no layout.
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const measured = this.classList.contains('aca-launcher-page') || this.classList.contains('aca-launcher-grid');
    const width = measured ? 973 : 0;
    const height = measured ? 430 : 0;
    return { x: 0, y: 0, top: 0, left: 0, right: width, bottom: height, width, height, toJSON: () => ({}) };
  });
  localStorage.clear();
  localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  localStorage.setItem('aca_edit_hint_seen', '1');
  latest = null;
  installFakeDevices();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('«Dispositivi trovati» nel launcher', () => {
  it('compare da sola alla prima apertura; «Salta» la chiude e non torna', async () => {
    const view = await openLauncher();
    const dialog = await screen.findByRole('dialog', { name: 'Trova dispositivi' });
    expect(localStorage.getItem(DISCOVERY_SEEN_KEY)).toBeNull();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Chiudi' }));
    await waitFor(() => expect(localStorage.getItem(DISCOVERY_SEEN_KEY)).toBe('1'));
    await waitFor(() => expect(dialog).not.toBeInTheDocument());

    // The next start on this device: nothing by itself.
    view.unmount();
    await openLauncher();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
    expect(discovery()).toBeNull();
  });

  it('il widget «Trova dispositivi» riapre la schermata al tocco, senza aggiungere widget', async () => {
    localStorage.setItem(DISCOVERY_SEEN_KEY, '1');
    localStorage.setItem(
      LAUNCHER_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        ...layout,
        pages: [
          {
            id: 'home',
            label: 'Casa',
            kind: 'widgets',
            placements: { tablet: { rileva_card_1: { x: 0, y: 0, w: 2, h: 2 } } },
          },
        ],
      })
    );
    await openLauncher();
    expect(discovery()).toBeNull();
    fireEvent.click(
      await screen.findByRole('button', { name: /^Trova dispositivi, apri l’elenco/ })
    );

    expect(await screen.findByRole('dialog', { name: 'Trova dispositivi' })).toBeInTheDocument();
    expect(screen.getAllByRole('dialog', { name: 'Trova dispositivi' })).toHaveLength(1);
  });

  it.each([
    ['Lampada studio', 'lampada', 'light.studio', 'light'],
    ['Relè studio', 'relay', 'switch.studio_a', 'plug'],
    ['Termostato studio', 'termostato', 'climate.studio', 'climate'],
    ['Veneziana studio', 'veneziana', 'cover.studio', 'cover'],
    ['Ventilatore studio', 'ventilatore', 'fan.studio', 'fan'],
    ['Serratura studio', 'serratura', 'lock.studio', 'lock'],
    ['Allarme studio', 'allarme', 'alarm_control_panel.studio', 'alarm'],
    ['Videocamera studio', 'videocamera', 'camera.studio', 'camera'],
    ['Aspirapolvere studio', 'robot', 'vacuum.studio', 'vacuum'],
    ['Tagliaerba studio', 'giardino', 'lawn_mower.studio', 'mower'],
  ])('%s passa dalla scoperta alla bozza associata e salva soltanto dopo Conferma', async (name, deviceId, primaryEntityId, family) => {
    // The first opening shows the screen by itself.
    await openLauncher();
    const tool = await screen.findByRole('dialog', { name: 'Trova dispositivi' });

    fireEvent.click(await screen.findByRole('button', { name: /^Pronti/ }));
    fireEvent.click(await screen.findByRole('button', { name: `Crea il widget: ${name}` }));
    // aria-hidden removes the tool from role queries before its exit has completed.
    // Wait for physical removal: only onExited starts placement.
    await waitFor(() => expect(tool).not.toBeInTheDocument());

    const confirm = await screen.findByRole('button', { name: 'Conferma' });
    expect(Object.keys(latest?.layout.pages[0]?.placements.tablet ?? {})).toHaveLength(0);
    expect(discovery()).toBeNull();
    expect(screen.queryByRole('dialog', { name: 'Aggiungi un widget' })).toBeNull();
    await waitFor(() => expect(confirm).toBeEnabled());
    fireEvent.click(confirm);
    await waitFor(() => expect(Object.keys(latest?.layout.pages[0]?.placements.tablet ?? {})).toHaveLength(1));
    const [id] = Object.keys(latest!.layout.pages[0]!.placements.tablet!);
    expect(JSON.parse(localStorage.getItem('tunet_pages_config') ?? '{}').home).toContain(id);
    const settings = JSON.parse(localStorage.getItem('tunet_card_settings') ?? '{}');
    expect(settings[`home::${id}`]?.productDevice).toMatchObject({ deviceId, primaryEntityId, family });
    expect(settings[`home::${id}`]?.categoryWidgetType).toBe(family);
    expect(settings[`home::${id}`]?.[family === 'camera' ? 'cameraId' : family === 'alarm' ? 'alarmId' : family === 'lock' ? 'lockId' : family === 'cover' ? 'coverId' : family === 'climate' ? 'climateId' : 'bindingEntityId']).toBe(primaryEntityId);
  });

  it('chiudere Trova durante la lettura del dispositivo invalida il risultato tardivo', async () => {
    await openLauncher();
    const dialog = await screen.findByRole('dialog', { name: 'Trova dispositivi' });
    fireEvent.click(await screen.findByRole('button', { name: /^Pronti/ }));
    const keys = [LAUNCHER_LAYOUT_STORAGE_KEY, 'tunet_pages_config', 'tunet_card_settings'];
    const before = keys.map(key => localStorage.getItem(key));
    let resolveDevices!: (value: typeof deviceRegistry) => void;
    let resolveEntities!: (value: typeof entityRegistry) => void;
    registryGate = {
      devices: new Promise(resolve => { resolveDevices = resolve; }),
      entities: new Promise(resolve => { resolveEntities = resolve; }),
    };
    fireEvent.click(screen.getByRole('button', { name: 'Crea il widget: Lampada studio' }));
    expect(screen.getByRole('button', { name: 'Crea il widget: Lampada studio' })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Chiudi' }));
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    await act(async () => { resolveDevices(deviceRegistry); resolveEntities(entityRegistry); await Promise.all([registryGate!.devices, registryGate!.entities]); });
    expect(screen.queryByRole('button', { name: 'Conferma' })).toBeNull();
    expect(document.querySelector('[data-pending-widget-preview]')).toBeNull();
    expect(keys.map(key => localStorage.getItem(key))).toEqual(before);
    await waitFor(() => expect(document.querySelector('[data-launcher-page="home"] .aca-launcher-grid')?.closest('[inert]')).toBeNull());
  });
});
