import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CoverWidget } from '@/components/widgets/controls/cover/CoverWidget';
import { FanDetails } from '@/components/widgets/controls/fan/FanDetails';
import { LightWidget } from '@/components/widgets/controls/light/LightWidget';
import { LightsPageView } from '@/components/widgets/controls/light/LightsPage';
import { LockWidget } from '@/components/widgets/controls/lock/LockWidget';
import { SensorWidget } from '@/components/widgets/controls/sensor/SensorWidget';
import { WidgetMissing } from '@/components/widgets/controls/shared/WidgetContent';
import { PageVisibilityContext } from '@/hooks/launcher/PageVisibilityContext';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, flush, renderWithRuntime, serviceMock } from './ControlsHarness';

/*
 * REP-20261006-001/002, corsia widget-controlli-casa: PAR-4, DES-1, DES-3, DES-4, DES-10,
 * PERF-2 (sensore) e la richiesta RESP-1 (Clima 2×2 su celle piccole). Il CSS non viene
 * applicato da jsdom: per le regole di impaginazione si legge il sorgente, come negli altri
 * test Fix*; la resa a 118, 84, 76 e 67 px è verificata con Playwright nel resoconto.
 */

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function readSource(path: string): Promise<string> {
  const specifier = 'node:fs';
  const fs = (await import(/* @vite-ignore */ specifier)) as {
    readFileSync: (file: string, encoding: 'utf8') => string;
  };
  return fs.readFileSync(path, 'utf8');
}

const CONTROLS_CSS = 'src/components/widgets/controls/controls.css';
const HOME_CSS = 'src/components/widgets/home/home.css';

/** Text of a rule block (first match) or of a container query, up to the next one. */
const block = (css: string, selector: RegExp) => css.match(selector)?.[1] ?? '';
function containerQuery(css: string, query: string): string {
  const start = css.indexOf(query);
  if (start < 0) return '';
  const next = css.indexOf('@container', start + query.length);
  return css.slice(start, next < 0 ? undefined : next);
}

