import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CardSettings, CardSettingsMap } from '@/@types/dashboard';
import type { Connection } from '@/@types/ha';
import { todoWidget } from '@/components/widgets/home/todo';
import { readCameraSettings } from '@/components/widgets/media/model/camera';
import { readTvConfig } from '@/components/widgets/media/widgets/TvWidget';
import { readCostSettings } from '@/components/widgets/utilities/energy/costData';
import { readNordpoolSettings } from '@/components/widgets/utilities/energy/nordpoolData';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { WidgetSettingsSheet } from '@/templates/sheets';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, flush } from './ControlsHarness';

const state = vi.hoisted(() => ({ pages: {} as Record<string, unknown> }));

vi.mock('@/hooks/context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/context')>()),
  usePages: () => state.pages,
}));

const entities = fixtureEntities([
  fixtureEntity('media_player.salotto', 'playing', { friendly_name: 'Salotto' }),
  fixtureEntity('media_player.cucina', 'idle', { friendly_name: 'Cucina' }),
  fixtureEntity('media_player.sonos', 'idle', {
    friendly_name: 'Sonos studio',
    manufacturer: 'Sonos',
  }),
  fixtureEntity('media_player.tv', 'on', { friendly_name: 'TV salotto' }),
  fixtureEntity('todo.ufficio', '1', { friendly_name: 'Attività ufficio' }),
  fixtureEntity('sensor.costo_oggi', '2.5', { friendly_name: 'Costo oggi' }),
  fixtureEntity('input_number.costo_mese', '40', { friendly_name: 'Costo mese manuale' }),
  fixtureEntity('binary_sensor.movimento_ingresso', 'off', {
    friendly_name: 'Movimento ingresso',
    device_class: 'motion',
  }),
  fixtureEntity('binary_sensor.porta', 'off', { friendly_name: 'Porta', device_class: 'door' }),
  fixtureEntity('script.pulisci_cucina', 'off', { friendly_name: 'Pulisci cucina' }),
  fixtureEntity('vacuum.robot', 'docked', { friendly_name: 'Robot' }),
]);

