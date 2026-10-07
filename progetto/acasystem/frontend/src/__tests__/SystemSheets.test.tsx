import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { CardSettingsMap, PagesConfig } from '@/@types/dashboard';
import type { LauncherApi, LauncherLayout, WidgetRuntime } from '@/@types/launcher';
import { LauncherProvider } from '@/hooks/launcher/LauncherContext';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { iconNames, isIconName } from '@/components/primitives';
import { AddWidgetSheet, PageSettingsSheet, WidgetSettingsSheet } from '@/templates/sheets';
import { ADD_WIDGET_TYPES, typeVisuals } from '@/templates/sheets/catalog';
import {
  FALLBACK_ICON,
  iconLabel,
  kitIcon,
  matchIcons,
  pickerIcons,
  shownIcon,
} from '@/templates/sheets/parts/iconChoices';

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
    hiddenCards: [] as string[],
    persistHiddenCards: vi.fn(),
    saveCardSetting: vi.fn(),
    savePageSetting: vi.fn(),
    saveCustomName: vi.fn(),
    customIcons: {} as Record<string, string>,
    saveCustomIcon: vi.fn(),
    persistCustomIcons: vi.fn(),
    toggleCardVisibility: vi.fn(),
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

const layout: LauncherLayout = {
  version: 1,
  cover: { enabled: true },
  pages: [
    { id: 'home', label: 'Principale', kind: 'widgets', placements: {} },
    { id: 'studio', label: 'Studio', icon: 'Lamp', kind: 'widgets', placements: {} },
  ],
};

function createLauncherMock(overrides: Partial<LauncherApi> = {}): LauncherApi {
  return {
    layout,
    grids: {
      phone: { w: 4, h: 6 },
      phoneLandscape: { w: 6, h: 2 },
      tabletPortrait: { w: 6, h: 8 },
      tablet: { w: 8, h: 5 },
    },
    deviceClass: 'tablet',
    currentPage: 1,
    goToPage: vi.fn(),
    editMode: true,
    setEditMode: vi.fn(),
    placeWidget: vi.fn(),
    moveWidget: vi.fn(() => true),
    resizeWidget: vi.fn(() => true),
    removeWidget: vi.fn(),
    addPage: vi.fn(() => 'nuova'),
    updatePage: vi.fn(),
    removePage: vi.fn(),
    reorderPages: vi.fn(),
    setCoverEnabled: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  state.pages = makePages();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.documentElement.style.overflow = '';
});

