import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect, useState, type ReactNode } from 'react';
import type { CardSettingsMap, PagesConfig } from '@/@types/dashboard';
import type { WidgetRuntime } from '@/@types/launcher';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { iconNames, isIconName } from '@/components/primitives';
import { AddWidgetSheet, WidgetSettingsSheet } from '@/templates/sheets';
import { ADD_WIDGET_TYPES, typeVisuals } from '@/templates/sheets/catalog';
import {
  FALLBACK_ICON,
  iconLabel,
  kitIcon,
  matchIcons,
  pickerIcons,
  shownIcon,
} from '@/templates/sheets/parts/iconChoices';
import { emptyWidgetMemory, WIDGET_MEMORY_STORAGE_KEY, type WidgetState } from '@/utils/launcher/deviceMemory';
import { fakeConnection } from './ComfortHarness';

const state = vi.hoisted(() => ({
  pages: {} as Record<string, unknown>,
}));

vi.mock('@/hooks/context', () => ({ usePages: () => state.pages }));

// Deterministic definitions: only climate has one, with three sizes.
vi.mock('@/components/widgets/registry', () => {
  const climate = {
    type: 'climate',
    label: 'Clima',
    icon: 'activity',
    sizes: { min: { w: 1, h: 1 }, default: { w: 2, h: 2 }, max: { w: 4, h: 2 } },
    matches: (id: string) => id.startsWith('climate_card_'),
    Widget: () => null,
  };
  return {
    widgetDefinitions: [climate],
    pageKindDefinitions: [],
    findWidgetDefinition: (id: string) => (climate.matches(id) ? climate : undefined),
    findPageKindDefinition: () => undefined,
  };
});

const entities = fixtureEntities([
  fixtureEntity('light.cucina', 'on', { friendly_name: 'Luce cucina' }),
  fixtureEntity('light.sala', 'off', { friendly_name: 'Luce sala' }),
  fixtureEntity('climate.soggiorno', 'heat', {
    friendly_name: 'Termostato soggiorno',
    hvac_modes: ['off', 'heat', 'cool'],
  }),
  fixtureEntity('media_player.salotto', 'playing', { friendly_name: 'Salotto' }),
  fixtureEntity('media_player.sonos', 'idle', {
    friendly_name: 'Sonos studio',
    manufacturer: 'Sonos',
  }),
  fixtureEntity('todo.ufficio', '0', { friendly_name: 'Attività ufficio' }),
  fixtureEntity('calendar.ufficio', 'off', { friendly_name: 'Calendario ufficio' }),
  fixtureEntity('input_select.lavaggio', 'Basso', {
    friendly_name: 'Lavaggio',
    options: ['Basso', 'Alto'],
  }),
  fixtureEntity('number.lavaggio', '1', { friendly_name: 'Lavaggio numerico' }),
  fixtureEntity('sensor.temperatura', '21', {
    friendly_name: 'Temperatura',
    device_class: 'temperature',
  }),
]);

function makePages(overrides: Record<string, unknown> = {}) {
  const pagesConfig: PagesConfig = { pages: ['home'], header: [], home: ['light.cucina'] };
  const cardSettings: CardSettingsMap = {};
  return {
    pagesConfig,
    persistConfig: vi.fn(),
    cardSettings,
    persistCardSettings: vi.fn(),
    saveCardSetting: vi.fn(),
    savePageSetting: vi.fn(),
    saveCustomName: vi.fn(),
    customIcons: {} as Record<string, string>,
    saveCustomIcon: vi.fn(),
    persistCustomIcons: vi.fn(),
    requestWidgetAdoption: vi.fn(),
    rememberRemovedWidget: vi.fn(),
    rememberRemovedPage: vi.fn(),
    widgetMemoryNotice: null,
    pageSettings: {},
    ...overrides,
  };
}

function withRuntime(node: ReactNode, overrides: Partial<WidgetRuntime> = {}) {
  return (
    <WidgetRuntimeProvider value={createFixtureRuntime({ entities, ...overrides })}>
      {node}
    </WidgetRuntimeProvider>
  );
}

beforeEach(() => {
  const rect = HTMLElement.prototype.getBoundingClientRect;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains('aca-widget-catalog__pages')) return { x: 0, y: 0, top: 0, left: 0, right: 1100, bottom: 600, width: 1100, height: 600, toJSON: () => ({}) };
    if (this.classList.contains('aca-catalog-type__caption') || this.classList.contains('aca-widget-catalog__heading')) {
      const height = this.classList.contains('aca-catalog-type__caption') ? 72 : 28;
      return { x: 0, y: 0, top: 0, left: 0, right: 220, bottom: height, width: 220, height, toJSON: () => ({}) };
    }
    return rect.call(this);
  });
  state.pages = makePages();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.documentElement.style.overflow = '';
});