function makePages(overrides: Record<string, unknown> = {}) {
  return {
    pagesConfig: { pages: ['home'], header: [], home: [] },
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

/**
 * Widget settings with a real store: what the sheet saves is what the widget then reads.
 * The saved settings are printed in an <output> so the test can hand them to the consumer.
 */
function SettingsHarness({
  widgetId,
  initial = {},
  conn = null,
  beside,
}: {
  widgetId: string;
  initial?: CardSettings;
  conn?: Connection | null;
  beside?: (settings: CardSettings) => ReactNode;
}) {
  const key = `home::${widgetId}`;
  const [cardSettings, setCardSettings] = useState<CardSettingsMap>({ [key]: initial });
  const runtime = createFixtureRuntime({
    entities,
    conn,
    cardSettings,
    customNames: {},
    saveCardSetting: (settingsKey, setting, value) =>
      setCardSettings((current) => ({
        ...current,
        [settingsKey]: { ...current[settingsKey], [setting]: value },
      })),
  });
  const settings = cardSettings[key] ?? {};
  return (
    <WidgetRuntimeProvider value={runtime}>
      <WidgetSettingsSheet
        open
        onClose={() => undefined}
        widgetId={widgetId}
        settingsKey={key}
        pageId="home"
      />
      <output data-testid="salvate">{JSON.stringify(settings)}</output>
      {beside?.(settings)}
    </WidgetRuntimeProvider>
  );
}

const saved = (): CardSettings =>
  JSON.parse(screen.getByTestId('salvate').textContent ?? '{}') as CardSettings;

describe('PAR-2: lista del widget Attività', () => {
  it('la lista scelta nel foglio è quella che il widget carica', async () => {
    const { conn } = fakeConnection((message) =>
      message.type === 'todo/item/list'
        ? { items: [{ uid: 'a', summary: 'Comprare il pane', status: 'needs_action' }] }
        : null
    );
    render(
      <SettingsHarness
        widgetId="todo_card_1"
        initial={{ size: 'large' }}
        conn={conn}
        beside={(settings) => (
          <todoWidget.Widget
            id="todo_card_1"
            settingsKey="home::todo_card_1"
            settings={settings}
            size={{ w: 2, h: 3 }}
            editMode={false}
          />
        )}
      />
    );
    expect(
      screen.getByText('Scegli una lista di attività nelle impostazioni del widget.')
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lista di attività: Nessuna' }));
    fireEvent.click(screen.getByRole('button', { name: /Attività ufficio.*todo\.ufficio/ }));
    await flush();
    expect(saved()).toMatchObject({ todoEntityId: 'todo.ufficio' });
    expect(await screen.findByText('Comprare il pane')).toBeInTheDocument();
    expect(screen.queryByText(/Scegli una lista di attività/)).not.toBeInTheDocument();
  });
});

describe('PAR-3: impostazioni di tipo con le chiavi lette dai widget nuovi', () => {
  it.each([
    'weather_temp_1',
    'calendar_card_1',
    'todo_card_1',
    'spacer_card_1',
    'camera_card_1',
    'androidtv_card_1',
    'vacuum.robot',
    'nordpool_card_1',
    'cost_card_1',
  ])('%s: nessun avviso «non ancora modificabili»', (widgetId) => {
    render(<SettingsHarness widgetId={widgetId} />);
    expect(screen.queryByText(/non sono ancora modificabili/)).not.toBeInTheDocument();
  });

  it('videocamera: legge gli alias legacy del motore e mostra solo i campi del modo scelto', () => {
    render(
      <SettingsHarness
        widgetId="camera_card_1"
        initial={{
          cameraId: 'camera.ingresso',
          cameraStreamEngine: 'custom',
          cameraWebrtcUrl: 'http://go2rtc.local/stream.html?src={entity_object_id}&mode=mse',
        }}
      />
    );
    const engine = screen.getByRole('group', { name: 'Motore video' });
    expect(within(engine).getByRole('button', { name: 'go2rtc' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(within(engine).queryByRole('button', { name: 'WebRTC' })).not.toBeInTheDocument();
    const mode = screen.getByRole('group', { name: 'Modalità go2rtc' });
    expect(within(mode).getByRole('button', { name: 'MSE' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('spinbutton', { name: 'Intervallo in secondi' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sensore di movimento/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Su movimento' }));
    expect(
      screen.queryByRole('spinbutton', { name: 'Intervallo in secondi' })
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sensore di movimento: Nessuna' }));
    expect(screen.queryByRole('button', { name: /Porta/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Movimento ingresso/ }));

    fireEvent.click(within(engine).getByRole('button', { name: 'Istantanee' }));
    expect(screen.queryByRole('group', { name: 'Modalità go2rtc' })).not.toBeInTheDocument();

    const camera = readCameraSettings(saved());
    expect(camera.engine).toBe('snapshot');
    expect(camera.refreshMode).toBe('motion');
    expect(camera.motionSensorId).toBe('binary_sensor.movimento_ingresso');
  });

  it('videocamera: un vecchio «webrtc» appare come Home Assistant senza URL del lettore', () => {
    render(<SettingsHarness widgetId="camera_card_1" initial={{ cameraStreamEngine: 'webrtc' }} />);
    const engine = screen.getByRole('group', { name: 'Motore video' });
    expect(within(engine).getByRole('button', { name: 'Home Assistant' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('costi: sensori, etichette e decimali arrivano alla configurazione del widget', () => {
    render(<SettingsHarness widgetId="cost_card_1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Costo di oggi: Nessuna' }));
    fireEvent.click(screen.getByRole('button', { name: /Costo oggi.*sensor\.costo_oggi/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Costo del mese: Nessuna' }));
    fireEvent.click(screen.getByRole('button', { name: /Costo mese manuale/ }));
    const today = screen.getByRole('textbox', { name: 'Etichetta di oggi' });
    expect(today).toHaveAttribute('placeholder', 'Oggi');
    fireEvent.change(today, { target: { value: '  Da mezzanotte ' } });
    fireEvent.blur(today);
    const month = screen.getByRole('textbox', { name: 'Etichetta del mese' });
    fireEvent.change(month, { target: { value: 'Ottobre' } });
    fireEvent.blur(month);

    const cost = readCostSettings(saved());
    expect(cost).toMatchObject({
      todayId: 'sensor.costo_oggi',
      monthId: 'input_number.costo_mese',
      todayLabel: 'Da mezzanotte',
      monthLabel: 'Ottobre',
    });
  });

  it('Nordpool: il prezzo con sostegno statale si imposta anche dal foglio', () => {
    render(<SettingsHarness widgetId="nordpool_card_1" />);
    fireEvent.click(screen.getByRole('switch', { name: 'Prezzi con sostegno statale' }));
    expect(readNordpoolSettings(saved()).showWithSupport).toBe(true);
  });

  it('Android TV: il lettore della TV stessa non è tra quelli collegabili, come nel legacy', () => {
    render(
      <SettingsHarness widgetId="androidtv_card_1" initial={{ mediaPlayerId: 'media_player.tv' }} />
    );
    const list = screen.getByRole('group', { name: 'Lettori multimediali' });
    expect(
      within(list).queryByRole('button', { name: /media_player\.tv/ })
    ).not.toBeInTheDocument();
    fireEvent.click(within(list).getByRole('button', { name: /Cucina.*media_player\.cucina/ }));
    expect(readTvConfig(saved()).linkedMediaPlayers).toEqual(['media_player.cucina']);
  });

  it('aspirapolvere: le associazioni vuote si chiamano «Automatico» e gli script delle stanze si gestiscono', () => {
    render(<SettingsHarness widgetId="vacuum.robot" />);
    expect(screen.getByRole('button', { name: 'Batteria: Automatico' })).toBeInTheDocument();
    const rooms = screen.getByRole('group', { name: 'Script delle stanze' });
    fireEvent.click(within(rooms).getByRole('button', { name: 'Aggiungi una stanza' }));
    expect(saved().roomScripts).toEqual([{ label: '', entityId: '' }]);

    const name = within(rooms).getByRole('textbox', { name: 'Stanza 1 Nome' });
    fireEvent.change(name, { target: { value: ' Cucina ' } });
    fireEvent.blur(name);
    fireEvent.click(within(rooms).getByRole('button', { name: 'Script della stanza 1: Nessuno' }));
    fireEvent.click(
      within(rooms).getByRole('button', { name: /Pulisci cucina.*script\.pulisci_cucina/ })
    );
    expect(saved().roomScripts).toEqual([{ label: 'Cucina', entityId: 'script.pulisci_cucina' }]);

    fireEvent.click(within(rooms).getByRole('button', { name: 'Rimuovi la stanza 1' }));
    expect(saved().roomScripts).toEqual([]);
  });
});

/*
 * CORR-5, DES-10 and PAR-1 tested the page settings sheet, split into the page editor by
 * REP-20261008-001: the order of the pages moves to the arrows under the card
 * (LauncherScreen.test.tsx), the players of the media pages to «Gestisci» in the page
 * (AvMediaPage.test.tsx).
 */