describe('AddWidgetSheet', () => {
  function renderAdd(onAdded = vi.fn(), onClose = vi.fn()) {
    render(withRuntime(<AddWidgetSheet open onClose={onClose} pageId="home" onAdded={onAdded} />));
    return { onAdded, onClose };
  }

  it('è un dialog con titolo, chiusura e la griglia dei tipi', () => {
    const { onClose } = renderAdd();
    const dialog = screen.getByRole('dialog', { name: 'Aggiungi un widget' });
    expect(dialog.tagName).toBe('DIALOG');
    expect(within(dialog).getByRole('group', { name: 'Tipi di widget' })).toBeInTheDocument();
    for (const label of ['Luci', 'Clima', 'Stanze', 'Separatore', 'Sensori e comandi']) {
      expect(within(dialog).getByRole('button', { name: label })).toBeInTheDocument();
    }
    fireEvent.click(within(dialog).getByRole('button', { name: 'Chiudi' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('crea un widget clima come il legacy e lo passa al launcher con la dimensione scelta', () => {
    const { onAdded, onClose } = renderAdd();
    fireEvent.click(screen.getByRole('button', { name: 'Clima' }));
    expect(screen.getByRole('heading', { name: 'Clima' })).toHaveFocus();
    const add = screen.getByRole('button', { name: 'Aggiungi il widget' });
    expect(add).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /Termostato soggiorno/ }));
    fireEvent.click(screen.getByRole('button', { name: '4 × 2' }));
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
    expect(onAdded).toHaveBeenCalledWith(widgetId, { w: 4, h: 2 });
    expect(onClose).toHaveBeenCalled();
  });

  it('aggiunge più luci: un widget per entità, con gli id di entità come nel legacy', () => {
    state.pages = makePages({
      pagesConfig: { pages: ['home'], header: [], home: [] },
    });
    const { onAdded } = renderAdd();
    fireEvent.click(screen.getByRole('button', { name: 'Luci' }));
    fireEvent.click(screen.getByRole('button', { name: /Luce cucina/ }));
    fireEvent.click(screen.getByRole('button', { name: /Luce sala/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi 2 widget' }));

    const pages = state.pages as ReturnType<typeof makePages>;
    expect(pages.persistConfig).toHaveBeenCalledWith(
      expect.objectContaining({ home: ['light.cucina', 'light.sala'] })
    );
    expect(onAdded.mock.calls).toEqual([
      ['light.cucina', undefined],
      ['light.sala', undefined],
    ]);
  });

  it('nasconde le luci già nella pagina e filtra con la ricerca', () => {
    renderAdd();
    fireEvent.click(screen.getByRole('button', { name: 'Luci' }));
    expect(screen.queryByRole('button', { name: /Luce cucina/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Cerca'), { target: { value: 'nessuna' } });
    expect(screen.getByText('Nessun risultato per «nessuna».')).toBeInTheDocument();
  });

  it('crea un separatore con le impostazioni iniziali del legacy', () => {
    const { onAdded } = renderAdd();
    fireEvent.click(screen.getByRole('button', { name: 'Separatore' }));
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
    expect(onAdded).toHaveBeenCalledWith(key.replace('home::', ''), undefined);
  });

  it('torna ai tipi con Indietro', () => {
    renderAdd();
    fireEvent.click(screen.getByRole('button', { name: 'Meteo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Indietro' }));
    expect(screen.getByRole('group', { name: 'Tipi di widget' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Meteo' })).toHaveFocus();
  });
});

describe('WidgetSettingsSheet', () => {
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

    fireEvent.click(screen.getByRole('switch', { name: 'Nascondi il widget' }));
    expect(pages.toggleCardVisibility).toHaveBeenCalledWith('media_group_1');

    fireEvent.click(screen.getByRole('button', { name: 'A tutto widget' }));
    expect(save).toHaveBeenCalledWith('home::media_group_1', 'artworkMode', 'cover');
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

  it('Attività: permette di scegliere e rimuovere la lista con la chiave consumata dal widget', () => {
    const save = renderSettings('todo_card_1', {});
    expect(screen.queryByText(/non sono ancora modificabili/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lista di attività: Nessuna' }));
    fireEvent.click(screen.getByRole('button', { name: /Attività ufficio.*todo.ufficio/ }));
    expect(save).toHaveBeenCalledWith('home::todo_card_1', 'todoEntityId', 'todo.ufficio');
    fireEvent.click(screen.getByRole('button', { name: 'Lista di attività: Nessuna' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nessuna' }));
    expect(save).toHaveBeenLastCalledWith('home::todo_card_1', 'todoEntityId', null);
  });

  it('Calendario: modifica la selezione senza perdere i calendari salvati temporaneamente mancanti', () => {
    const save = renderSettings('calendar_card_1', {
      'home::calendar_card_1': { calendars: ['calendar.assente'] },
    });
    fireEvent.click(screen.getByRole('button', { name: /Calendario ufficio.*calendar.ufficio/ }));
    expect(save).toHaveBeenCalledWith('home::calendar_card_1', 'calendars', [
      'calendar.assente',
      'calendar.ufficio',
    ]);
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
    ['nordpool_card_1', 'Barre', 'graphStyle', 'bar'],
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

  it('Android TV: seleziona lettori collegati usando linkedMediaPlayers', () => {
    const save = renderSettings('androidtv_card_1', {});
    fireEvent.click(screen.getByRole('button', { name: /Salotto.*media_player.salotto/ }));
    expect(save).toHaveBeenCalledWith('home::androidtv_card_1', 'linkedMediaPlayers', [
      'media_player.salotto',
    ]);
  });

  it('Aspirapolvere: ripristina le associazioni dei sensori con le chiavi persistenti', () => {
    const save = renderSettings('vacuum.ufficio', {});
    fireEvent.click(screen.getByRole('button', { name: 'Batteria: Automatico' }));
    fireEvent.click(screen.getByRole('button', { name: /Temperatura.*sensor.temperatura/ }));
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
    fireEvent.click(screen.getByRole('button', { name: /Lavaggio.*input_select.lavaggio/ }));
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

describe('PageSettingsSheet', () => {
  function renderPage(pageId: string | null, launcher = createLauncherMock(), onClose = vi.fn()) {
    render(
      <LauncherProvider value={launcher}>
        <PageSettingsSheet open onClose={onClose} pageId={pageId} />
      </LauncherProvider>
    );
    return { launcher, onClose };
  }

  it('crea una pagina di widget con nome e tipo', () => {
    const { launcher, onClose } = renderPage(null);
    expect(screen.getByRole('dialog', { name: 'Nuova pagina' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome' }), {
      target: { value: '  Ufficio ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Crea la pagina' }));
    expect(launcher.addPage).toHaveBeenCalledWith({
      label: 'Ufficio',
      icon: undefined,
      kind: 'widgets',
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('crea una pagina speciale con nome e icona predefiniti', () => {
    const { launcher } = renderPage(null);
    fireEvent.click(screen.getByRole('button', { name: 'Luci' }));
    fireEvent.click(screen.getByRole('button', { name: 'Crea la pagina' }));
    expect(launcher.addPage).toHaveBeenCalledWith({
      label: 'Luci',
      icon: 'light',
      kind: 'lights',
    });
  });

  it('un’icona legacy della pagina resta salvata, si vede generica e si sostituisce con una del kit', () => {
    const { launcher } = renderPage('studio');
    const row = screen.getByRole('button', { name: 'Icona: «Lamp», mostrata come generica' });
    expect(row.querySelector('svg')).not.toBeNull();
    expect(launcher.updatePage).not.toHaveBeenCalled();

    fireEvent.click(row);
    expect(screen.getByText(/L’icona salvata «Lamp» non fa parte del kit/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lampada' }));
    expect(launcher.updatePage).toHaveBeenCalledWith('studio', { icon: 'lamp' });
  });

  it('rinomina, nasconde ed elimina con conferma', () => {
    const { launcher, onClose } = renderPage('studio');
    expect(screen.getByRole('dialog', { name: 'Impostazioni della pagina' })).toBeInTheDocument();
    const name = screen.getByRole('textbox', { name: 'Nome' });
    fireEvent.change(name, { target: { value: 'Studio grande' } });
    fireEvent.blur(name);
    expect(launcher.updatePage).toHaveBeenCalledWith('studio', { label: 'Studio grande' });

    fireEvent.change(name, { target: { value: '   ' } });
    fireEvent.blur(name);
    expect(screen.getByText('Il nome non può essere vuoto: resta quello di prima.')).toBeVisible();

    fireEvent.click(screen.getByRole('switch', { name: 'Nascondi la pagina' }));
    expect(launcher.updatePage).toHaveBeenCalledWith('studio', { hidden: true });

    fireEvent.click(screen.getByRole('button', { name: 'Elimina la pagina' }));
    expect(launcher.removePage).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Annulla' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Elimina la pagina' }));
    expect(launcher.removePage).toHaveBeenCalledWith('studio');
    expect(onClose).toHaveBeenCalled();
  });

  it('non permette di eliminare la pagina principale', () => {
    renderPage('home');
    expect(screen.queryByRole('button', { name: 'Elimina la pagina' })).not.toBeInTheDocument();
    expect(screen.getByText('La pagina principale non si può eliminare.')).toBeInTheDocument();
  });

  it('riordina una pagina senza coinvolgere la copertina e annuncia la nuova posizione', () => {
    const { launcher } = renderPage('studio');
    expect(screen.getByRole('button', { name: 'Sposta dopo' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Sposta prima' }));
    expect(launcher.reorderPages).toHaveBeenCalledWith(['studio', 'home']);
    expect(screen.getByRole('status')).toHaveTextContent('Pagina spostata alla posizione 1 di 2.');
    expect(launcher.setCoverEnabled).not.toHaveBeenCalled();
  });

  it.each(['media', 'sonos'] as const)(
    '%s: i lettori si configurano nel foglio raggiungibile, separato dalla pagina inert',
    (kind) => {
      const launcher = createLauncherMock({
        layout: {
          ...layout,
          pages: [...layout.pages, { id: 'musica', label: 'Musica', kind, placements: {} }],
        },
      });
      render(
        withRuntime(
          <LauncherProvider value={launcher}>
            <PageSettingsSheet open onClose={vi.fn()} pageId="musica" />
          </LauncherProvider>
        )
      );
      const pages = state.pages as ReturnType<typeof makePages>;
      const label = kind === 'sonos' ? 'Sonos studio' : 'Salotto';
      const toggle = screen.getByRole('switch', { name: label });
      expect(toggle.closest('[inert]')).toBeNull();
      expect(toggle).toHaveAttribute('aria-checked', 'true');
      fireEvent.click(toggle);
      expect(pages.savePageSetting).toHaveBeenCalledWith('musica', 'mediaIds', []);
      fireEvent.click(screen.getByRole('button', { name: 'Nascondi tutti' }));
      expect(pages.savePageSetting).toHaveBeenLastCalledWith('musica', 'mediaIds', []);
      fireEvent.click(screen.getByRole('button', { name: 'Mostra tutti' }));
      expect(pages.savePageSetting).toHaveBeenLastCalledWith('musica', 'mediaIds', null);
      expect(toggle).toHaveAccessibleName(label);
    }
  );

  it('chiude con Escape come ogni foglio', () => {
    const { onClose } = renderPage('studio');
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    expect(onClose).toHaveBeenCalled();
  });
});

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
    expect(choices.length).toBe(iconNames.length - 7);
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
