import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CardSettings } from '@/@types/dashboard';
import type { LauncherLayout, WidgetRuntime } from '@/@types/launcher';
import { findWidgetDefinition } from '@/components/widgets/registry';
import { NordpoolWidget } from '@/components/widgets/utilities/energy/NordpoolWidget';
import { BatteryPage } from '@/components/widgets/utilities/fullpage/BatteryPage';
import { RoomsPage } from '@/components/widgets/utilities/fullpage/RoomsPage';
import { PageVisibilityContext } from '@/hooks/launcher/PageVisibilityContext';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { DEFAULT_GRIDS } from '@/utils/launcher/deviceClass';
import { ensureDeviceClass } from '@/utils/launcher/layout';
import { legacyCardCellSize, migrateLegacyLayout } from '@/utils/launcher/migration';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';

/**
 * REP-20261006-001, corsia widget-media-utilita: DES-9 (taglia massima utile e disposizioni già
 * salvate), DES-1 (pagine Batterie e Stanze dentro il guscio del launcher), PERF-2 (Nordpool).
 */

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/**
 * Vitest empties CSS imports and the strict program has no Node types: the CSS is read from disk
 * through a typed dynamic import (same approach as FixSystemIndicator). Vitest runs from the
 * frontend folder.
 */
async function readCss(path: string): Promise<string> {
  const specifier = 'node:fs';
  const fs = (await import(/* @vite-ignore */ specifier)) as {
    readFileSync: (file: string, encoding: 'utf8') => string;
  };
  return fs.readFileSync(path, 'utf8');
}

const sizesOf = (widgetId: string, settings: CardSettings = {}) =>
  findWidgetDefinition(widgetId, settings)?.sizes;
const capped = ['cost_card_1', 'car_card_1', 'room_card_1'];

describe('DES-9: costi, auto e stanza al massimo 2×2, anche nelle disposizioni migrate', () => {
  it('la migrazione dal legacy (colSpan 2 = 4 celle) riduce la larghezza a 2 celle', () => {
    const cardSettings = Object.fromEntries(capped.map((id) => [`home::${id}`, { colSpan: 2 }]));
    for (const id of capped) {
      expect(legacyCardCellSize(id, 'home', cardSettings, DEFAULT_GRIDS.tablet).w).toBe(4);
    }
    const layout = migrateLegacyLayout({
      pagesConfig: { header: [], pages: ['home'], home: capped },
      pageSettings: {},
      cardSettings,
      deviceClass: 'tablet',
      grids: DEFAULT_GRIDS,
      sizesOf: (widgetId) => sizesOf(widgetId),
    });
    const placements = layout.pages[0].placements.tablet ?? {};
    for (const id of capped) {
      expect(placements[id]?.w, id).toBe(2);
      expect(placements[id]?.h, id).toBeLessThanOrEqual(2);
    }
  });

  it('una disposizione già salvata a 4×2 torna a 2×2 al caricamento, senza perdere il widget', () => {
    const stored: LauncherLayout = {
      version: 1,
      cover: { enabled: true },
      pages: [
        {
          id: 'home',
          label: 'Principale',
          kind: 'widgets',
          placements: {
            tablet: {
              cost_card_1: { x: 0, y: 0, w: 4, h: 2 },
              car_card_1: { x: 4, y: 0, w: 4, h: 2 },
              room_card_1: { x: 0, y: 2, w: 4, h: 2 },
            },
          },
        },
      ],
    };
    const layout = ensureDeviceClass(stored, {
      deviceClass: 'tablet',
      grids: DEFAULT_GRIDS,
      sizesOf: (widgetId) => sizesOf(widgetId),
    });
    const placements = layout.pages[0].placements.tablet ?? {};
    for (const id of capped) expect(placements[id], id).toMatchObject({ w: 2, h: 2 });
    expect(layout.pages).toHaveLength(1);
  });
});

function tree(visible: boolean, runtime: WidgetRuntime, node: ReactNode) {
  return (
    <PageVisibilityContext value={visible}>
      <WidgetRuntimeProvider value={runtime}>{node}</WidgetRuntimeProvider>
    </PageVisibilityContext>
  );
}

describe('DES-1: Batterie e Stanze dentro il guscio comune delle pagine speciali', () => {
  it.each([
    ['batterie', BatteryPage],
    ['stanze', RoomsPage],
  ] as const)('%s: nessun titolo h1 proprio (lo dà il guscio del launcher)', (pageId, Page) => {
    const runtime = createFixtureRuntime({
      entities: fixtureEntities([
        fixtureEntity('sensor.porta_battery', '80', { device_class: 'battery' }),
      ]),
    });
    render(
      tree(true, runtime, <Page pageId={pageId} settings={{}} onSaveSetting={() => undefined} />)
    );
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  it('stanza aperta: nome della stanza h2 e gruppi h3 sotto il titolo h1 del guscio', async () => {
    const sendMessagePromise = vi.fn(async (message: { type: string }) => {
      if (message.type === 'config/area_registry/list')
        return [{ area_id: 'cucina', name: 'Cucina' }];
      if (message.type === 'config/entity_registry/list')
        return [{ entity_id: 'light.cucina', area_id: 'cucina' }];
      return [];
    });
    const runtime = createFixtureRuntime({
      conn: { sendMessagePromise } as unknown as WidgetRuntime['conn'],
      entities: fixtureEntities([
        fixtureEntity('light.cucina', 'on', { friendly_name: 'Luce cucina' }),
      ]),
    });
    render(
      tree(
        true,
        runtime,
        <RoomsPage pageId="stanze" settings={{}} onSaveSetting={() => undefined} />
      )
    );
    fireEvent.click(await screen.findByRole('button', { name: /^Cucina:/ }));
    expect(screen.getByRole('heading', { level: 2, name: 'Cucina' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Luci' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  it('il CSS della pagina non aggiunge margini né larghezza massima al guscio', async () => {
    const css = await readCss('src/components/widgets/utilities/utilities.css');
    const block = css.match(/\.utility-page \{([^}]*)\}/)?.[1] ?? '';
    expect(block).not.toBe('');
    expect(block).not.toMatch(/\b(padding|margin|margin-inline|max-width)\b/);
  });
});

describe('PERF-2: Nordpool senza timer fuori pagina', () => {
  it('nascosto non ha timer, visibile segue il quarto d’ora', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 6, 14, 20));
    const today = Array.from({ length: 24 }, (_, hour) => (hour === 14 ? 0.5 : 0.2));
    const runtime = createFixtureRuntime({
      entities: fixtureEntities([
        fixtureEntity('sensor.nordpool', '0.5', { today, tomorrow_valid: false }),
      ]),
    });
    const node = (
      <NordpoolWidget
        id="nordpool_card_1"
        settingsKey="home::nordpool_card_1"
        settings={{ nordpoolId: 'sensor.nordpool' }}
        size={{ w: 2, h: 2 }}
        editMode={false}
      />
    );
    const view = render(tree(false, runtime, node));
    expect(vi.getTimerCount()).toBe(0);
    view.rerender(tree(true, runtime, node));
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    view.rerender(tree(false, runtime, node));
    expect(vi.getTimerCount()).toBe(0);
  });
});
