import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AdaptiveCategoryWidget } from '@/components/widgets/adaptive/AdaptiveCategoryWidget';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { PageVisibilityContext } from '@/hooks/launcher/PageVisibilityContext';
import { createFixtureRuntime } from '@/utils/fixtures/runtime';
import {
  adaptiveFixtureEntities as entities,
  adaptiveFixtureServices as services,
  adaptiveFixtureSettings as fixtures,
} from '@/utils/fixtures/adaptiveData';
import { operationalProfile } from '@/components/widgets/adaptive/operationalProfile';
import { TodoContent } from '@/components/widgets/adaptive/TodoContent';
import { useOperationalHistory } from '@/components/widgets/adaptive/useOperationalHistory';
import { CarDetails } from '@/components/widgets/utilities/car/CarDetails';
import { RoomDetails } from '@/components/widgets/utilities/room/RoomDetails';

const commandCases = [
  ['sensor', 'switch', 'switch.charging', 'state', 'on'],
  ['light', 'power', 'light.fixture', 'state', 'off'],
  ['fan', 'power', 'fan.fixture', 'state', 'off'],
  ['climate', 'target', 'climate.fixture', 'temperature', 22.5],
  ['cover', 'position', 'cover.fixture', 'current_position', 61],
  ['lock', 'locked', 'lock.fixture', 'state', 'unlocked'],
  ['alarm', 'arm_home', 'alarm_control_panel.fixture', 'state', 'armed_home'],
  ['camera', 'power', 'camera.fixture', 'is_on', false],
  ['media', 'volume', 'media_player.media', 'volume_level', 0.51],
  ['sonos', 'volume', 'media_player.sonos', 'volume_level', 0.51],
  ['androidtv', 'volume', 'media_player.androidtv', 'volume_level', 0.51],
  ['appletv', 'volume', 'media_player.appletv', 'volume_level', 0.51],
  ['vacuum', 'start', 'vacuum.fixture', 'state', 'cleaning'],
  ['mower', 'start', 'lawn_mower.fixture', 'state', 'mowing'],
  ['car', 'charging', 'switch.charging', 'state', 'on'],
  ['room', 'lights', 'light.fixture', 'state', 'off'],
] as const;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
const connection = () => ({ sendMessagePromise: vi.fn().mockResolvedValue({}) }) as never;
function mount(type: string, overrides = {}) {
  const source = fixtures[type]!;
  const runtime = createFixtureRuntime({
    entities,
    services,
    conn: connection(),
    callService: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  });
  const props = {
    type,
    ...source,
    settingsKey: 'page::widget',
    id: 'widget',
    size: { w: 4, h: 4 },
    editMode: false,
  };
  const tree = (current = runtime, settings = props.settings) => (
    <WidgetRuntimeProvider value={current}>
      <AdaptiveCategoryWidget
        {...props}
        settings={settings}
        openDetails={() => runtime.openDetails('widget')}
      />
    </WidgetRuntimeProvider>
  );
  return { ...render(tree()), runtime, tree };
}