describe('PAR-4: la conferma di «Apri» non accetta uno stato fermo', () => {
  it('da bloccata, se Home Assistant resta su locked, dopo 30 s segnala la mancata conferma', async () => {
    vi.useFakeTimers();
    const lock = (state: string) =>
      fixtureEntity('lock.porta', state, { friendly_name: 'Porta', supported_features: 1 });
    const callService = serviceMock();
    const view = renderWithRuntime(
      <LockWidget
        id="lock.porta"
        settingsKey="k"
        settings={{}}
        size={{ w: 2, h: 2 }}
        editMode={false}
      />,
      { entities: fixtureEntities([lock('locked')]), conn: fakeConnection().conn, callService }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Apri: Porta' }));
    expect(callService).toHaveBeenCalledWith('lock', 'open', { entity_id: 'lock.porta' });
    view.setEntities([lock('locked')]);
    await flush();
    act(() => vi.advanceTimersByTime(30_500));
    expect(screen.getByText('Nessuna conferma da Home Assistant')).toBeInTheDocument();
  });
});

describe('DES-1: la pagina Luci vive nel guscio comune delle pagine speciali', () => {
  it('nessun titolo h1 o h2 proprio: il titolo di pagina è del launcher', () => {
    renderWithRuntime(<LightsPageView settings={{}} onSaveSetting={() => undefined} />, {
      entities: fixtureEntities([fixtureEntity('light.cucina', 'on', { friendly_name: 'Cucina' })]),
    });
    expect(screen.getByText('1 accese · 1 in totale')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
  });

  it('il CSS della pagina non aggiunge margini né larghezza massima al guscio', async () => {
    const css = await readSource(CONTROLS_CSS);
    const rule = block(css, /\.ctl-lights \{([^}]*)\}/);
    expect(rule).not.toBe('');
    expect(rule).not.toMatch(/\b(padding|margin|max-width)\b/);
  });
});

describe('DES-3: «Non trovato» e «Non disponibile» non tagliati a metà parola', () => {
  const unavailableText = (container: HTMLElement) =>
    container.querySelector('.ctl-unavailable > span')?.textContent;

  it('luce 1×1 non disponibile: il testo ha un proprio elemento, troncabile con i puntini', () => {
    const view = renderWithRuntime(
      <LightWidget
        id="light.giardino"
        settingsKey="k"
        settings={{}}
        size={{ w: 1, h: 1 }}
        editMode={false}
      />,
      {
        entities: fixtureEntities([
          fixtureEntity('light.giardino', 'unavailable', { friendly_name: 'Giardino' }),
        ]),
      }
    );
    expect(unavailableText(view.container)).toBe('Non disponibile');
  });

  it('tapparella 2×1 non disponibile: stesso elemento, nascosto a vista solo sulla riga del telefono', () => {
    const view = renderWithRuntime(
      <CoverWidget
        id="cover_card_1"
        settingsKey="k"
        settings={{ coverId: 'cover.salotto' }}
        size={{ w: 2, h: 1 }}
        editMode={false}
      />,
      {
        entities: fixtureEntities([
          fixtureEntity('cover.salotto', 'unavailable', { friendly_name: 'Tapparella' }),
        ]),
      }
    );
    expect(unavailableText(view.container)).toBe('Non disponibile');
  });

  it('2×1 mancante: resta la frase completa; 1×1: la forma breve', () => {
    const wide = render(<WidgetMissing size={{ w: 2, h: 1 }} name="Sensore" editMode={false} />);
    expect(screen.getByText('Dispositivo non trovato')).toBeInTheDocument();
    wide.unmount();
    render(<WidgetMissing size={{ w: 1, h: 1 }} name="Sensore" editMode={false} />);
    expect(screen.getByText('Non trovato')).toBeInTheDocument();
  });

  it('CSS: puntini sul testo, titolo sotto il glifo nella colonna stretta, glifo da solo sulla riga del telefono', async () => {
    const css = await readSource(CONTROLS_CSS);
    const unavailable = block(css, /\.ctl-unavailable \{([^}]*)\}/);
    expect(unavailable).toMatch(/display: flex;/);
    expect(unavailable).toMatch(/min-width: 0;/);
    const text = block(css, /\.ctl-unavailable > span \{([^}]*)\}/);
    expect(text).toMatch(/text-overflow: ellipsis;/);
    expect(text).toMatch(/white-space: nowrap;/);
    const narrow = containerQuery(css, '@container ctl-widget (max-width: 4.75rem)');
    expect(block(narrow, /\.ctl-missing__title \{([^}]*)\}/)).toMatch(/flex-direction: column;/);
    const phoneRow = containerQuery(css, '@container ctl-widget (max-height: 4.75rem)');
    const hidden = block(phoneRow, /\.ctl-status > \.ctl-unavailable > span \{([^}]*)\}/);
    expect(hidden).toMatch(/clip-path: inset\(50%\);/);
    expect(hidden).not.toMatch(/display: none/);
  });
});