/** Follow the public horizontal catalog navigation before interacting with a type. */
function catalogButton(name: string) {
  const tile = [...document.querySelectorAll<HTMLButtonElement>('[data-widget-type]')].find((node) =>
    document.getElementById(node.getAttribute('aria-labelledby') ?? '')?.textContent === name);
  if (!tile) throw new Error(`Tipo non trovato: ${name}`);
  const page = Number(tile.closest<HTMLElement>('[data-catalog-page]')?.dataset.catalogPage);
  let current = Number(document.querySelector<HTMLElement>('[data-catalog-page]:not([inert])')?.dataset.catalogPage);
  while (current !== page) {
    fireEvent.keyDown(screen.getByLabelText('Pagine del catalogo'), { key: current < page ? 'ArrowRight' : 'ArrowLeft' });
    current = Number(document.querySelector<HTMLElement>('[data-catalog-page]:not([inert])')?.dataset.catalogPage);
  }
  return screen.getByRole('button', { name });
}

describe('AddWidgetSheet', () => {
  function renderAdd(onAdded = vi.fn(), onClose = vi.fn()) {
    render(withRuntime(<AddWidgetSheet open onClose={onClose} pageId="home" onAdded={onAdded} />));
    return { onAdded, onClose };
  }

  it('è un dialog con titolo, chiusura e la griglia dei tipi', async () => {
    const { onClose } = renderAdd();
    const dialog = screen.getByRole('dialog', { name: 'Aggiungi un widget' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByRole('group', { name: 'Tipi di widget' })).toBeInTheDocument();
    for (const label of ['Luci', 'Clima', 'Stanze', 'Separatore', 'Sensori']) {
      expect(catalogButton(label)).toBeInTheDocument();
    }
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('raggruppa i tipi sotto Dispositivi, Informazioni e Layout, con Trova dispositivi come prima tessera', () => {
    renderAdd();
    const grid = screen.getByRole('group', { name: 'Tipi di widget' });
    const groups = [...new Set(within(grid).getAllByRole('region', { hidden: true }).map((group) => group.getAttribute('aria-label')))];
    expect(groups).toEqual(['Dispositivi', 'Informazioni', 'Layout']);
    const find = within(grid).getByRole('button', { name: 'Trova dispositivi' });
    const devices = within(grid).getByRole('region', { name: 'Dispositivi' });
    expect(within(devices).getAllByRole('button')[0]).toBe(find);
    catalogButton('Meteo di casa');
    const info = within(grid).getByRole('region', { name: 'Informazioni' });
    expect(within(info).getByRole('button', { name: 'Meteo di casa' })).toHaveTextContent(
      'Fonte della casa'
    );
    expect(catalogButton('Meteo')).toHaveTextContent(
      'Da una fonte scelta'
    );
    catalogButton('Separatore');
    const layout = within(grid).getByRole('region', { name: 'Layout' });
    expect(within(layout).getByRole('button', { name: 'Separatore' })).toBeInTheDocument();
  });

  it('consegna tutti i tipi al posizionamento senza aprire associazioni o creare widget', () => {
    const onPlaceType = vi.fn();
    const onAdded = vi.fn();
    const onClose = vi.fn();
    const callService = vi.fn();
    render(withRuntime(<AddWidgetSheet open onClose={onClose} pageId="home" onAdded={onAdded} onPlaceType={onPlaceType} />, { callService }));
    const visuals = typeVisuals();
    for (const item of ADD_WIDGET_TYPES) {
      fireEvent.click(catalogButton(visuals.get(item.type)?.label ?? item.label));
      expect(onPlaceType).toHaveBeenLastCalledWith(item.type);
      expect(screen.getByRole('group', { name: 'Tipi di widget' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Aggiungi.*widget/ })).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Cerca')).not.toBeInTheDocument();
    }
    expect(onPlaceType.mock.calls).toEqual(ADD_WIDGET_TYPES.map((item) => [item.type]));
    expect(onAdded).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(callService).not.toHaveBeenCalled();
    const pages = state.pages as ReturnType<typeof makePages>;
    for (const writer of [pages.persistConfig, pages.persistCardSettings, pages.saveCardSetting, pages.requestWidgetAdoption]) {
      expect(writer).not.toHaveBeenCalled();
    }
  });

  it('crea un widget clima come il legacy e lo passa al launcher alla misura predefinita', () => {
    const { onAdded, onClose } = renderAdd();
    fireEvent.click(catalogButton('Clima'));
    expect(screen.getByRole('heading', { name: 'Clima' })).toHaveFocus();
    const add = screen.getByRole('button', { name: 'Aggiungi il widget' });
    expect(add).toBeDisabled();

    // The size is no longer chosen here: it changes on the grid by dragging (REP-20261007-027).
    expect(screen.queryByRole('radiogroup', { name: 'Dimensione' })).not.toBeInTheDocument();
    expect(screen.getByText(/trascina i lati o gli angoli/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Termostato soggiorno/ }));
    fireEvent.click(add);

    const pages = state.pages as ReturnType<typeof makePages>;
    expect(pages.persistCardSettings).toHaveBeenCalledOnce();
    const [settings] = pages.persistCardSettings.mock.calls[0] as [CardSettingsMap];
    const [key] = Object.keys(settings);
    expect(key).toMatch(/^home::climate_card_\d+_[a-z0-9]+$/);
    expect(settings[key]).toEqual({ climateId: 'climate.soggiorno' });

    const [config] = pages.persistConfig.mock.calls[0] as [PagesConfig];
    const widgetId = key.replace('home::', '');
    expect(config.home).toEqual(['light.cucina', widgetId]);
    expect(onAdded).toHaveBeenCalledWith(widgetId);
    expect(onClose).toHaveBeenCalled();
  });

  it('aggiunge più luci: un widget per entità, con gli id di entità come nel legacy', () => {
    state.pages = makePages({
      pagesConfig: { pages: ['home'], header: [], home: [] },
    });
    const { onAdded } = renderAdd();
    fireEvent.click(catalogButton('Luci'));
    fireEvent.click(screen.getByRole('button', { name: /Luce cucina/ }));
    fireEvent.click(screen.getByRole('button', { name: /Luce sala/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi 2 widget' }));

    const pages = state.pages as ReturnType<typeof makePages>;
    expect(pages.persistConfig).toHaveBeenCalledWith(
      expect.objectContaining({ home: ['light.cucina', 'light.sala'] })
    );
    expect(onAdded.mock.calls).toEqual([['light.cucina'], ['light.sala']]);
  });

  it('nasconde le luci già nella pagina e filtra con la ricerca', () => {
    renderAdd();
    fireEvent.click(catalogButton('Luci'));
    expect(screen.queryByRole('button', { name: /Luce cucina/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Cerca'), { target: { value: 'nessuna' } });
    expect(screen.getByText('Nessun risultato per «nessuna».')).toBeInTheDocument();
  });

  it('dal vassoio apre direttamente i dettagli del tipo trascinato anche col callback catalogo', () => {
    const onPlaceType = vi.fn();
    render(
      withRuntime(
        <AddWidgetSheet
          open
          onClose={vi.fn()}
          pageId="home"
          onAdded={vi.fn()}
          initialType="climate"
          onPlaceType={onPlaceType}
          autoAdd
        />
      )
    );
    expect(screen.getByRole('heading', { name: 'Clima' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Tipi di widget' })).not.toBeInTheDocument();
    expect(onPlaceType).not.toHaveBeenCalled();
  });

  it('dal vassoio aggiunge subito un tipo senza scelte, senza mostrare il pannello', async () => {
    const onAdded = vi.fn();
    render(
      withRuntime(
        <AddWidgetSheet
          open
          onClose={vi.fn()}
          pageId="home"
          onAdded={onAdded}
          initialType="spacer"
          autoAdd
        />
      )
    );
    await waitFor(() => expect(onAdded).toHaveBeenCalledOnce());
    expect(onAdded.mock.calls[0][0]).toMatch(/^spacer_card_\d+$/);
  });

  it('crea un separatore con le impostazioni iniziali del legacy', () => {
    const { onAdded } = renderAdd();
    fireEvent.click(catalogButton('Separatore'));
    fireEvent.click(screen.getByRole('button', { name: 'Spazio' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi il widget' }));

    const pages = state.pages as ReturnType<typeof makePages>;
    const [settings] = pages.persistCardSettings.mock.calls[0] as [CardSettingsMap];
    const [key] = Object.keys(settings);
    expect(key).toMatch(/^home::spacer_card_\d+$/);
    expect(settings[key]).toEqual({
      variant: 'spacer',
      colSpan: 'full',
      heightPx: 40,
      headingAlign: 'center',
    });
    expect(onAdded).toHaveBeenCalledWith(key.replace('home::', ''));
  });

  it('torna ai tipi con Indietro', () => {
    renderAdd();
    fireEvent.click(catalogButton('Meteo'));
    fireEvent.click(screen.getByRole('button', { name: 'Indietro' }));
    expect(screen.getByRole('group', { name: 'Tipi di widget' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Meteo' })).toHaveFocus();
  });
});

describe('WidgetSettingsSheet', () => {
  /** A noLive utility binding commits the whole state, including the existing memory effects. */
  function renderUtilitySettings(widgetId: string, cards: CardSettingsMap, route: 'commit' | 'fallback' = 'commit') {
    const key = `home::${widgetId}`;
    const initial: WidgetState = {
      layout: { version: 1, cover: { enabled: false }, pages: [{
        id: 'home', label: 'Principale', kind: 'widgets', order: [widgetId],
        placements: { tablet: { [widgetId]: { x: 0, y: 0, w: 2, h: 2 } } },
      }] },
      pagesConfig: { pages: ['home'], header: [], home: [widgetId] },
      cardSettings: cards, customNames: {}, customIcons: {}, memory: emptyWidgetMemory(),
    };
    const previousMemory = localStorage.getItem(WIDGET_MEMORY_STORAGE_KEY);
    localStorage.setItem(WIDGET_MEMORY_STORAGE_KEY, JSON.stringify(initial.memory));
    let current = initial;
    let update = (_change: (previous: WidgetState) => WidgetState) => {};
    const legacySave = vi.fn();
    const commit = vi.fn(async (apply: (previous: WidgetState) => WidgetState, _id: string) => {
      await Promise.resolve(); update(apply);
    });
    const setCards = vi.fn((change: CardSettingsMap | ((previous: CardSettingsMap) => CardSettingsMap)) => {
      update((previous) => ({ ...previous, cardSettings: typeof change === 'function' ? change(previous.cardSettings) : change }));
    });
    const { conn } = fakeConnection((message) => {
      if (message.type === 'config/area_registry/list') return [{ area_id: 'ufficio', name: 'Ufficio', icon: 'mdi:desk' }];
      if (message.type === 'config/entity_registry/list') return [
        { entity_id: 'light.cucina', device_id: 'device-ufficio' },
        { entity_id: 'sensor.temperatura', area_id: 'ufficio' },
      ];
      if (message.type === 'config/device_registry/list') return [{ id: 'device-ufficio', area_id: 'ufficio' }];
      return [];
    });
    function UtilityFixture() {
      const [store, setStore] = useState(initial);
      current = store;
      update = (change) => setStore((previous) => {
        const next = change(previous);
        localStorage.setItem(WIDGET_MEMORY_STORAGE_KEY, JSON.stringify(next.memory));
        return next;
      });
      useEffect(() => () => {
        if (previousMemory === null) localStorage.removeItem(WIDGET_MEMORY_STORAGE_KEY);
        else localStorage.setItem(WIDGET_MEMORY_STORAGE_KEY, previousMemory);
      }, []);
      state.pages = makePages({
        launcherLayout: store.layout, pagesConfig: store.pagesConfig, cardSettings: store.cardSettings,
        customNames: store.customNames, customIcons: store.customIcons,
        commitWidgetAddition: route === 'commit' ? commit : undefined,
        setCardSettings: setCards,
        persistCustomNames: (names: Record<string, string>) => update((previous) => ({ ...previous, customNames: names })),
        persistCustomIcons: (icons: Record<string, string>) => update((previous) => ({ ...previous, customIcons: icons })),
        persistWidgetMemory: (memory: WidgetState['memory']) => update((previous) => ({ ...previous, memory })),
      });
      return withRuntime(<WidgetSettingsSheet open onClose={vi.fn()} widgetId={widgetId} settingsKey={key} pageId="home" />,
        { conn, cardSettings: store.cardSettings, customNames: store.customNames, customIcons: store.customIcons, saveCardSetting: legacySave });
    }
    render(<UtilityFixture />);
    return { commit, setCards, legacySave, snapshot: () => current };
  }

  function renderSettings(
    widgetId: string,
    cardSettings: CardSettingsMap,
    saveCardSetting = vi.fn()
  ) {
    render(
      withRuntime(
        <WidgetSettingsSheet
          open
          onClose={vi.fn()}
          widgetId={widgetId}
          settingsKey={`home::${widgetId}`}
          pageId="home"
        />,
        { cardSettings, saveCardSetting, customNames: {} }
      )
    );
    return saveCardSetting;
  }

  it('salva nome, intestazione e visibilità con le chiavi legacy', () => {
    const save = renderSettings('media_group_1', {
      'home::media_group_1': { mediaIds: ['media_player.salotto'] },
    });
    const dialog = screen.getByRole('dialog', { name: 'Impostazioni del widget' });
    expect(dialog).toHaveAccessibleDescription(/Multimedia/);
    const pages = state.pages as ReturnType<typeof makePages>;

    fireEvent.change(screen.getByRole('textbox', { name: 'Nome' }), {
      target: { value: 'Musica' },
    });
    expect(pages.saveCustomName).toHaveBeenCalledWith('media_group_1', 'Musica');

    const heading = screen.getByRole('textbox', { name: 'Intestazione' });
    fireEvent.change(heading, { target: { value: '  Sopra  ' } });
    fireEvent.blur(heading);
    expect(save).toHaveBeenCalledWith('home::media_group_1', 'heading', 'Sopra');

    // A widget cannot be hidden any more (ADR-0019): it is removed, and its device keeps it.
    expect(screen.queryByRole('switch', { name: 'Nascondi il widget' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'A tutto widget' }));
    expect(save).toHaveBeenCalledWith('home::media_group_1', 'artworkMode', 'cover');
  });

  it('a configuration taken from the memory after the link starts the fields again (ADR-0019)', () => {
    const linked = { categoryWidgetType: 'light', bindingEntityId: 'light.cucina' };
    const sheet = (settings: Record<string, unknown>, widgetMemoryNotice: unknown) => {
      state.pages = makePages({ widgetMemoryNotice });
      return withRuntime(
        <WidgetSettingsSheet
          open
          onClose={vi.fn()}
          widgetId="light.preset_a"
          settingsKey="home::light.preset_a"
          pageId="home"
        />,
        { cardSettings: { 'home::light.preset_a': settings }, customNames: {} }
      );
    };
    const view = render(sheet(linked, null));
    expect(screen.getByRole('textbox', { name: 'Intestazione' })).toHaveValue('');
    view.rerender(
      sheet(
        { ...linked, heading: 'Sopra il piano' },
        { seq: 1, kind: 'memory', label: null, deviceKey: 'light.cucina' }
      )
    );
    expect(screen.getByRole('textbox', { name: 'Intestazione' })).toHaveValue('Sopra il piano');
  });

  it.each([
    ['car_card_1', { type: 'car' }, true],
    ['camera_card_1', { cameraId: 'camera.ingresso' }, true],
    ['light.cucina', {}, false],
  ])(
    'the settings of the device say they hold for all its widgets (%s, ADR-0019)',
    (widgetId, settings, scoped) => {
      renderSettings(widgetId, { [`home::${widgetId}`]: settings });
      const note = screen.queryAllByText(widgetId === 'car_card_1'
        ? 'Alcuni collegamenti si applicano anche agli altri widget di questa auto.'
        : 'Vale per tutti i widget di questo dispositivo.');
      expect(note.length > 0).toBe(scoped);
    }
  );

  it('Aspetto: cornice e trasparenza dello sfondo (REP-20261007-036)', () => {
    const save = renderSettings('light.cucina', {});
    fireEvent.click(screen.getByRole('button', { name: 'Media' }));
    expect(save).toHaveBeenCalledWith('home::light.cucina', 'appearanceOpacity', 50);
    fireEvent.click(screen.getByRole('switch', { name: 'Cornice' }));
    expect(save).toHaveBeenCalledWith('home::light.cucina', 'appearanceFrame', false);
  });

  it('attiva la visibilità condizionale con la regola predefinita del legacy', () => {
    const save = renderSettings('light.cucina', {});
    fireEvent.click(screen.getByRole('switch', { name: 'Usa le regole di visibilità' }));
    expect(save).toHaveBeenCalledWith('home::light.cucina', 'visibilityCondition', {
      entityId: null,
      logic: 'AND',
      enabled: true,
      rules: [{ type: 'state', states: ['on'], forSeconds: 0 }],
    });
  });

  it('modifica le regole esistenti: stato, seconda regola e logica', () => {
    const condition = {
      enabled: true,
      logic: 'AND',
      rules: [{ type: 'state', states: ['on'], forSeconds: 0, entityId: 'light.cucina' }],
    };
    const save = renderSettings('light.cucina', {
      'home::light.cucina': { visibilityCondition: condition },
    });
    expect(screen.getByText('Adesso il widget è visibile.')).toBeInTheDocument();

    const field = screen.getByRole('textbox', { name: 'Nuovo stato' });
    fireEvent.change(field, { target: { value: 'playing' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(save).toHaveBeenLastCalledWith('home::light.cucina', 'visibilityCondition', {
      entityId: null,
      logic: 'AND',
      enabled: true,
      rules: [
        { type: 'state', states: ['on', 'playing'], forSeconds: 0, entityId: 'light.cucina' },
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi una seconda regola' }));
    const [, , added] = save.mock.lastCall as [string, string, { rules: unknown[] }];
    expect(added.rules).toHaveLength(2);
  });

  it('clima: azione al tocco e modalità preferite', () => {
    const save = renderSettings('climate_card_1', {
      'home::climate_card_1': { climateId: 'climate.soggiorno' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Accendi o spegni' }));
    expect(save).toHaveBeenCalledWith('home::climate_card_1', 'tapAction', 'toggle');
    expect(screen.getByRole('button', { name: 'Raffrescamento' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Riscaldamento' }));
    expect(save).toHaveBeenCalledWith('home::climate_card_1', 'climateFavoriteModes', ['off']);
  });

  it('Attività: permette di scegliere e rimuovere la lista con la chiave consumata dal widget', async () => {
    const fixture = renderUtilitySettings('todo_card_1', {}, 'fallback');
    expect(screen.queryByText(/non sono ancora modificabili/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lista di attività: Non collegata' }));
    fireEvent.click(screen.getByRole('button', { name: /Attività ufficio/ }));
    await waitFor(() => expect(fixture.snapshot().cardSettings['home::todo_card_1']?.todoEntityId).toBe('todo.ufficio'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Lista di attività: Attività ufficio' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Lista di attività: Attività ufficio' }));
    fireEvent.click(screen.getByRole('button', { name: 'Non collegata' }));
    await waitFor(() => expect(fixture.snapshot().cardSettings['home::todo_card_1']?.todoEntityId).toBeNull());
    expect(fixture.setCards).toHaveBeenCalledTimes(2);
    expect(fixture.commit).not.toHaveBeenCalled();
    expect(fixture.legacySave).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(WIDGET_MEMORY_STORAGE_KEY) ?? 'null')).toEqual(fixture.snapshot().memory);
  });

  it('Calendario: modifica la selezione senza perdere i calendari salvati temporaneamente mancanti', async () => {
    const fixture = renderUtilitySettings('calendar_card_1', {
      'home::calendar_card_1': { calendars: ['calendar.assente'] },
    });
    fireEvent.click(screen.getByRole('button', { name: /Calendario ufficio/ }));
    expect(fixture.commit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Applica i calendari' }));
    await waitFor(() => expect(fixture.snapshot().cardSettings['home::calendar_card_1']?.calendars)
      .toEqual(['calendar.assente', 'calendar.ufficio']));
    expect(fixture.commit).toHaveBeenCalledTimes(1);
    expect(fixture.commit.mock.calls[0]?.[1]).toBe('calendar_card_1');
    expect(fixture.legacySave).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(WIDGET_MEMORY_STORAGE_KEY) ?? 'null')).toEqual(fixture.snapshot().memory);
  });

  it('Stanza: conferma insieme area, appartenenza e memoria mediante il raccordo comune', async () => {
    const fixture = renderUtilitySettings('room_card_1', { 'home::room_card_1': { entityIds: [] } });
    fireEvent.click(await screen.findByRole('button', { name: /^Ufficio/ }));
    expect(fixture.commit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Collega la stanza' }));
    await waitFor(() => expect(fixture.snapshot().cardSettings['home::room_card_1']).toMatchObject({
      areaId: 'ufficio', areaName: 'Ufficio', areaIcon: 'mdi:desk',
      roomMembershipSource: 'area', entityIds: ['light.cucina', 'sensor.temperatura'],
    }));
    expect(fixture.commit).toHaveBeenCalledTimes(1);
    expect(fixture.legacySave).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(WIDGET_MEMORY_STORAGE_KEY) ?? 'null')).toEqual(fixture.snapshot().memory);
  });

  it.each([
    ['cost_card_1', 'Decimali', 'decimals', '3', 3],
    ['weather_temp_1', 'Ore dello storico', 'graphHistoryHours', '24', 24],
    ['camera_card_1', 'Intervallo in secondi', 'cameraRefreshInterval', '1', 2],
  ])(
    '%s: salva numeri utilizzabili dal consumer e limita i valori non validi',
    (id, label, setting, input, expected) => {
      const save = renderSettings(id, {});
      const field = screen.getByRole('spinbutton', { name: label });
      fireEvent.change(field, { target: { value: input } });
      fireEvent.blur(field);
      expect(save).toHaveBeenCalledWith(`home::${id}`, setting, expected);
    }
  );

  it.each([
    ['camera_card_1', 'Su movimento', 'cameraRefreshMode', 'motion'],
    ['spacer_card_1', 'Destra', 'headingAlign', 'right'],
  ])(
    '%s: ripristina la scelta di tipo senza ricreare il widget',
    (id, label, setting, expected) => {
      const save = renderSettings(id, {});
      fireEvent.click(screen.getByRole('button', { name: label }));
      expect(save).toHaveBeenCalledWith(`home::${id}`, setting, expected);
    }
  );

  it('Prezzi: conserva le preferenze storiche senza editor grafico o sostegno inerti', () => {
    const settings = { nordpoolId: 'sensor.nordpool', graphStyle: 'bar', showWithSupport: true };
    const save = renderSettings('nordpool_card_1', { 'home::nordpool_card_1': settings });
    expect(screen.getByRole('spinbutton', { name: 'Decimali' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Barre' })).toBeNull();
    expect(screen.queryByRole('switch', { name: /sostegno/i })).toBeNull();
    expect(save).not.toHaveBeenCalled();
    expect(settings).toEqual({ nordpoolId: 'sensor.nordpool', graphStyle: 'bar', showWithSupport: true });
  });

  it('Android TV: seleziona lettori collegati usando linkedMediaPlayers', () => {
    const save = renderSettings('androidtv_card_1', {});
    fireEvent.click(screen.getByRole('button', { name: /Salotto/ }));
    expect(save).toHaveBeenCalledWith('home::androidtv_card_1', 'linkedMediaPlayers', [
      'media_player.salotto',
    ]);
  });

  it('Aspirapolvere: ripristina le associazioni dei sensori con le chiavi persistenti', () => {
    const save = renderSettings('vacuum.ufficio', {});
    fireEvent.click(screen.getByRole('button', { name: 'Batteria: Automatico' }));
    fireEvent.click(screen.getByRole('button', { name: /Temperatura/ }));
    expect(save).toHaveBeenCalledWith(
      'home::vacuum.ufficio',
      'batterySensorId',
      'sensor.temperatura'
    );
  });

  it('Aspirapolvere: il controllo lavaggio propone entità con select_option, compresi input_select', () => {
    const save = renderSettings('vacuum.ufficio', {});
    fireEvent.click(screen.getByRole('button', { name: 'Intensità del lavaggio: Automatico' }));
    expect(screen.queryByRole('button', { name: /Lavaggio numerico/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Lavaggio/ }));
    expect(save).toHaveBeenCalledWith(
      'home::vacuum.ufficio',
      'mopIntensityControlEntityId',
      'input_select.lavaggio'
    );
  });

  it('sensore: nome visibile e riga di stato con le chiavi di SensorCardSettings', () => {
    const save = renderSettings('entity_card_1', {
      'home::entity_card_1': { type: 'sensor', entityId: 'sensor.temperatura', size: 'large' },
    });
    fireEvent.click(screen.getByRole('switch', { name: 'Mostra il nome' }));
    expect(save).toHaveBeenCalledWith('home::entity_card_1', 'showName', false);
    fireEvent.click(screen.getByRole('button', { name: 'Nascosto' }));
    expect(save).toHaveBeenCalledWith('home::entity_card_1', 'sensorStatusMode', 'hidden');
    expect(save).toHaveBeenCalledWith('home::entity_card_1', 'showStatus', true);
  });

  it('cancella l’icona personalizzata togliendo la chiave', () => {
    state.pages = makePages({ customIcons: { 'light.cucina': 'Lamp', other: 'Fan' } });
    render(
      withRuntime(
        <WidgetSettingsSheet
          open
          onClose={vi.fn()}
          widgetId="light.cucina"
          settingsKey="home::light.cucina"
          pageId="home"
        />,
        { customIcons: { 'light.cucina': 'Lamp' } }
      )
    );
    fireEvent.click(screen.getByRole('button', { name: 'Icona: «Lamp», mostrata come generica' }));
    fireEvent.click(screen.getByRole('button', { name: 'Usa l’icona predefinita' }));
    const pages = state.pages as ReturnType<typeof makePages>;
    expect(pages.persistCustomIcons).toHaveBeenCalledWith({ other: 'Fan' });
  });
});

/*
 * The page settings sheet was split into the page editor (REP-20261008-001): new pages from
 * its «Nuova» menu, name, order and hiding under the card and in its bar (LauncherScreen.test),
 * the players of the media pages in «Gestisci» of the page (AvMediaPage.test). The page icon is
 * no longer chosen (E6): it stays in the data of the ready pages.
 */

describe('Icone del catalogo e del selettore', () => {
  it('ogni tipo del foglio di aggiunta usa un’icona del kit, diversa da quella degli altri', () => {
    const icons = ADD_WIDGET_TYPES.map((type) => type.icon);
    for (const icon of icons) expect(isIconName(icon), icon).toBe(true);
    expect(new Set(icons).size).toBe(icons.length);

    const byType = Object.fromEntries(ADD_WIDGET_TYPES.map((type) => [type.type, type.icon]));
    expect(byType).toMatchObject({
      fan: 'fan',
      vacuum: 'vacuum',
      mower: 'mower',
      camera: 'camera',
      climate: 'thermostat',
      androidtv: 'tv',
      cover: 'blinds',
      lock: 'lock',
      alarm: 'shield',
      calendar: 'calendar',
      todo: 'task',
      car: 'car',
      nordpool: 'energy',
      room: 'room',
      weather: 'weather',
    });
    // The registry icon never replaces the one of the type (definitions share icons).
    expect(typeVisuals().get('climate')).toEqual({ label: 'Clima', icon: 'thermostat' });
  });

  it('isIconName distingue i nomi del kit dai nomi legacy salvati', () => {
    expect(kitIcon('lamp')).toBe('lamp');
    for (const legacy of ['Lamp', 'Lightbulb', 'mdi:lightbulb', '', null, undefined, 42]) {
      expect(kitIcon(legacy), String(legacy)).toBeNull();
      expect(shownIcon(legacy)).toBe(FALLBACK_ICON);
    }
    const choices = pickerIcons();
    for (const choice of choices) expect(isIconName(choice.name), choice.name).toBe(true);
    expect(choices.map((choice) => choice.name)).not.toContain('chevronDown');
    expect(choices.length).toBe(iconNames.length - 12);
    expect(matchIcons(choices, 'VENTI').map((choice) => choice.name)).toEqual(['fan']);
    expect(matchIcons(choices, 'thermo').map((choice) => choice.name)).toEqual(['thermostat']);
    expect(iconLabel('mower')).toBe('Tosaerba');
  });

  it('le caselle dei tipi disegnano icone diverse', () => {
    render(withRuntime(<AddWidgetSheet open onClose={vi.fn()} pageId="home" onAdded={vi.fn()} />));
    const group = screen.getByRole('group', { name: 'Tipi di widget' });
    const tiles = [...group.querySelectorAll<HTMLElement>('[data-widget-type]')];
    expect(tiles).toHaveLength(ADD_WIDGET_TYPES.length);
    const drawings = tiles.map((tile) => {
      const svg = tile.querySelector('svg');
      expect(svg, tile.dataset.widgetType).not.toBeNull();
      return svg?.innerHTML ?? '';
    });
    expect(new Set(drawings).size).toBe(tiles.length);
  });

  it('il selettore mostra le icone del kit con i nomi italiani e salva il nome del kit', () => {
    render(
      withRuntime(
        <WidgetSettingsSheet
          open
          onClose={vi.fn()}
          widgetId="light.cucina"
          settingsKey="home::light.cucina"
          pageId="home"
        />
      )
    );
    fireEvent.click(screen.getByRole('button', { name: 'Icona: Predefinita' }));
    const grid = screen.getByRole('group', { name: 'Icone disponibili' });
    const buttons = within(grid).getAllByRole('button');
    expect(buttons).toHaveLength(pickerIcons().length);
    for (const button of buttons) expect(button.querySelector('svg')).not.toBeNull();

    fireEvent.change(screen.getByLabelText('Cerca un’icona'), {
      target: { value: 'venti' },
    });
    expect(within(grid).getAllByRole('button')).toHaveLength(1);
    fireEvent.click(within(grid).getByRole('button', { name: 'Ventilatore' }));
    const pages = state.pages as ReturnType<typeof makePages>;
    expect(pages.saveCustomIcon).toHaveBeenCalledWith('light.cucina', 'fan');
  });

  it('un’icona del kit salvata è mostrata con il suo nome e risulta selezionata', () => {
    render(
      withRuntime(
        <WidgetSettingsSheet
          open
          onClose={vi.fn()}
          widgetId="light.cucina"
          settingsKey="home::light.cucina"
          pageId="home"
        />,
        { customIcons: { 'light.cucina': 'fan' } }
      )
    );
    fireEvent.click(screen.getByRole('button', { name: 'Icona: Ventilatore' }));
    const grid = screen.getByRole('group', { name: 'Icone disponibili' });
    expect(within(grid).getByRole('button', { name: 'Ventilatore' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.queryByText(/non fa parte del kit/)).not.toBeInTheDocument();
  });
});