describe('Percorso operativo dei venti tipi', () => {
  it.each(['car', 'room'])(
    '%s: i dettagli non trasformano una temperatura leggibile in un comando',
    async (type) => {
      const source = entities['climate.fixture']!;
      const runtime = createFixtureRuntime({
        entities: {
          ...entities,
          [source.entity_id]: {
            ...source,
            attributes: { ...source.attributes, supported_features: 0 },
          },
        },
        services,
        conn: connection(),
        callService: vi.fn(),
      });
      const Details = type === 'car' ? CarDetails : RoomDetails;
      render(
        <WidgetRuntimeProvider value={runtime}>
          <Details
            id="native"
            settingsKey="page::native"
            settings={fixtures[type]!.settings}
            onClose={() => undefined}
          />
        </WidgetRuntimeProvider>
      );
      const slider = screen.getByRole('slider', { name: 'Temperatura desiderata' });
      expect(slider).toBeDisabled();
      if (type === 'car')
        expect(screen.getByRole('switch', { name: 'Clima dell’auto' })).toBeDisabled();
      expect(runtime.callService).not.toHaveBeenCalled();
      await act(async () => undefined);
    }
  );
  it.each(commandCases)(
    '%s: rifiuto e conferma del comando sul solo target configurato',
    async (type, id, target, field, next) => {
      for (const accepted of [false, true]) {
        const current: typeof entities = {
          ...entities,
          'alarm_control_panel.fixture': {
            ...entities['alarm_control_panel.fixture']!,
            attributes: {
              ...entities['alarm_control_panel.fixture']!.attributes,
              code_format: 'none',
              code_arm_required: false,
            },
          },
        };
        const profile = operationalProfile({
          type,
          ...fixtures[type]!,
          entities: current,
          services,
        });
        const cap = profile.capabilities.find((item) => item.id === id)!;
        expect(cap).toBeDefined();
        const callService = accepted
          ? vi.fn().mockResolvedValue(undefined)
          : vi.fn().mockRejectedValue(new Error('Rifiutato'));
        const view = mount(type, { entities: current, callService });
        const settings = {
          ...fixtures[type]!.settings,
          adaptiveControls: { visible: [id], order: [id] },
        };
        view.rerender(view.tree(view.runtime, settings));
        const control = screen.getByRole(cap.kind === 'range' ? 'slider' : 'button', {
          name: cap.label,
        });
        if (cap.kind === 'range') fireEvent.keyDown(control, { key: 'ArrowUp' });
        else {
          fireEvent.click(control);
          if (type === 'lock') fireEvent.click(control);
        }
        await act(async () => undefined);
        expect(callService).toHaveBeenCalledOnce();
        const data = callService.mock.calls[0]![2];
        expect(data.entity_id).toEqual(type === 'room' ? [target] : target);
        if (accepted) {
          expect(view.container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
          const source = current[target]!;
          const updated = {
            ...current,
            [target]: {
              ...source,
              ...(field === 'state'
                ? { state: String(next) }
                : { attributes: { ...source.attributes, [field]: next } }),
            },
          };
          view.rerender(view.tree({ ...view.runtime, entities: updated }, settings));
          await act(async () => undefined);
          expect(view.container.querySelector('[aria-busy="true"]')).not.toBeInTheDocument();
        } else {
          expect(view.container).toHaveTextContent(
            /non.*riuscito|non.*invi|non.*confermato|errore|riprova|rifiut/i
          );
          expect(view.container.querySelector('[aria-busy="true"]')).not.toBeInTheDocument();
        }
        view.unmount();
      }
    }
  );
  it.each(Object.keys(fixtures))('%s: apertura diretta e dettagli da tastiera', async (type) => {
    const openDetails = vi.fn();
    const view = mount(type, { openDetails });
    await act(async () => undefined);
    expect(
      view.container.querySelector(
        type === 'spacer' ? '.aca-adaptive-spacer' : `[data-widget-type="${type}"]`
      )
    ).toBeInTheDocument();
    if (type !== 'spacer') {
      fireEvent.click(screen.getByRole('button', { name: 'Apri dettagli' }));
      expect(openDetails).toHaveBeenCalledOnce();
    }
  });
  it.each(Object.keys(fixtures).filter((type) => type !== 'spacer'))(
    '%s: entità assente o indisponibile blocca i controlli',
    async (type) => {
      const view = mount(type, { entities: {} });
      expect(screen.getByText('Dispositivo non disponibile')).toBeInTheDocument();
      view.rerender(
        view.tree({
          ...view.runtime,
          entities: Object.fromEntries(
            Object.entries(entities).map(([id, entity]) => [
              id,
              { ...entity, state: 'unavailable' },
            ])
          ),
        })
      );
      expect(screen.getByText('Dispositivo non disponibile')).toBeInTheDocument();
      expect(view.runtime.callService).not.toHaveBeenCalled();
      await act(async () => undefined);
    }
  );
  it.each(Object.keys(fixtures))('%s: disconnessione non invia comandi', async (type) => {
    const view = mount(type, { conn: null });
    for (const button of screen
      .queryAllByRole('button')
      .filter((button) => button.getAttribute('aria-label') !== 'Apri dettagli'))
      fireEvent.click(button);
    expect(view.runtime.callService).not.toHaveBeenCalled();
    await act(async () => undefined);
  });
  it('mantiene la selezione e l’ordine dopo un rimontaggio; i dettagli mostrano anche i controlli nascosti', async () => {
    const view = mount('light');
    const settings = {
      ...fixtures.light!.settings,
      adaptiveControls: { visible: ['hue', 'power'], order: ['hue', 'power'] },
    };
    view.rerender(view.tree(view.runtime, settings));
    expect(screen.queryByRole('slider', { name: 'Luminosità della luce' })).not.toBeInTheDocument();
    expect(view.container.querySelector('[data-control-id]')).toHaveAttribute(
      'data-control-id',
      'hue'
    );
    view.unmount();
    const runtime = view.runtime;
    render(
      <WidgetRuntimeProvider value={runtime}>
        <AdaptiveCategoryWidget
          type="light"
          entityId="light.fixture"
          settings={settings}
          size={{ w: 4, h: 4 }}
          editMode={false}
          detailsMode
        />
      </WidgetRuntimeProvider>
    );
    expect(screen.getByRole('slider', { name: 'Luminosità della luce' })).toBeInTheDocument();
    await act(async () => undefined);
  });
  it('rifiuto e mancata conferma tornano al valore HA senza mantenere una mappa ottimistica', async () => {
    vi.useFakeTimers();
    const callService = vi
      .fn()
      .mockRejectedValueOnce(new Error('Rifiutato'))
      .mockResolvedValue(undefined);
    const view = mount('light', { callService });
    const button = screen.getByRole('button', { name: 'Accensione luce' });
    fireEvent.click(button);
    await act(async () => undefined);
    expect(screen.getByText(/comando non riuscito|non.*invia|rifiut|errore/i)).toBeInTheDocument();
    fireEvent.click(button);
    await act(async () => {
      vi.advanceTimersByTime(31000);
    });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(view.runtime.callService).toHaveBeenCalledTimes(2);
  });
  it('Allarme conserva PIN e impedisce azioni concorrenti quando attende HA', async () => {
    const openDetails = vi.fn();
    const view = mount('alarm', { openDetails });
    fireEvent.click(screen.getByRole('button', { name: 'Inserisci in casa' }));
    expect(openDetails).toHaveBeenCalledOnce();
    expect(view.runtime.callService).not.toHaveBeenCalled();
    const noCode = {
      ...entities,
      'alarm_control_panel.fixture': {
        ...entities['alarm_control_panel.fixture']!,
        attributes: {
          ...entities['alarm_control_panel.fixture']!.attributes,
          code_format: 'none',
          code_arm_required: false,
        },
      },
    };
    view.rerender(view.tree({ ...view.runtime, entities: noCode }));
    const actions = screen
      .getAllByRole('button')
      .filter((button) => button.getAttribute('aria-label') !== 'Apri dettagli');
    fireEvent.click(actions[0]!);
    fireEvent.click(actions[1]!);
    expect(view.runtime.callService).toHaveBeenCalledTimes(1);
    await act(async () => undefined);
  });
  it('la pausa della videocamera salva solo una preferenza locale; la foto senza cartella espone il requisito', async () => {
    const saveCardSetting = vi.fn();
    const view = mount('camera', { saveCardSetting });
    fireEvent.click(screen.getByRole('button', { name: 'Vista in diretta' }));
    expect(saveCardSetting).toHaveBeenCalledWith('page::widget', 'cameraPaused', true);
    expect(view.runtime.callService).not.toHaveBeenCalled();
    view.unmount();
    render(
      <WidgetRuntimeProvider value={view.runtime}>
        <AdaptiveCategoryWidget
          type="camera"
          entityId="camera.fixture"
          settings={{ cameraId: 'camera.fixture' }}
          size={{ w: 4, h: 4 }}
          editMode={false}
          detailsMode
        />
      </WidgetRuntimeProvider>
    );
    expect(screen.getAllByText(/configura una cartella privata autorizzata/)).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Scatta una foto' })).not.toBeInTheDocument();
    await act(async () => undefined);
  });
  it.each([true, false])(
    'Attività: la modifica richiede riscontro reale nella lista (conferma=%s)',
    async (confirm) => {
      let summary = 'Prima';
      const conn = {
        sendMessagePromise: vi.fn(async () => ({
          response: {
            'todo.fixture': { items: [{ uid: 'one', summary, status: 'needs_action' }] },
          },
        })),
      } as never;
      const callService = vi.fn(
        async (_domain: string, _service: string, data?: Record<string, unknown>) => {
          if (confirm && data?.rename) summary = String(data.rename);
        }
      );
      const runtime = createFixtureRuntime({
        entities: {
          'todo.fixture': { ...entities['todo.fixture']!, attributes: { supported_features: 4 } },
        },
        conn,
        callService,
      });
      render(
        <WidgetRuntimeProvider value={runtime}>
          <TodoContent entityId="todo.fixture" disabled={false} expanded />
        </WidgetRuntimeProvider>
      );
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Modifica attività' })).toBeInTheDocument()
      );
      fireEvent.click(screen.getByRole('button', { name: 'Modifica attività' }));
      fireEvent.change(screen.getByRole('textbox', { name: 'Nome attività' }), {
        target: { value: 'Dopo' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Salva attività' }));
      await waitFor(
        () =>
          confirm
            ? expect(
                screen.queryByRole('textbox', { name: 'Nome attività' })
              ).not.toBeInTheDocument()
            : expect(screen.getByRole('alert')).toHaveTextContent('non ha confermato'),
        { timeout: 2000 }
      );
      expect(callService).toHaveBeenCalledWith(
        'todo',
        'update_item',
        expect.objectContaining({
          target: { entity_id: 'todo.fixture' },
          item: 'one',
          rename: 'Dopo',
        })
      );
    }
  );
  it('periodi Costi e Nordpool cambiano davvero sorgente o serie senza un comando HA', () => {
    const day = operationalProfile({ type: 'cost', ...fixtures.cost!, entities, services });
    const month = operationalProfile({
      type: 'cost',
      ...fixtures.cost!,
      settings: { ...fixtures.cost!.settings, adaptivePeriod: 'Mese' },
      entities,
      services,
    });
    expect(day.history?.entityId).toBe('sensor.today');
    expect(month.history?.entityId).toBe('sensor.month');
    expect(month.values.today).toBe(48.2);
    expect(month.historyHours).toBe(720);
    const tomorrow = operationalProfile({
      type: 'nordpool',
      ...fixtures.nordpool!,
      settings: { ...fixtures.nordpool!.settings, adaptivePeriod: 'Domani' },
      entities,
      services,
    });
    expect(tomorrow.series?.map((point) => point.value)).toEqual([0.14, 0.16]);
    expect(tomorrow.values.price).toBeCloseTo(0.15);
    expect(day.execute('period', 'Mese', day.values)?.calls).toEqual([]);
  });
  it('lo storico di un attributo richiede attributi reali e si ferma fuori pagina', async () => {
    const sendMessagePromise = vi.fn().mockResolvedValue({
      'light.fixture': [
        { state: 'on', attributes: { brightness: 255 }, last_changed: '2026-10-15T08:00:00Z' },
      ],
    });
    const runtime = createFixtureRuntime({
      entities,
      services,
      conn: { sendMessagePromise } as never,
    });
    function History() {
      const result = useOperationalHistory(
        { entityId: 'light.fixture', attribute: 'brightness', factor: 100 / 255 },
        true
      );
      return <span>{result.points[0]?.value}</span>;
    }
    // Consumers pass page visibility to the history hook (as WidgetDesignChart does).
    const view = render(
      <WidgetRuntimeProvider value={runtime}>
        <PageVisibilityContext value={false}>
          <AdaptiveCategoryWidget
            type="light"
            entityId="light.fixture"
            settings={fixtures.light!.settings}
            size={{ w: 4, h: 4 }}
            editMode={false}
          />
        </PageVisibilityContext>
      </WidgetRuntimeProvider>
    );
    expect(sendMessagePromise).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'history/history_during_period' })
    );
    view.unmount();
    render(
      <WidgetRuntimeProvider value={runtime}>
        <History />
      </WidgetRuntimeProvider>
    );
    await act(async () => undefined);
    expect(sendMessagePromise).toHaveBeenCalledWith(
      expect.objectContaining({
        entity_ids: ['light.fixture'],
        no_attributes: false,
        minimal_response: false,
      })
    );
    expect(screen.getByText('100')).toBeInTheDocument();
  });
  it('gli stili del concept sono importati dal modulo operativo senza visitare il kit', async () => {
    const specifier = 'node:fs';
    const fs = (await import(/* @vite-ignore */ specifier)) as {
      readFileSync: (path: string, encoding: string) => string;
    };
    const css = fs.readFileSync('src/components/widgets/adaptive/adaptiveWidget.css', 'utf8');
    expect(css).toContain("@import './widgetDesigns.css'");
    expect(css).toContain("[data-tier='page']");
    expect(css).toContain('overflow: auto');
  });
});