describe('DES-4: acceso e spento si distinguono anche senza colore', () => {
  it('il pomello espone lo stato in aria-checked, su cui si basa la profondità', () => {
    const light = (state: string) =>
      fixtureEntity('light.cucina', state, {
        friendly_name: 'Cucina',
        supported_color_modes: ['onoff'],
      });
    const on = renderWithRuntime(
      <LightWidget
        id="light.cucina"
        settingsKey="k"
        settings={{}}
        size={{ w: 1, h: 1 }}
        editMode={false}
      />,
      { entities: fixtureEntities([light('on')]) }
    );
    expect(screen.getByRole('switch', { name: 'Cucina' })).toHaveAttribute('aria-checked', 'true');
    on.unmount();
    renderWithRuntime(
      <LightWidget
        id="light.cucina"
        settingsKey="k"
        settings={{}}
        size={{ w: 1, h: 1 }}
        editMode={false}
      />,
      { entities: fixtureEntities([light('off')]) }
    );
    expect(screen.getByRole('switch', { name: 'Cucina' })).toHaveAttribute('aria-checked', 'false');
  });

  it('CSS: il pomello acceso è in pressione stabile (incavo), con token esistenti del kit', async () => {
    const css = await readSource(CONTROLS_CSS);
    const face = block(
      css,
      /\.ctl-knob[^{}]*\[aria-checked='true'\][^{}]*>\s*\.aca-m__outer\s*>\s*\.aca-m__face \{([^}]*)\}/
    );
    expect(face).toMatch(/box-shadow: var\(--aca-face-pressed-soft\);/);
    const tokens = await readSource('src/themes/acasystem/tokens.css');
    for (const token of ['--aca-face-pressed-soft:', '--aca-shell-flat:', '--aca-ring:']) {
      expect(tokens).toContain(token);
    }
  });
});

describe('DES-10: modalità del ventilatore anche nel foglio dei dettagli', () => {
  it('etichette tradotte o con l’iniziale maiuscola, comando con il valore grezzo di HA', () => {
    const callService = serviceMock();
    renderWithRuntime(
      <FanDetails id="fan.sala" settingsKey="k" settings={{}} onClose={() => undefined} />,
      {
        entities: fixtureEntities([
          fixtureEntity('fan.sala', 'on', {
            friendly_name: 'Ventilatore',
            supported_features: 8,
            preset_mode: 'sleep',
            preset_modes: ['auto', 'sleep', 'custom quiet'],
          }),
        ]),
        conn: fakeConnection().conn,
        callService,
      }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Notte' }));
    expect(screen.getByRole('button', { name: 'Custom quiet' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Automatico' }));
    expect(callService).toHaveBeenLastCalledWith('fan', 'set_preset_mode', {
      entity_id: 'fan.sala',
      preset_mode: 'auto',
    });
  });
});

describe('PERF-2: lo storico del sensore non si legge fuori pagina', () => {
  it('nascosto non chiede lo storico; al ritorno sulla pagina lo legge subito', async () => {
    const { conn, sendMessagePromise } = fakeConnection();
    const runtime = createFixtureRuntime({
      conn,
      entities: fixtureEntities([
        fixtureEntity('sensor.temperatura', '21.5', {
          friendly_name: 'Temperatura',
          unit_of_measurement: '°C',
          device_class: 'temperature',
          state_class: 'measurement',
        }),
      ]),
    });
    const node = (visible: boolean) => (
      <PageVisibilityContext value={visible}>
        <WidgetRuntimeProvider value={runtime}>
          <SensorWidget
            id="entity_card_1"
            settingsKey="k"
            settings={{ entityId: 'sensor.temperatura' }}
            size={{ w: 2, h: 1 }}
            editMode={false}
          />
        </WidgetRuntimeProvider>
      </PageVisibilityContext>
    );
    const history = () =>
      sendMessagePromise.mock.calls.filter(
        ([message]) => message.type === 'history/history_during_period'
      );
    const view = render(node(false));
    await flush();
    expect(history()).toHaveLength(0);
    view.rerender(node(true));
    await flush();
    expect(history()).toHaveLength(1);
  });
});

describe('RESP-1: Clima 2×2 su celle sotto i 70 px circa', () => {
  it('una container query mette temperatura e nome su una riga e non nasconde comandi', async () => {
    const css = await readSource(HOME_CSS);
    const query = containerQuery(css, '@container home-widget (max-height: 8.25rem)');
    expect(query).not.toBe('');
    const stack = block(query, /:has\(> \.home-push > \.home-stepper\) > \.home-stack \{([^}]*)\}/);
    expect(stack).toMatch(/flex-direction: row;/);
    expect(query).not.toMatch(/display: none/);
  });
});
