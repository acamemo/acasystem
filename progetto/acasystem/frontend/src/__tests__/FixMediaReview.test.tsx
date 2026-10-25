import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState, type ComponentType, type ReactNode } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { HassEntity } from 'home-assistant-js-websocket';
import type { PageSettings } from '@/@types/dashboard';
import type { CellSize, PageKindProps, WidgetRuntime } from '@/@types/launcher';
import { PageVisibilityContext } from '@/hooks/launcher/PageVisibilityContext';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { CameraDetails, CameraWidget } from '@/components/widgets/media/widgets/Camera';
import {
  MediaGroupWidget,
  MediaPlayerWidget,
} from '@/components/widgets/media/widgets/MediaWidgets';
import { MediaKindPage, SonosKindPage } from '@/components/widgets/media/views/MediaPage';

/**
 * REP-20261006-001, corsia widget-media-utilita: PAR-1, PERF-2, SEC-3, DES-1, DES-10 sul codice
 * dei widget e delle pagine multimediali. I casi condivisi di FixWidgetsReview e
 * FixWidgetsVisibility restano la verifica comune; qui ci sono i casi propri della corsia.
 */

vi.mock('hls.js', () => ({ default: { isSupported: () => false } }));

beforeAll(() => {
  Object.defineProperties(window.HTMLMediaElement.prototype, {
    load: { configurable: true, value: vi.fn() },
    pause: { configurable: true, value: vi.fn() },
    play: { configurable: true, value: vi.fn(() => Promise.resolve()) },
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const recent = () => new Date().toISOString();
const sonos = (id: string, name: string): HassEntity => ({
  ...fixtureEntity(id, 'playing', {
    friendly_name: name,
    media_title: `${name} brano`,
    group_members: [id],
  }),
  last_updated: recent(),
});
const radio = (state = 'playing'): HassEntity => ({
  ...fixtureEntity('media_player.radio', state, {
    friendly_name: 'Radio',
    media_title: 'Giornale radio',
  }),
  last_updated: recent(),
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

const tv = fixtureEntity('media_player.tv', 'playing', {
  friendly_name: 'Televisore',
  media_title: 'Notiziario',
});

async function flush() {
  await act(async () => {
    for (let turn = 0; turn < 10; turn += 1) await Promise.resolve();
  });
}

function visibleTree(visible: boolean, runtime: WidgetRuntime, node: ReactNode) {
  return (
    <PageVisibilityContext value={visible}>
      <WidgetRuntimeProvider value={runtime}>{node}</WidgetRuntimeProvider>
    </PageVisibilityContext>
  );
}

function HostedPage({
  Page,
  initial,
  onSave,
}: {
  Page: ComponentType<PageKindProps>;
  initial: PageSettings;
  onSave: (key: string, value: unknown) => void;
}) {
  const [settings, setSettings] = useState<PageSettings>(initial);
  return (
    <Page
      pageId="pagina"
      settings={settings}
      onSaveSetting={(key, value) => {
        onSave(key, value);
        setSettings((current) => ({ ...current, [key]: value }));
      }}
    />
  );
}

describe('PAR-1: la pagina Multimedia non mostra un editor inattivo e legge mediaIds come prima', () => {
  it('in modifica nessun interruttore dei lettori; mediaIds limita comunque i lettori mostrati', () => {
    const runtime = createFixtureRuntime({
      entities: fixtureEntities([tv, radio()]),
      editMode: true,
    });
    render(
      visibleTree(
        true,
        runtime,
        <HostedPage
          Page={MediaKindPage}
          initial={{ mediaIds: ['media_player.radio'] }}
          onSave={vi.fn()}
        />
      )
    );
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mostra tutti' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Giornale radio' })).toBeInTheDocument();
    expect(screen.queryByText('Televisore')).not.toBeInTheDocument();
  });

  it('Sonos: «Gestisci» fuori dalla modifica resta usabile e salva mediaIds con le chiavi legacy', () => {
    const onSave = vi.fn();
    const runtime = createFixtureRuntime({
      entities: fixtureEntities([
        sonos('media_player.sonos_sala', 'Sonos sala'),
        sonos('media_player.sonos_studio', 'Sonos studio'),
      ]),
    });
    render(
      visibleTree(true, runtime, <HostedPage Page={SonosKindPage} initial={{}} onSave={onSave} />)
    );
    fireEvent.click(screen.getByRole('button', { name: 'Gestisci' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Sonos studio' }));
    expect(onSave).toHaveBeenLastCalledWith('mediaIds', ['media_player.sonos_sala']);
    expect(screen.getByRole('switch', { name: 'Sonos studio' })).not.toBeChecked();
  });
});

describe('PERF-2: lettori e pagine multimediali senza orologi fuori pagina', () => {
  const size: CellSize = { w: 2, h: 2 };
  const cases: Array<[string, ReactNode, HassEntity[]]> = [
    [
      'lettore',
      <MediaPlayerWidget
        key="p"
        id="media_player.radio"
        settingsKey="k"
        settings={{}}
        size={size}
        editMode={false}
      />,
      [radio()],
    ],
    [
      'gruppo',
      <MediaGroupWidget
        key="g"
        id="media_group_1"
        settingsKey="k"
        settings={{ mediaIds: ['media_player.radio'] }}
        size={size}
        editMode={false}
      />,
      [radio()],
    ],
    [
      'pagina media',
      <HostedPage key="m" Page={MediaKindPage} initial={{}} onSave={() => undefined} />,
      [radio()],
    ],
  ];

  it.each(cases)(
    '%s: nessun timer nascosto, orologio attivo e riallineato appena visibile',
    (_name, node, entities) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-10-06T12:00:00Z'));
      const runtime = createFixtureRuntime({ entities: fixtureEntities(entities) });
      const view = render(visibleTree(false, runtime, node));
      expect(vi.getTimerCount()).toBe(0);
      view.rerender(visibleTree(true, runtime, node));
      expect(vi.getTimerCount()).toBeGreaterThan(0);
      view.rerender(visibleTree(false, runtime, node));
      expect(vi.getTimerCount()).toBe(0);
    }
  );

  it('videocamera visibile: una sola firma dell’istantanea al montaggio, non due', async () => {
    let clock = Date.parse('2026-10-06T12:00:00Z');
    vi.spyOn(Date, 'now').mockImplementation(() => (clock += 7));
    const sendMessagePromise = vi.fn(async (_message: { type: string }) => ({
      path: '/api/camera_proxy/camera.ufficio?authSig=x',
    }));
    const runtime = createFixtureRuntime({
      conn: { sendMessagePromise } as unknown as WidgetRuntime['conn'],
      entities: fixtureEntities([
        fixtureEntity('camera.ufficio', 'idle', { friendly_name: 'Ufficio', access_token: 't' }),
      ]),
    });
    render(
      visibleTree(
        true,
        runtime,
        <CameraWidget
          id="camera_card_1"
          settingsKey="k"
          settings={{ cameraId: 'camera.ufficio' }}
          size={size}
          editMode={false}
        />
      )
    );
    await flush();
    expect(
      sendMessagePromise.mock.calls.filter(([message]) => message.type === 'auth/sign_path')
    ).toHaveLength(1);
  });
});

const PLAYER = 'http://player.local/stream.html?src=camera.ingresso#media=video';

async function customCamera() {
  const runtime = createFixtureRuntime({
    entities: fixtureEntities([
      fixtureEntity('camera.ingresso', 'idle', { access_token: 'fixture' }),
    ]),
  });
  const view = render(
    <WidgetRuntimeProvider value={runtime}>
      <CameraDetails
        id="camera_card_1"
        settingsKey="k"
        settings={{
          cameraId: 'camera.ingresso',
          cameraStreamEngine: 'go2rtc',
          cameraWebrtcUrl: PLAYER,
        }}
        onClose={() => undefined}
      />
    </WidgetRuntimeProvider>
  );
  await flush();
  const source = () =>
    view.container.querySelector('[data-camera-source]')?.getAttribute('data-camera-source');
  expect(source()).toBe('custom');
  return { view, source, iframe: () => view.container.querySelector('iframe') };
}

function violation(blockedURI: string) {
  const event = new Event('securitypolicyviolation');
  Object.defineProperties(event, {
    blockedURI: { value: blockedURI },
    effectiveDirective: { value: 'frame-src' },
    disposition: { value: 'enforce' },
  });
  fireEvent(document, event);
}

describe('SEC-3: lettore personalizzato e CSP', () => {
  it('la violazione che arriva dopo il load (ordine osservato in Chromium) passa comunque alla fonte successiva', async () => {
    vi.useFakeTimers();
    const camera = await customCamera();
    fireEvent.load(camera.iframe() as HTMLIFrameElement);
    act(() => vi.advanceTimersByTime(20));
    violation('http://player.local');
    expect(camera.source()).toBe('mjpeg');
    expect(camera.iframe()).toBeNull();
  });

  it('la violazione segnalata con l’indirizzo completo senza frammento riconosce il lettore', async () => {
    const camera = await customCamera();
    violation('http://player.local/stream.html?src=camera.ingresso');
    expect(camera.source()).toBe('mjpeg');
  });

  it('una violazione di un altro indirizzo dello stesso server non tocca il lettore', async () => {
    const camera = await customCamera();
    violation('http://player.local/altro.html');
    expect(camera.source()).toBe('custom');
  });

  it('senza violazione il lettore cross-origin caricato resta: non viene sostituito dopo 15 s', async () => {
    vi.useFakeTimers();
    const camera = await customCamera();
    fireEvent.load(camera.iframe() as HTMLIFrameElement);
    act(() => vi.advanceTimersByTime(1000));
    expect(camera.view.container.querySelector('.aca-media-feed__overlay')).toBeNull();
    act(() => vi.advanceTimersByTime(30_000));
    expect(camera.source()).toBe('custom');
    expect(camera.iframe()).not.toBeNull();
  });

  it('senza alcun load il lettore passa alla fonte successiva dopo il timeout', async () => {
    vi.useFakeTimers();
    const camera = await customCamera();
    act(() => vi.advanceTimersByTime(15_000));
    expect(camera.source()).toBe('mjpeg');
  });
});

describe('DES-1: le pagine multimediali non hanno margine, larghezza massima né titolo propri', () => {
  it.each([
    ['media', MediaKindPage, [radio()]],
    ['sonos', SonosKindPage, [sonos('media_player.sonos_sala', 'Sonos sala')]],
  ] as const)(
    '%s: nessun h1 nella pagina (il titolo è del guscio del launcher)',
    (_kind, Page, entities) => {
      const runtime = createFixtureRuntime({ entities: fixtureEntities([...entities]) });
      render(
        visibleTree(true, runtime, <HostedPage Page={Page} initial={{}} onSave={() => undefined} />)
      );
      expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    }
  );

  it('il CSS della pagina non aggiunge margini, larghezza massima né un proprio scorrimento che tagli le ombre', async () => {
    const css = await readCss('src/components/widgets/media/media.css');
    const block = css.match(/\.aca-media-page \{([^}]*)\}/)?.[1] ?? '';
    expect(block).not.toBe('');
    expect(block).not.toMatch(/\b(padding|margin|max-width|overflow|height)\b/);
  });
});

describe('DES-6: la lista scorrevole dei lettori non taglia le ombre delle righe', () => {
  it('il contenitore scorrevole si estende oltre le righe quanto la loro ombra (1,25em)', async () => {
    const css = await readCss('src/components/widgets/media/media.css');
    const block = css.match(/\.aca-media-page__scroll \{([^}]*)\}/)?.[1] ?? '';
    expect(block).toMatch(/overflow-y: auto/);
    expect(block).toMatch(/margin: -1\.25em;/);
    expect(block).toMatch(/padding: 1\.25em;/);
  });
});

describe('DES-10: testi della pagina Sonos e del lettore', () => {
  it('con un solo diffusore l’intestazione dice «1 lettore»', () => {
    const runtime = createFixtureRuntime({
      entities: fixtureEntities([sonos('media_player.sonos_sala', 'Sonos sala')]),
    });
    render(
      visibleTree(
        true,
        runtime,
        <HostedPage Page={SonosKindPage} initial={{}} onSave={() => undefined} />
      )
    );
    expect(screen.getByText('Sonos · 1 lettore')).toBeInTheDocument();
  });

  it.each([
    [{ w: 2, h: 2 }, true],
    [{ w: 4, h: 2 }, true],
    [{ w: 2, h: 1 }, false],
  ] as const)(
    'errore del comando a %o: su due righe solo dove c’è spazio',
    async (size, twoLines) => {
      const callService = vi.fn(async () => {
        throw new Error('rifiutato');
      });
      const runtime = createFixtureRuntime({
        entities: fixtureEntities([radio('paused')]),
        callService,
      });
      render(
        visibleTree(
          true,
          runtime,
          <MediaPlayerWidget
            id="media_player.radio"
            settingsKey="k"
            settings={{}}
            size={size}
            editMode={false}
          />
        )
      );
      await act(async () => {
        fireEvent.click(screen.getAllByRole('button', { name: 'Riproduci' })[0]);
      });
      const caption = screen
        .getAllByText('Comando non riuscito. Riprova.')
        .find((node) => !node.closest('.sr-only'));
      expect(caption).toBeDefined();
      expect(caption?.classList.contains('aca-media-error-caption')).toBe(twoLines);
    }
  );

  it('la regola delle due righe vince sul troncamento a una riga del testo del lettore', async () => {
    const css = await readCss('src/components/widgets/media/media.css');
    const block = css.match(/\.aca-media-open \.aca-media-error-caption \{([^}]*)\}/)?.[1] ?? '';
    expect(block).toMatch(/-webkit-line-clamp: 2/);
    expect(block).toMatch(/white-space: normal/);
  });
});
