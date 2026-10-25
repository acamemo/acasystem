import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ADD_WIDGET_TYPES } from '@/templates/sheets/catalog';
import {
  BINDING_KEYS,
  CATEGORY_PAGES,
  categoryPageSeeds,
  categoryDeviceId,
  isCategoryWidgetReady,
} from '@/templates/sheets/categoryPages';
import { CategoryPageSheet } from '@/templates/sheets/CategoryPageSheet';
import { CategoryWidgetContent } from '@/templates/launcher/CategoryWidgetContent';
import { WidgetSettingsSheet } from '@/templates/sheets';
import { WidgetRuntimeProvider, useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime } from '@/utils/fixtures/runtime';
import { findWidgetDefinition } from '@/components/widgets/registry';
import { CategoryBindingSection } from '@/templates/sheets/CategoryBindingSection';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';

// The settings sheet reads the page store; a fixed one is enough to open it from a tile.
vi.mock('@/hooks/context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/context')>()),
  usePages: () => ({
    pagesConfig: { pages: ['pagina'], header: [], pagina: [] },
    customIcons: {} as Record<string, string>,
    saveCustomName: vi.fn(),
    saveCustomIcon: vi.fn(),
    persistCustomIcons: vi.fn(),
    requestWidgetAdoption: vi.fn(),
    rememberRemovedWidget: vi.fn(),
    rememberRemovedPage: vi.fn(),
    widgetMemoryNotice: null,
    savePageSetting: vi.fn(),
    pageSettings: {} as Record<string, Record<string, unknown>>,
  }),
}));

describe('category pages', () => {
  it('offers matching HA devices and saves the stable widget association', () => {
    const save = vi.fn();
    const runtime = createFixtureRuntime({
      entities: fixtureEntities([
        fixtureEntity('light.sala', 'off', { friendly_name: 'Sala' }),
        fixtureEntity('switch.presa', 'off', { friendly_name: 'Presa' }),
      ]),
    });
    render(
      <WidgetRuntimeProvider value={runtime}>
        <CategoryBindingSection settings={{ categoryWidgetType: 'light' }} save={save} />
      </WidgetRuntimeProvider>
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Dispositivo da collegare: Non collegato' })
    );
    expect(screen.queryByRole('button', { name: /Presa/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Sala\s*light.sala/ }));
    expect(save).toHaveBeenCalledWith('bindingEntityId', 'light.sala');
  });
  it('covers the full catalog once, with native definitions and without borrowed device mappings', () => {
    const seeds = CATEGORY_PAGES.flatMap((category) => categoryPageSeeds(category.id, 'pagina'));
    expect(seeds).toHaveLength(ADD_WIDGET_TYPES.length);
    expect(new Set(seeds.map((seed) => seed.id)).size).toBe(seeds.length);
    for (const seed of seeds) {
      expect(findWidgetDefinition(seed.id, seed.settings)).toBeDefined();
      expect(seed.settings).not.toHaveProperty('bindingEntityId');
      expect(seed.id).not.toContain('esempio');
    }
    expect(categoryPageSeeds('non-esiste', 'pagina')).toEqual([]);
    expect(categoryPageSeeds('casa', 'seconda')[0].id).not.toBe(
      categoryPageSeeds('casa', 'prima')[0].id
    );
  });

  it('chooses empty or populated pages explicitly, and cancels without choosing', () => {
    const choose = vi.fn();
    const close = vi.fn();
    render(<CategoryPageSheet open onClose={close} onChoose={choose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Griglia vuota' }));
    expect(choose).toHaveBeenLastCalledWith();
    fireEvent.click(screen.getByRole('button', { name: /Sicurezza/ }));
    expect(choose).toHaveBeenLastCalledWith('sicurezza');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(close).toHaveBeenCalled();
  });

  it('only activates with a real binding and keeps ids stable for layout', () => {
    expect(isCategoryWidgetReady({ categoryWidgetType: 'light' })).toBe(false);
    expect(isCategoryWidgetReady({ categoryWidgetType: 'media', mediaIds: [] })).toBe(false);
    expect(isCategoryWidgetReady({ categoryWidgetType: 'todo', todoEntityId: 'todo.spesa' })).toBe(
      true
    );
    expect(isCategoryWidgetReady({ categoryWidgetType: 'spacer' })).toBe(true);
    expect(categoryDeviceId('light.preset', { bindingEntityId: 'light.sala' })).toBe('light.sala');
  });

  it('blocks commands and connection before binding, then restores the real runtime and device', () => {
    const service = vi.fn();
    const details = vi.fn();
    const configure = vi.fn();
    const runtime = { ...createFixtureRuntime(), callService: service, openDetails: details };
    function Probe({ id }: { id: string }) {
      const data = useWidgetRuntime();
      return (
        <button
          onClick={() => {
            void data.callService('light', 'toggle', { entity_id: id });
            data.openDetails(id);
          }}
          data-device={id}
          data-connection={Boolean(data.conn)}
        >
          Comando
        </button>
      );
    }
    const definition = { ...findWidgetDefinition('light.preset')!, Widget: Probe };
    const props = {
      id: 'light.preset',
      settingsKey: 'pagina::light.preset',
      size: { w: 1, h: 1 },
      editMode: false,
      definition,
      onConfigure: configure,
    };
    const { rerender, container } = render(
      <WidgetRuntimeProvider value={runtime}>
        <CategoryWidgetContent {...props} settings={{ categoryWidgetType: 'light' }} />
      </WidgetRuntimeProvider>
    );
    expect(container.querySelector('.aca-category-widget__content')).toHaveAttribute('inert');
    fireEvent.click(screen.getByRole('button', { name: 'Comando', hidden: true }));
    expect(service).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Collega Luce' }));
    expect(configure).toHaveBeenCalled();
    rerender(
      <WidgetRuntimeProvider value={runtime}>
        <CategoryWidgetContent
          {...props}
          settings={{ categoryWidgetType: 'light', bindingEntityId: 'light.sala' }}
        />
      </WidgetRuntimeProvider>
    );
    expect(container.querySelector('.aca-category-widget__content')).not.toHaveAttribute('inert');
    fireEvent.click(screen.getByRole('button', { name: 'Comando' }));
    expect(service).toHaveBeenCalledWith('light', 'toggle', { entity_id: 'light.sala' });
    expect(details).toHaveBeenCalledWith('light.preset');
  });
  it('shows the not-associated notice, never an endless skeleton, for calendar and to-do', () => {
    const runtime = { ...createFixtureRuntime(), conn: null };
    for (const [id, type] of [
      ['calendar_card_preset', 'calendar'],
      ['todo_card_preset', 'todo'],
    ] as const) {
      const settings = { categoryWidgetType: type };
      const { container, unmount } = render(
        <WidgetRuntimeProvider value={runtime}>
          <CategoryWidgetContent
            id={id}
            settingsKey={`pagina::${id}`}
            size={{ w: 2, h: 2 }}
            editMode={false}
            settings={settings}
            definition={findWidgetDefinition(id, settings)!}
            onConfigure={vi.fn()}
          />
        </WidgetRuntimeProvider>
      );
      expect(container.querySelector('[data-state="missing"]')).not.toBeNull();
      expect(container.querySelector('[data-state="loading"]')).toBeNull();
      unmount();
    }
  });

  it('tells Multimedia and Sonos apart before binding', () => {
    const runtime = createFixtureRuntime();
    for (const [id, type, label] of [
      ['media_group_preset', 'media', 'Multimedia'],
      ['sonos_group_preset', 'sonos', 'Sonos'],
    ] as const) {
      const settings = { categoryWidgetType: type };
      const { unmount } = render(
        <WidgetRuntimeProvider value={runtime}>
          <CategoryWidgetContent
            id={id}
            settingsKey={`pagina::${id}`}
            size={{ w: 2, h: 2 }}
            editMode={false}
            settings={settings}
            definition={findWidgetDefinition(id, settings)!}
            onConfigure={vi.fn()}
          />
        </WidgetRuntimeProvider>
      );
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
      unmount();
    }
  });

  it('keeps the definition label for an unbound type that does not share a definition', () => {
    const settings = { categoryWidgetType: 'light' };
    const definition = findWidgetDefinition('light_preset', settings)!;
    render(
      <WidgetRuntimeProvider value={createFixtureRuntime()}>
        <CategoryWidgetContent
          id="light_preset"
          settingsKey="pagina::light_preset"
          size={{ w: 2, h: 2 }}
          editMode={false}
          settings={settings}
          definition={definition}
          onConfigure={vi.fn()}
        />
      </WidgetRuntimeProvider>
    );
    expect(screen.queryByText('Luci')).toBeNull();
  });

  describe('not associated tile (REP-20261020-001: the whole widget, off, with a small label)', () => {
    const BIND_HINT = 'Questo widget non è ancora collegato a un dispositivo.';
    function renderUnbound(
      type: string,
      id: string,
      size: { w: number; h: number },
      editMode = false,
      onConfigure = vi.fn(),
      runtime = createFixtureRuntime()
    ) {
      const settings = { categoryWidgetType: type };
      const view = render(
        <WidgetRuntimeProvider value={runtime}>
          <CategoryWidgetContent
            id={id}
            settingsKey={`pagina::${id}`}
            size={size}
            editMode={editMode}
            settings={settings}
            definition={findWidgetDefinition(id, settings)!}
            onConfigure={onConfigure}
          />
        </WidgetRuntimeProvider>
      );
      return { ...view, onConfigure };
    }
    const unboundSeeds = () =>
      CATEGORY_PAGES.flatMap((category) => categoryPageSeeds(category.id, 'p')).filter(
        (seed) =>
          String(seed.settings.categoryWidgetType) in BINDING_KEYS &&
          !['calendar', 'todo'].includes(String(seed.settings.categoryWidgetType))
      );
    /** The name the tile shows: the definition's label, but the catalog's for Multimedia and Sonos. */
    const typeLabel = (seed: { id: string; settings: Record<string, unknown> }) => {
      const type = String(seed.settings.categoryWidgetType);
      return type === 'media' || type === 'sonos'
        ? ADD_WIDGET_TYPES.find((item) => item.type === type)!.label
        : findWidgetDefinition(seed.id, seed.settings)!.label;
    };
    /** The controls the user can reach: jsdom does not apply inert, so those of the widget are left out. */
    const reachableButtons = () =>
      screen.queryAllByRole('button').filter((button) => !button.closest('[inert]'));
    async function launcherCss() {
      const specifier = 'node:fs';
      const fs = (await import(/* @vite-ignore */ specifier)) as {
        readFileSync: (path: string, encoding: 'utf8') => string;
      };
      return fs
        .readFileSync('src/templates/launcher/launcher.css', 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '');
    }
    const body = (css: string, selector: string) =>
      [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)]
        .filter((match) => match[1].trim() === selector)
        .map((match) => match[2])
        .join(' ');

    it('draws the whole widget as it is, with no visible «Da collegare» label and one target', () => {
      const { container, onConfigure } = renderUnbound('light', 'light_preset', { w: 2, h: 2 });
      const root = container.querySelector('.aca-category-widget')!;
      expect(root).toHaveAttribute('data-unbound');
      expect(root).not.toHaveAttribute('data-editing');
      const content = container.querySelector('.aca-category-widget__content');
      expect(content).toHaveAttribute('inert');
      // The widget's own words and controls are there, not a dimmed or hidden picture of them.
      expect(content).toHaveTextContent('Luce');
      expect(content).toHaveTextContent('Spento');
      const buttons = reachableButtons();
      expect(buttons).toHaveLength(1);
      expect(buttons[0]).toBe(screen.getByRole('button', { name: 'Collega Luce' }));
      expect(buttons[0]).toHaveAccessibleDescription(BIND_HINT);
      // A transparent target over the tile: no label, no icon, no big button of its own.
      expect(buttons[0]).toHaveClass('aca-category-widget__tap');
      expect(buttons[0]).not.toHaveClass('aca-m');
      expect(buttons[0].textContent).toBe('');
      // ISSUE-105: no chip, no pending class; readers still get the state in words.
      expect(container.querySelector('.aca-category-widget__pending')).toBeNull();
      expect(screen.queryByText('Da collegare')).toBeNull();
      expect(screen.getByText('Luce, non collegato')).toHaveClass('sr-only');
      expect(
        container.querySelector('.aca-category-widget__bind, .aca-category-widget__button')
      ).toBeNull();
      fireEvent.click(buttons[0]);
      expect(onConfigure).toHaveBeenCalledTimes(1);
    });

    it('a tap opens «Collega» at once, but one that only stops the fling of the pager opens nothing (the request of 2026-10-21)', () => {
      const pager = document.body.appendChild(document.createElement('div'));
      pager.className = 'aca-pager';
      pager.getBoundingClientRect = () => ({ width: 100 }) as DOMRect;
      const scrolled = (left: number) =>
        Object.defineProperty(pager, 'scrollLeft', { value: left, configurable: true });
      const onConfigure = vi.fn();
      const settings = { categoryWidgetType: 'light' };
      const { unmount } = render(
        <WidgetRuntimeProvider value={createFixtureRuntime()}>
          <CategoryWidgetContent
            id="light_preset"
            settingsKey="pagina::light_preset"
            size={{ w: 2, h: 2 }}
            editMode={false}
            settings={settings}
            definition={findWidgetDefinition('light_preset', settings)!}
            onConfigure={onConfigure}
          />
        </WidgetRuntimeProvider>,
        { container: pager.appendChild(document.createElement('div')) }
      );
      const target = screen.getByRole('button', { name: 'Collega Luce' });
      // Between two pages: the pager still runs.
      scrolled(40);
      fireEvent.click(target);
      expect(onConfigure).not.toHaveBeenCalled();
      // On a page: the tap acts.
      scrolled(100);
      fireEvent.click(target);
      expect(onConfigure).toHaveBeenCalledTimes(1);
      unmount();
      pager.remove();
    });

    it('is complete for all 19 types: the widget, the label and one target «Collega <type>», in every size', () => {
      const runtime = createFixtureRuntime();
      const seeds = unboundSeeds();
      expect(seeds).toHaveLength(19);
      expect(new Set(seeds.map((seed) => seed.settings.categoryWidgetType)).size).toBe(19);
      for (const seed of seeds) {
        const type = String(seed.settings.categoryWidgetType);
        const label = typeLabel(seed);
        for (const size of [seed.size, { w: 1, h: 1 }, { w: 2, h: 1 }]) {
          const tag = `${type} ${size.w}×${size.h}`;
          const { container, unmount } = renderUnbound(
            type,
            seed.id,
            size,
            false,
            vi.fn(),
            runtime
          );
          const layer = container.querySelector('.aca-category-widget__content')!;
          // Something of the widget is drawn: a control, a track or an icon.
          expect(layer.querySelector('svg, input, [role="meter"]'), tag).not.toBeNull();
          // The fault variant (words and a warning icon) is what «unknown» would draw.
          expect(layer.querySelector('.ctl-unavailable, [data-icon="warning"]'), tag).toBeNull();
          expect(layer.textContent, tag).not.toMatch(
            /Non disponibile|Stato sconosciuto|Sconosciuto|Non trovato|Dispositivo non trovato/
          );
          expect(
            layer.querySelector('[data-state="missing"], [data-state="loading"]'),
            tag
          ).toBeNull();
          // No visible chip; the state is a hidden text for screen readers.
          expect(container.querySelectorAll('.aca-category-widget__pending'), tag).toHaveLength(0);
          expect(container.textContent, tag).not.toContain('Da collegare');
          const unboundText = container.querySelector('[data-category-unbound]');
          expect(unboundText?.textContent, tag).toBe(`${label}, non collegato`);
          expect(unboundText?.closest('[inert]'), tag).toBeNull();
          // One target, named after the type, described by the hint; nothing else can be tapped.
          const buttons = reachableButtons();
          expect(buttons, tag).toHaveLength(1);
          expect(buttons[0].getAttribute('aria-label'), tag).toBe(`Collega ${label}`);
          expect(buttons[0], tag).toHaveAccessibleDescription(BIND_HINT);
          unmount();
        }
      }
    });

    it('names the type as the widget does, and tells Multimedia and Sonos apart', () => {
      const runtime = createFixtureRuntime();
      let named = 0;
      for (const seed of unboundSeeds()) {
        const type = String(seed.settings.categoryWidgetType);
        const label = typeLabel(seed);
        const { container, unmount } = renderUnbound(
          type,
          seed.id,
          seed.size,
          false,
          vi.fn(),
          runtime
        );
        // The placeholder device is called as the type, so the widget prints that name (a few draw none).
        if (container.querySelector('.aca-category-widget__content')!.textContent!.includes(label))
          named += 1;
        expect(screen.getByRole('button', { name: `Collega ${label}` }), type).toBeInTheDocument();
        unmount();
      }
      expect(named).toBeGreaterThanOrEqual(14);
    });

    it('reports a device that is off where that makes sense, and a dash where nothing can be said', () => {
      const OFF = ['light', 'fan', 'climate', 'androidtv', 'appletv', 'media', 'sonos'];
      const IDLE = ['vacuum', 'mower'];
      // None of these is news about a device that is not there; the safety types never get one.
      const NEVER =
        /^(on|locked|unlocked|open|closed|opening|closing|jammed|disarmed|armed_.*|arming|pending|triggered|playing|paused|cleaning|mowing|docked|charging|heat|cool|unknown|unavailable|streaming|recording)$/;
      for (const seed of unboundSeeds()) {
        const type = String(seed.settings.categoryWidgetType);
        let seen: { state: string; attributes: Record<string, unknown> } | undefined;
        let connection: unknown = 'unset';
        let imageUrl: string | null = 'unset';
        function Probe({ id }: { id: string }) {
          const data = useWidgetRuntime();
          seen = data.entities[id] as typeof seen;
          connection = data.conn;
          imageUrl = data.getEntityImageUrl('/api/camera_proxy/preset.camera');
          return null;
        }
        const settings = seed.settings;
        const definition = { ...findWidgetDefinition(seed.id, settings)!, Widget: Probe };
        const { unmount } = render(
          <WidgetRuntimeProvider value={createFixtureRuntime()}>
            <CategoryWidgetContent
              id={seed.id}
              settingsKey={`pagina::${seed.id}`}
              size={seed.size}
              editMode={false}
              settings={settings}
              definition={definition}
              onConfigure={vi.fn()}
            />
          </WidgetRuntimeProvider>
        );
        const expected = OFF.includes(type) ? 'off' : IDLE.includes(type) ? 'idle' : '–';
        expect(seen?.state, type).toBe(expected);
        expect(seen?.state, type).not.toMatch(NEVER);
        expect(seen?.attributes.friendly_name, type).toBeTruthy();
        expect(connection, type).toBeNull();
        // No address to load from: a camera would otherwise reload its snapshot every few seconds.
        expect(imageUrl, type).toBeNull();
        unmount();
      }
    });

    it('says nothing false about a lock, an alarm or a camera: no open, closed, armed, off or image', () => {
      const FALSE_SAFETY =
        /Apert|Chius|Bloccat|Sbloccat|Inserit|Disinserit|Arma|Disattiv|Attivat|Disarm|In attesa|Scattat|Non disponibile|Sconosciut/i;
      for (const [type, id, size] of [
        ['lock', 'lock_card_preset', { w: 2, h: 2 }],
        ['lock', 'lock_card_preset', { w: 2, h: 1 }],
        ['alarm', 'alarm_card_preset', { w: 2, h: 2 }],
        ['alarm', 'alarm_card_preset', { w: 2, h: 1 }],
        ['camera', 'camera_card_preset', { w: 2, h: 2 }],
        ['camera', 'camera_card_preset', { w: 4, h: 4 }],
      ] as const) {
        const tag = `${type} ${size.w}×${size.h}`;
        const { container, unmount } = renderUnbound(type, id, size);
        const layer = container.querySelector('.aca-category-widget__content')!;
        // The alarm's arm and disarm keys follow its state and are not drawn (launcher.css).
        const words = [...layer.querySelectorAll('*')]
          .filter((element) => !element.closest('.home-quick'))
          .flatMap((element) =>
            [...element.childNodes]
              .filter((node) => node.nodeType === Node.TEXT_NODE)
              .map((node) => node.textContent ?? '')
          )
          .join(' ');
        expect(words, tag).not.toMatch(FALSE_SAFETY);
        expect(layer.querySelectorAll('img, video, source, iframe, canvas'), tag).toHaveLength(0);
        expect(layer.querySelector('.aca-m--error, [data-widget-error="true"]'), tag).toBeNull();
        // The lock's state icon is the neutral key, not a closed or an open padlock.
        const badge = [...layer.querySelectorAll('.ctl-badge-icon [data-icon]')].map((icon) =>
          icon.getAttribute('data-icon')
        );
        if (type === 'lock') expect(badge, tag).toEqual(['key']);
        unmount();
      }
    });

    it('draws no state glyph and no single key for a lock or an alarm that is not associated', async () => {
      // The alarm's glyph is a shield with a tick (armed) for any state it does not know, and the
      // lock's one-key set offers «Sblocca» (what a closed lock offers): neither may be drawn.
      // The rules of launcher.css that hide them are applied to the markup, as jsdom resolves them.
      const css = await launcherCss();
      const style = document.createElement('style');
      style.textContent = [...css.matchAll(/([^{}]*data-category-type='[^{}]*)\{([^}]*)\}/g)]
        .map((match) => `${match[1].replace(/\/\*[\s\S]*?\*\//g, '')}{${match[2]}}`)
        .join(' ');
      document.head.append(style);
      const visible = (element: Element) =>
        [
          element,
          ...Array.from(document.querySelectorAll('*')).filter((node) => node.contains(element)),
        ].every((node) => getComputedStyle(node).display !== 'none');
      try {
        for (const size of [
          { w: 2, h: 2 },
          { w: 2, h: 1 },
          { w: 1, h: 1 },
          { w: 1, h: 2 },
        ]) {
          const tag = `${size.w}×${size.h}`;
          const alarm = renderUnbound('alarm', 'alarm_card_preset', size);
          const glyphs = [
            ...alarm.container.querySelectorAll('.aca-category-widget__content svg'),
          ].filter(visible);
          // Whatever the state glyph is called (a shield, a warning), none is drawn.
          expect(
            glyphs.map((glyph) => glyph.getAttribute('data-icon')),
            `alarm ${tag}`
          ).toEqual([]);
          expect(
            [...alarm.container.querySelectorAll('.home-quick__action')].filter(visible),
            `alarm ${tag} keys`
          ).toHaveLength(0);
          alarm.unmount();
          const lock = renderUnbound('lock', 'lock_card_preset', size);
          const keys = [...lock.container.querySelectorAll('.ctl-stepper button')].filter(visible);
          // Either both keys (the sets that say nothing about the state) or none: never one.
          expect(keys.length, `lock ${tag} keys`).not.toBe(1);
          expect(
            [...lock.container.querySelectorAll('.ctl-badge-icon [data-icon]')].map((icon) =>
              icon.getAttribute('data-icon')
            ),
            `lock ${tag} glyph`
          ).toEqual(['key']);
          lock.unmount();
        }
      } finally {
        style.remove();
      }
    });

    it('keeps a one-cell lock recognisable, and says no «preview» for a camera with no picture', async () => {
      // The lock's own CSS hides its name on one row for the key (hidden here): the name stays.
      // A camera with no picture would say «Anteprima». The rules of launcher.css are applied as
      // jsdom resolves them.
      const css = await launcherCss();
      expect(
        body(
          css,
          ".aca-category-widget[data-category-type='lock'] .ctl-widget--compact.ctl-lock .ctl-name"
        )
      ).toMatch(/display:\s*-webkit-box;/);
      const style = document.createElement('style');
      style.textContent = [...css.matchAll(/([^{}]*data-category-type='[^{}]*)\{([^}]*)\}/g)]
        .map((match) => `${match[1]}{${match[2]}}`)
        .join(' ');
      document.head.append(style);
      const visible = (element: Element) =>
        [
          element,
          ...Array.from(document.querySelectorAll('*')).filter((node) => node.contains(element)),
        ].every((node) => getComputedStyle(node).display !== 'none');
      const seedOf = (type: string) =>
        unboundSeeds().find((seed) => seed.settings.categoryWidgetType === type)!;
      try {
        for (const size of [
          { w: 2, h: 2 },
          { w: 2, h: 1 },
          { w: 1, h: 1 },
          { w: 1, h: 2 },
        ]) {
          const tag = `${size.w}×${size.h}`;
          const lock = renderUnbound('lock', seedOf('lock').id, size);
          const names = [...lock.container.querySelectorAll('.ctl-name')].filter(visible);
          expect(
            names.map((name) => name.textContent),
            `lock ${tag} name`
          ).toEqual(['Serratura']);
          lock.unmount();
          const camera = renderUnbound('camera', seedOf('camera').id, size);
          expect(
            [...camera.container.querySelectorAll('.aca-media-open > .aca-type--caption')].filter(
              visible
            ),
            `camera ${tag} caption`
          ).toHaveLength(0);
          camera.unmount();
        }
      } finally {
        style.remove();
      }
    });

    it('draws no red and no fault wording for any type, and keeps the colours of the kit', async () => {
      const css = await launcherCss();
      // The widget is not dimmed or hidden word by word: no rule of the old dimming is left. Its
      // colours are greys of the kit (the test «greys the tile» below), never a state colour.
      expect(css).not.toMatch(
        /\[data-unbound\][^{}]*\{[^}]*(visibility:\s*hidden|-webkit-text-fill-color)/
      );
      expect(css).not.toMatch(
        /--aca-bind-reserve|data-aca-clear|aca-category-widget__bind|aca-category-widget__button|aca-category-widget__name/
      );
      expect(css).not.toMatch(/\[data-unbound\][^{}]*(will-change|filter)/);
      // The only opacity is the one that cancels the fade of a disabled key: full ink, outside edit mode.
      const opacities = [...css.matchAll(/([^{}]*\[data-unbound\][^{}]*)\{([^}]*opacity[^}]*)\}/g)];
      expect(opacities).toHaveLength(1);
      expect(opacities[0][1]).toContain(':not([data-editing])');
      expect(opacities[0][2]).toMatch(/opacity:\s*1;/);
      expect(css).not.toMatch(/aca-category-widget__pending/);
      for (const seed of unboundSeeds()) {
        const type = String(seed.settings.categoryWidgetType);
        const { container, unmount } = renderUnbound(type, seed.id, seed.size);
        const widget = container.querySelector('.aca-category-widget')!;
        for (const element of widget.querySelectorAll('[style]')) {
          expect(element.getAttribute('style'), type).not.toMatch(/danger/);
        }
        expect(widget.querySelector('.aca-ink--danger, .aca-m--error'), type).toBeNull();
        unmount();
      }
    });

    it('keeps the whole tile as the target, with no label row', async () => {
      const css = await launcherCss();
      const root = body(css, '.aca-category-widget[data-unbound]');
      expect(root).toMatch(/display:\s*flex;/);
      expect(root).toMatch(/flex-direction:\s*column;/);
      const content = body(
        css,
        '.aca-category-widget[data-unbound] > .aca-category-widget__content'
      );
      expect(content).toMatch(/flex:\s*1 1 0;/);
      // The controls of the widget have z-index 1 or 2 of their own: kept under the tap target.
      expect(content).toMatch(/isolation:\s*isolate;/);
      // Calendar and to-do keep the target they had: the box of their own tile.
      const tap = body(css, '.aca-category-widget__tap');
      expect(tap).toMatch(/position:\s*absolute;/);
      expect(tap).toMatch(/inset:\s*0;/);
      expect(tap).toMatch(/border-radius:\s*inherit;/);
      expect(tap).not.toMatch(/z-index/);
      // The unbound tile: over the padding of the frame too, so the whole tile is the target (the face clips what is beyond).
      const unboundTap = body(
        css,
        '.aca-category-widget[data-unbound] > .aca-category-widget__tap'
      );
      expect(unboundTap).toMatch(/inset:\s*calc\(-1 \* var\(--aca-pad, 0px\)\);/);
      expect(unboundTap).toMatch(/z-index:\s*1;/);
    });

    it('draws no label in edit mode either, where the tile is only for selecting and moving', () => {
      for (const size of [
        { w: 2, h: 2 },
        { w: 1, h: 1 },
        { w: 2, h: 1 },
      ]) {
        const { container, unmount } = renderUnbound('light', 'light_preset', size, true);
        // The keys keep the fade every widget has in edit mode (the full ink is for outside it).
        expect(container.querySelector('.aca-category-widget')).toHaveAttribute('data-editing');
        expect(screen.queryByText('Da collegare')).toBeNull();
        expect(container.querySelector('.aca-category-widget__pending')).toBeNull();
        expect(screen.getByText('Luce, non collegato')).toHaveClass('sr-only');
        // No target at all: a tap selects the tile, a long press moves it, as for any widget.
        expect(reachableButtons()).toHaveLength(0);
        expect(container.querySelector('.aca-category-widget__tap')).toBeNull();
        unmount();
      }
    });

    it('sends no service and opens no connection while the tile is not associated', () => {
      const service = vi.fn();
      const runtime = { ...createFixtureRuntime(), callService: service };
      for (const seed of unboundSeeds()) {
        const { container, unmount } = renderUnbound(
          String(seed.settings.categoryWidgetType),
          seed.id,
          seed.size,
          false,
          vi.fn(),
          runtime
        );
        // Nothing under the target can be activated; the target only opens settings.
        container
          .querySelectorAll('.aca-category-widget__content button')
          .forEach((control) => fireEvent.click(control));
        unmount();
      }
      expect(service).not.toHaveBeenCalled();
    });

    it('loads nothing from the network for any type while the tile is not associated', () => {
      for (const seed of unboundSeeds()) {
        const type = String(seed.settings.categoryWidgetType);
        for (const size of [seed.size, { w: 2, h: 1 }]) {
          const { container, unmount } = renderUnbound(type, seed.id, size);
          // jsdom loads no images: what matters is that no element is given an address.
          expect(
            container.querySelectorAll('img[src], video[src], source[src], iframe[src]'),
            type
          ).toHaveLength(0);
          unmount();
        }
      }
    });

    it('has no big button, no dimming and no measuring hook any more (ISSUE-062, ISSUE-076)', async () => {
      const specifier = 'node:fs';
      const fs = (await import(/* @vite-ignore */ specifier)) as {
        existsSync: (path: string) => boolean;
        readFileSync: (path: string, encoding: 'utf8') => string;
      };
      // The hook that measured the whole tile on every resize (the 0.9.14 slowdown) is gone.
      expect(fs.existsSync('src/hooks/launcher/useClearPath.ts')).toBe(false);
      const source = fs.readFileSync('src/templates/launcher/CategoryWidgetContent.tsx', 'utf8');
      expect(source).not.toMatch(/useClearPath|ResizeObserver|<Button|data-compact/);
      const css = await launcherCss();
      expect(css).not.toMatch(/\[data-compact\]/);
    });

    it('opens «Impostazioni del widget» from the tile with the focus inside, and Escape closes it', () => {
      const key = 'pagina::light_preset';
      const settings = { categoryWidgetType: 'light' };
      function Harness() {
        const [open, setOpen] = useState(false);
        return (
          <WidgetRuntimeProvider
            value={createFixtureRuntime({ cardSettings: { [key]: settings } })}
          >
            <CategoryWidgetContent
              id="light_preset"
              settingsKey={key}
              size={{ w: 2, h: 2 }}
              editMode={false}
              settings={settings}
              definition={findWidgetDefinition('light_preset', settings)!}
              onConfigure={() => setOpen(true)}
            />
            <WidgetSettingsSheet
              open={open}
              onClose={() => setOpen(false)}
              widgetId="light_preset"
              settingsKey={key}
              pageId="pagina"
            />
          </WidgetRuntimeProvider>
        );
      }
      const { container, unmount } = render(<Harness />);
      const dialog = container.querySelector('dialog')!;
      expect(dialog.hasAttribute('open')).toBe(false);
      // Twice: the key and the dialog's own «cancel» (what the browser fires for Escape).
      for (const close of [
        () => fireEvent.keyDown(document, { key: 'Escape' }),
        () => fireEvent(dialog, new Event('cancel', { cancelable: true })),
      ]) {
        fireEvent.click(screen.getByRole('button', { name: 'Collega Luce' }));
        expect(dialog.hasAttribute('open')).toBe(true);
        expect(screen.getByText('Impostazioni del widget')).toBeInTheDocument();
        // The focus is moved into the sheet (not left on the tile's target behind it).
        expect(dialog.contains(document.activeElement)).toBe(true);
        close();
        expect(dialog.hasAttribute('open')).toBe(false);
      }
      unmount();
    });

    it('leaves calendar and to-do with their own notice, and a tile-wide tap that opens the settings', () => {
      for (const [type, id, name] of [
        ['todo', 'todo_card_preset', 'Collega Attività'],
        ['calendar', 'calendar_card_preset', 'Collega Calendario'],
      ]) {
        const onConfigure = vi.fn();
        const { container, unmount } = renderUnbound(type, id, { w: 2, h: 2 }, false, onConfigure);
        expect(container.querySelector('[data-category-bind]'), type).toBeNull();
        expect(container.querySelector('[data-unbound]'), type).toBeNull();
        expect(container.querySelector('.aca-category-widget__pending'), type).toBeNull();
        expect(container.querySelector('[data-state="missing"]'), type).not.toBeNull();
        // The notice sits under an inert layer, so the tap target is the only way in.
        const tap = screen.getByRole('button', { name });
        expect(tap).toHaveClass('aca-category-widget__tap');
        fireEvent.click(tap);
        expect(onConfigure, type).toHaveBeenCalledTimes(1);
        unmount();
      }
    });

    it('offers no tap target and no label on calendar and to-do in edit mode', () => {
      renderUnbound('todo', 'todo_card_preset', { w: 2, h: 2 }, true);
      expect(screen.queryByRole('button', { name: /Collega/ })).toBeNull();
      expect(screen.queryByText('Da collegare')).toBeNull();
    });

    it('draws the real widget again, with no label or target, once it is associated', () => {
      const settings = { categoryWidgetType: 'light', bindingEntityId: 'light.sala' };
      const { container } = render(
        <WidgetRuntimeProvider value={createFixtureRuntime()}>
          <CategoryWidgetContent
            id="light_preset"
            settingsKey="pagina::light_preset"
            size={{ w: 2, h: 2 }}
            editMode={false}
            settings={settings}
            definition={findWidgetDefinition('light_preset', settings)!}
            onConfigure={vi.fn()}
          />
        </WidgetRuntimeProvider>
      );
      expect(container.querySelector('[data-unbound]')).toBeNull();
      expect(container.querySelector('.aca-category-widget__tap')).toBeNull();
      expect(container.querySelector('.aca-category-widget__content')).not.toHaveAttribute('inert');
      expect(screen.queryByText('Da collegare')).toBeNull();
    });

    it('greys the tile: accents, state colours, fills and inks are greys of the Kit 2, scoped to the unbound tile (REP-20261020-001b)', async () => {
      const css = await launcherCss();
      // The greys are the Kit 2 ink, muted ink, knob, shade and light with their chroma set to zero.
      const greys = body(css, '.aca-category-widget[data-unbound]');
      for (const name of ['ink', 'mid', 'soft', 'shade', 'on'])
        expect(greys, name).toMatch(
          new RegExp(`--aca-g-${name}:\\s*oklch\\(from var\\(--k2-[a-z-]+\\) l 0 h\\);`)
        );
      // The tokens are set on the children of the unbound tile only (never on a bound widget), and
      // whatever they refer to is one of the greys or a shadow/gradient assembled from them.
      const tokens = body(css, '.aca-category-widget[data-unbound] > *');
      const declarations = [...tokens.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)];
      expect(declarations.length).toBeGreaterThan(40);
      const allowed =
        /^--(aca-g-(ink|mid|soft|shade|on)|k2-(none|light|raised|raised-lg|inset|socket-raised|socket-raised-lg|face-in|fill)|aca-(led-off|led-error|led-error-well|face-rest-layers|face-pressed-layers|face-soft-layers))$/;
      for (const [, name, value] of declarations) {
        for (const reference of value.matchAll(/var\((--[a-z0-9-]+)/g))
          expect(reference[1], `${name}: ${value}`).toMatch(allowed);
        // No colour literal: the accent, the red or any hue cannot be written here.
        expect(value, name).not.toMatch(/#[0-9a-f]{3,8}\b|\b(rgba?|hsla?|oklch|oklab|lab|lch)\(/i);
      }
      // The tokens of the accent, of the colours of state and of the ink are all there.
      const names = declarations.map((match) => match[1]);
      for (const name of [
        '--k2-accent',
        '--aca-orange',
        '--aca-blue',
        '--aca-danger',
        '--aca-orange-glow',
        '--aca-blue-glow',
        '--aca-fill',
        '--aca-fill-vertical',
        '--aca-ink',
        '--aca-ink-muted',
        '--aca-ink-solid',
        '--aca-face-orange',
        '--aca-arc-from',
        '--k2-shade',
        '--k2-light',
      ])
        expect(names, name).toContain(name);
      // The ink of the text is grey too (it is inherited as a computed colour from the frame).
      expect(
        body(css, '.aca-category-widget[data-unbound] > .aca-category-widget__content')
      ).toMatch(/color:\s*var\(--aca-g-ink\);/);
    });

    it('overrides every token the themes derive from the accent, the red, the ink or the shade', async () => {
      const specifier = 'node:fs';
      const fs = (await import(/* @vite-ignore */ specifier)) as {
        readFileSync: (path: string, encoding: 'utf8') => string;
      };
      const css = await launcherCss();
      const themes = [
        'src/themes/acasystem/tokens.css',
        'src/themes/kit2/tokens.css',
        'src/themes/kit2/skin.css',
      ]
        .map((path) => fs.readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''))
        .join('\n');
      const declarations = [...themes.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)];
      // Tokens resolve where they are declared (:root): a token that uses another one needs its own
      // override in the tile. The closure of the accent, the red, the ink and the shade.
      const derived = new Set([
        '--k2-accent',
        '--aca-orange',
        '--aca-blue',
        '--aca-danger',
        '--k2-ink',
        '--k2-ink-muted',
        '--k2-knob',
        '--k2-shade',
      ]);
      for (let grew = true; grew;) {
        grew = false;
        for (const [, name, value] of declarations) {
          if (derived.has(name)) continue;
          if ([...value.matchAll(/var\((--[a-z0-9-]+)/g)].some((match) => derived.has(match[1]))) {
            derived.add(name);
            grew = true;
          }
        }
      }
      const overridden = new Set(
        [...body(css, '.aca-category-widget[data-unbound] > *').matchAll(/(--[a-z0-9-]+):/g)].map(
          (match) => match[1]
        )
      );
      // Not drawn by a widget that is off: the glossy orb (the switch when on, the page indicator)
      // and the selection LED of the Metallo kit (the Kit 2 skin sets it to nothing).
      const notDrawn = new Set(['--aca-orb', '--aca-led-selected']);
      expect(derived.size).toBeGreaterThan(30);
      expect([...derived].filter((name) => !overridden.has(name) && !notDrawn.has(name))).toEqual(
        []
      );
    });

    it('draws a TV that is off with «Spento» once and no warning icon (the status cue is not drawn)', async () => {
      // The cue (an info circle, which reads as an error, and «Spento») repeated the app line.
      const css = await launcherCss();
      const style = document.createElement('style');
      style.textContent = [...css.matchAll(/([^{}]*data-category-type='[^{}]*)\{([^}]*)\}/g)]
        .map((match) => `${match[1]}{${match[2]}}`)
        .join(' ');
      document.head.append(style);
      const visible = (element: Element) =>
        [
          element,
          ...Array.from(document.querySelectorAll('*')).filter((node) => node.contains(element)),
        ].every((node) => getComputedStyle(node).display !== 'none');
      try {
        for (const type of ['androidtv', 'appletv'])
          for (const size of [
            { w: 2, h: 2 },
            { w: 2, h: 1 },
            { w: 3, h: 1 },
            { w: 1, h: 1 },
          ]) {
            const tag = `${type} ${size.w}×${size.h}`;
            const view = renderUnbound(type, `${type}_card_preset`, size);
            const content = view.container.querySelector('.aca-category-widget__content')!;
            const states = [...content.querySelectorAll('*')].filter(
              (element) =>
                [...element.childNodes].some(
                  (node) => node.nodeType === 3 && node.textContent?.trim() === 'Spento'
                ) && visible(element)
            );
            expect(states, `${tag} «Spento»`).toHaveLength(1);
            expect(
              [...content.querySelectorAll('svg[data-icon]')]
                .filter(visible)
                .map((icon) => icon.getAttribute('data-icon'))
                .filter((name) => /info|alert|warn|error|exclam/i.test(name ?? '')),
              `${tag} warning icon`
            ).toEqual([]);
            view.unmount();
          }
      } finally {
        style.remove();
      }
    });

    it('has a rule per type only where an unknown state would say something (alarm, lock, room, camera, TV)', async () => {
      const css = await launcherCss();
      const rules = [...css.matchAll(/([^{}]*data-category-type[^{}]*)\{([^}]*)\}/g)].map(
        (match) => [match[1].replace(/\/\*[\s\S]*?\*\//g, '').trim(), match[2]] as const
      );
      // Every rule hides something (but the lock's name, which it keeps): no recolouring, no other look per type.
      for (const [selector, declarations] of rules) {
        if (selector.includes('row--between')) {
          expect(declarations, selector).toMatch(/margin-inline-start:\s*auto;/);
        } else if (selector.includes('.ctl-name')) {
          // The lock's name is the one thing a rule puts back (see the test above).
          expect(declarations, selector).toMatch(/display:\s*-webkit-box;/);
        } else expect(declarations, selector).toMatch(/display:\s*none;/);
      }
      const selectors = rules.map(([selector]) => selector).join(' ');
      for (const part of [
        "[data-category-type='alarm'] .home-quick",
        "[data-category-type='alarm'] .home-row > :first-child",
        "[data-category-type='lock'] .ctl-stepper:not([role='group'])",
        "[data-category-type='room'] .utility-stack > .aca-type--caption",
        "[data-category-type='camera'] .aca-media-open > .aca-type--caption",
        "[data-category-type='androidtv'] .aca-icon-text",
        "[data-category-type='appletv'] .aca-icon-text",
        "[data-category-type='appletv'] .aca-media-row--between > :last-child",
      ])
        expect(selectors).toContain(part);
      expect(rules).toHaveLength(8);
    });
  });
});
