import { useEffect, useState } from 'react';
import type { CardSettings } from '@/@types/dashboard';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CameraDetails, CameraWidget } from '@/components/widgets/media/widgets/Camera';
import { CameraConsole } from '@/components/widgets/media/widgets/CameraConsole';
import { ProductCameraControls } from '@/components/widgets/home/camera/ProductCameraControls';
import {
  cameraChannelSettings,
  cameraProductBinding,
  privateCameraDirectory,
  productCameraView,
} from '@/components/widgets/home/camera/productCameraModel';
import { AdaptiveSettingsSection } from '@/templates/sheets/sections/AdaptiveSettingsSection';
import { PageVisibilityContext } from '@/hooks/launcher/PageVisibilityContext';
import type { ProductDeviceBinding } from '@/utils/devices/productBinding';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, flush, renderWithRuntime, serviceMock } from './ControlsHarness';

const feeds = vi.hoisted(() => ({
  active: new Set<string>(),
  peak: 0,
  cameras: [] as { cameraId: string; webrtcUrl: string; engine: string }[],
  removed: [] as string[],
}));
vi.mock('@/components/widgets/media/parts/CameraFeed', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('@/components/widgets/media/parts/CameraFeed')>();
  return {
    ...original,
    CameraStream: ({
      camera,
    }: {
      camera: { cameraId: string; webrtcUrl: string; engine: string };
    }) => {
      useEffect(() => {
        feeds.active.add(camera.cameraId);
        feeds.peak = Math.max(feeds.peak, feeds.active.size);
        feeds.cameras.push({ ...camera });
        return () => {
          feeds.active.delete(camera.cameraId);
          feeds.removed.push(camera.cameraId);
        };
      }, []);
      return (
        <div data-testid="camera-feed" data-camera={camera.cameraId}>
          Immagine
        </div>
      );
    },
  };
});
const binding: ProductDeviceBinding = {
  version: 1,
  family: 'camera',
  deviceId: 'camera-box',
  primaryEntityId: 'camera.main',
  channelEntityIds: ['camera.main'],
  secondaryEntityIds: [],
};
const settings = { cameraId: 'camera.main', productDevice: binding, name: 'Ingresso' };
const services = {
  camera: {
    turn_on: {},
    turn_off: {},
    enable_motion_detection: {},
    disable_motion_detection: {},
    snapshot: {},
    record: {},
    play_stream: {},
  },
  onvif: { ptz: {} },
};
const camera = (state = 'idle', patch: Record<string, unknown> = {}, id = 'camera.main') =>
  fixtureEntity(id, state, {
    friendly_name: id === 'camera.main' ? 'Principale' : 'Secondaria',
    supported_features: 3,
    access_token: 'TRANSIENT_CAMERA_CAPABILITY',
    ...patch,
  });
const runtime = (state = 'idle', patch: Record<string, unknown> = {}) => ({
  entities: fixtureEntities([camera(state, patch)]),
  conn: fakeConnection().conn,
  services,
});
const details = (current: CardSettings = settings) => (
  <CameraDetails
    id="camera.widget"
    settingsKey="home::camera"
    settings={current}
    onClose={() => undefined}
  />
);
const home = (current: CardSettings = settings, editMode = false) => (
  <CameraWidget
    id="camera.widget"
    settingsKey="home::camera"
    settings={current}
    editMode={editMode}
    size={{ w: 2, h: 2 }}
  />
);
const controls = (current: CardSettings = settings) => (
  <ProductCameraControls entityId="camera.main" label="Principale" settings={current} />
);
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  feeds.active.clear();
  feeds.cameras = [];
  feeds.removed = [];
  feeds.peak = 0;
});

describe('Videocamera prodotto: contratto HA e identità', () => {
  it('richiede metadati validi e cameraId uguale al primario', () => {
    expect(cameraProductBinding(settings)).toEqual(binding);
    expect(cameraProductBinding({ cameraId: 'camera.main' })).toBeNull();
    expect(cameraProductBinding({ ...settings, cameraId: 'camera.other' })).toBeNull();
    expect(
      cameraProductBinding({ ...settings, productDevice: { ...binding, family: 'light' } })
    ).toBeNull();
  });
  it.each(['unknown', 'unavailable', '', '__proto__', 'constructor', 'toString'])(
    '%s non inventa alimentazione o disponibilità',
    (state) => {
      const view = productCameraView(camera(state));
      expect(view.available).toBe(false);
      expect(view.stateLabel).toBe('Non disponibile');
    }
  );
  it.each([
    ['idle', 'Inattiva'],
    ['streaming', 'Trasmissione in corso'],
    ['recording', 'Registrazione in corso'],
    ['off', 'Spenta'],
  ])('distingue lo stato osservato %s', (state, label) => {
    expect(productCameraView(camera(state)).stateLabel).toBe(label);
  });
  it('motion_detection usa il dato bool, mai bit 4 o motion_detection_enabled', () => {
    expect(
      productCameraView(camera('idle', { supported_features: 4, motion_detection_enabled: true }))
        .motion
    ).toBeNull();
    expect(productCameraView(camera('idle', { motion_detection: false })).motion).toBe(false);
    expect(productCameraView(camera('idle', { motion_detection: true })).motion).toBe(true);
  });
  it('un URL fisso appartiene soltanto alla lente primaria, un template a ogni lente', () => {
    const fixed = {
      ...settings,
      cameraStreamEngine: 'go2rtc',
      cameraWebrtcUrl: 'https://local.example/player?src=main',
    };
    expect(cameraChannelSettings(fixed, 'camera.main').webrtcUrl).toContain('src=main');
    expect(cameraChannelSettings(fixed, 'camera.other').webrtcUrl).toBe('');
    expect(cameraChannelSettings(fixed, 'camera.other').engine).toBe('auto');
    expect(
      cameraChannelSettings(
        { ...fixed, cameraWebrtcUrl: '/player?src={entity_id}' },
        'camera.other'
      ).webrtcUrl
    ).toContain('{entity_id}');
  });
  it.each([
    undefined,
    '',
    'relative/path',
    '/www',
    '/config/www/capture',
    '/media/../www',
    '/media\\capture',
    '/media/\nsecret',
    '/config/./www',
    '/config//www',
    '//config/www',
    '/',
    '/media//',
    '/media/./private',
  ])('non autorizza automaticamente directory non private: %s', (directory) => {
    expect(privateCameraDirectory(directory)).toBeNull();
  });
  it('conserva una directory assoluta esplicitamente configurata', () => {
    expect(privateCameraDirectory('/media/aca/')).toBe('/media/aca');
  });
});

describe('Videocamera: feed unico, visibilità e ciclo vita', () => {
  it('Home e Console prodotto non inviano comandi al montaggio', async () => {
    const callService = serviceMock();
    const view = renderWithRuntime(home(), { ...runtime(), callService });
    expect(screen.getByText('Inattiva')).toBeInTheDocument();
    expect(feeds.active.size).toBe(1);
    expect(callService).not.toHaveBeenCalled();
    view.unmount();
    renderWithRuntime(
      <CameraConsole
        id="camera.widget"
        settingsKey="home::camera"
        settings={settings}
        onClose={() => undefined}
      />,
      { ...runtime(), callService }
    );
    await flush();
    expect(feeds.active.size).toBe(1);
    expect(callService).not.toHaveBeenCalled();
    expect(screen.queryByText('Accesa')).toBeNull();
  });
  it('cambiare lente smonta il vecchio feed prima del nuovo, senza riciclare un URL fisso', async () => {
    const current = {
      ...settings,
      productDevice: { ...binding, channelEntityIds: ['camera.main', 'camera.other'] },
      cameraWebrtcUrl: '/player?src=main',
    };
    renderWithRuntime(details(current), {
      ...runtime(),
      entities: fixtureEntities([camera(), camera('idle', {}, 'camera.other')]),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Videocamera: Principale' }));
    fireEvent.click(screen.getByRole('button', { name: 'Secondaria' }));
    await flush();
    expect(feeds.removed).toContain('camera.main');
    expect([...feeds.active]).toEqual(['camera.other']);
    expect(feeds.peak).toBe(1);
    expect(feeds.cameras.at(-1)?.webrtcUrl).toBe('');
    expect(screen.getByTestId('camera-feed')).toHaveAttribute('data-camera', 'camera.other');
  });
  it.each(['off', 'unknown', 'unavailable'])('non avvia trasporti quando %s', (state) => {
    renderWithRuntime(home(), runtime(state));
    expect(feeds.active.size).toBe(0);
  });
  it('pausa configurata, editing e pagina fuori scena non montano il player', () => {
    const paused = renderWithRuntime(home({ ...settings, cameraPaused: true }), runtime());
    expect(feeds.active.size).toBe(0);
    paused.unmount();
    const editing = renderWithRuntime(home(settings, true), runtime());
    expect(feeds.active.size).toBe(0);
    editing.unmount();
    renderWithRuntime(
      <PageVisibilityContext.Provider value={false}>{home()}</PageVisibilityContext.Provider>,
      runtime()
    );
    expect(feeds.active.size).toBe(0);
  });
  it('disconnessione smonta il feed e riconnessione ne crea uno nuovo', () => {
    const view = renderWithRuntime(home(), runtime());
    expect(feeds.active.size).toBe(1);
    view.update({ conn: null });
    expect(feeds.active.size).toBe(0);
    view.update({ conn: fakeConnection().conn });
    expect(feeds.active.size).toBe(1);
    expect(feeds.removed).toContain('camera.main');
  });
  it('pagina coperta→visibile smonta e riattiva un unico trasporto', () => {
    function Visibility() {
      const [visible, setVisible] = useState(true);
      return (
        <>
          <button onClick={() => setVisible((value) => !value)}>Cambia scena</button>
          <PageVisibilityContext.Provider value={visible}>{home()}</PageVisibilityContext.Provider>
        </>
      );
    }
    renderWithRuntime(<Visibility />, runtime());
    expect(feeds.active.size).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: 'Cambia scena' }));
    expect(feeds.active.size).toBe(0);
    expect(feeds.removed).toContain('camera.main');
    fireEvent.click(screen.getByRole('button', { name: 'Cambia scena' }));
    expect(feeds.active.size).toBe(1);
    expect(feeds.peak).toBe(1);
  });
  it('non apre feed per camere tecniche e non espone token o URL nei dettagli', () => {
    const technical = 'camera.diagnostic';
    const current = {
      ...settings,
      productDevice: {
        ...binding,
        channelEntityIds: ['camera.main'],
        secondaryEntityIds: [technical],
        technicalEntityIds: [technical],
      },
    };
    const view = renderWithRuntime(details(current), {
      ...runtime(),
      entities: fixtureEntities([camera(), camera('idle', {}, technical)]),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tecnica e manutenzione' }));
    expect([...feeds.active]).toEqual(['camera.main']);
    expect(view.container.textContent).not.toContain('TRANSIENT_CAMERA_CAPABILITY');
    expect(view.container.innerHTML).not.toContain('access_token');
    expect(screen.queryByRole('button', { name: /Videocamera:/ })).toBeNull();
  });
  it('Riprendi/Pausa salva soltanto cameraPaused sul settingsKey corretto', () => {
    const saveCardSetting = vi.fn();
    renderWithRuntime(details(), { ...runtime(), saveCardSetting });
    fireEvent.click(screen.getByRole('button', { name: 'Pausa anteprima' }));
    expect(saveCardSetting).toHaveBeenCalledExactlyOnceWith('home::camera', 'cameraPaused', true);
  });
});

describe('Videocamera: comandi espliciti, capacità e privacy', () => {
  it('ON_OFF richiede bit1 e servizio; idle non diventa conferma di alimentazione', async () => {
    const callService = serviceMock();
    renderWithRuntime(controls(), { ...runtime(), callService });
    fireEvent.click(screen.getByRole('button', { name: 'Accendi Principale' }));
    await flush();
    expect(callService).toHaveBeenCalledExactlyOnceWith('camera', 'turn_on', {
      entity_id: 'camera.main',
    });
    expect(screen.getByRole('status')).toHaveTextContent('Home Assistant ha accettato il comando.');
    expect(screen.queryByText('Accesa')).toBeNull();
    expect(screen.queryByText('Confermato')).toBeNull();
  });
  it.each([0, 2, 4, -1])(
    'feature %s non autorizza power o il vecchio movimento bit4',
    (feature) => {
      renderWithRuntime(controls(), runtime('idle', { supported_features: feature }));
      expect(screen.queryByRole('button', { name: 'Accendi Principale' })).toBeNull();
      expect(screen.queryByText('Rilevamento movimento')).toBeNull();
    }
  );
  it('catalogo servizi negato non espone azioni alimentazione', () => {
    renderWithRuntime(controls(), { ...runtime(), services: {} });
    expect(screen.queryByRole('button', { name: 'Accendi Principale' })).toBeNull();
  });
  it('bool movimento→assente rimane sconosciuto, e resta possibile riabilitarlo esplicitamente', async () => {
    const callService = serviceMock();
    const view = renderWithRuntime(controls(), {
      ...runtime('idle', { motion_detection: true }),
      callService,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Disabilita movimento Principale' }));
    await flush();
    view.setEntities([camera('idle')]);
    expect(screen.getByText('Stato non disponibile')).toBeInTheDocument();
    expect(screen.queryByText('Disabilitato')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Abilita movimento Principale' }));
    await flush();
    expect(callService.mock.calls.map((call) => call[1])).toEqual([
      'disable_motion_detection',
      'enable_motion_detection',
    ]);
  });
  it('nessuna directory predefinita: foto/registrazione richiedono configurazione esplicita', () => {
    renderWithRuntime(controls(), runtime());
    expect(screen.queryByRole('button', { name: 'Scatta una foto Principale' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Registra un video Principale' })).toBeNull();
  });
  it('foto e video usano la cartella privata e soltanto la camera selezionata', async () => {
    const callService = serviceMock();
    renderWithRuntime(
      controls({ ...settings, cameraCaptureDirectory: '/media/aca', cameraRecordDuration: 75 }),
      { ...runtime(), callService }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Scatta una foto Principale' }));
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Registra un video Principale' }));
    await flush();
    expect(callService.mock.calls).toEqual([
      [
        'camera',
        'snapshot',
        {
          entity_id: 'camera.main',
          filename: expect.stringMatching(/^\/media\/aca\/camera_main-\d+\.jpg$/),
        },
      ],
      [
        'camera',
        'record',
        {
          entity_id: 'camera.main',
          filename: expect.stringMatching(/^\/media\/aca\/camera_main-\d+\.mp4$/),
          duration: 75,
          lookback: 0,
        },
      ],
    ]);
  });
  it('record/play_stream richiedono STREAM, mentre snapshot no', () => {
    renderWithRuntime(
      controls({ ...settings, cameraCaptureDirectory: '/media/aca' }),
      runtime('idle', { supported_features: 1 })
    );
    expect(screen.getByRole('button', { name: 'Scatta una foto Principale' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registra un video Principale' })).toBeNull();
  });
  it('cast è una scelta esplicita su un solo lettore configurato', async () => {
    const callService = serviceMock();
    renderWithRuntime(controls({ ...settings, cameraCastIds: ['media_player.screen'] }), {
      ...runtime(),
      callService,
      entities: fixtureEntities([
        camera(),
        fixtureEntity('media_player.screen', 'idle', { friendly_name: 'Schermo' }),
      ]),
    });
    expect(callService).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Invia lo stream di Principale:/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Schermo' }));
    await flush();
    expect(callService).toHaveBeenCalledExactlyOnceWith('camera', 'play_stream', {
      entity_id: 'camera.main',
      media_player: 'media_player.screen',
      format: 'hls',
    });
  });
  it('PTZ richiede opt-in, registro ONVIF del canale attivo e servizio', async () => {
    const conn = fakeConnection((message) =>
      message.type === 'config/entity_registry/list'
        ? [{ entity_id: 'camera.main', platform: 'onvif' }]
        : {}
    ).conn;
    const callService = serviceMock();
    renderWithRuntime(controls({ ...settings, cameraPtz: true }), {
      ...runtime(),
      conn,
      callService,
    });
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Ruota a sinistra Principale' }));
    await flush();
    expect(callService).toHaveBeenCalledExactlyOnceWith('onvif', 'ptz', {
      entity_id: 'camera.main',
      pan: 'LEFT',
      move_mode: 'RelativeMove',
      distance: 0.1,
      speed: 0.5,
    });
  });
  it('attributes.platform non può abilitare PTZ senza registro verificato', async () => {
    renderWithRuntime(
      controls({ ...settings, cameraPtz: true }),
      runtime('idle', { platform: 'onvif' })
    );
    await flush();
    expect(screen.queryByText('Orientamento')).toBeNull();
  });
  it('servizio negato mostra errore generico senza URL/token, e non ripete il comando', async () => {
    const callService = serviceMock(async () => {
      throw new Error('https://camera.example/live?token=TRANSIENT_CAMERA_CAPABILITY');
    });
    const view = renderWithRuntime(controls(), { ...runtime(), callService });
    fireEvent.click(screen.getByRole('button', { name: 'Accendi Principale' }));
    await flush();
    expect(screen.getByRole('status')).toHaveTextContent('Comando non riuscito');
    expect(view.container.textContent).not.toContain('TRANSIENT_CAMERA_CAPABILITY');
    expect(view.container.textContent).not.toContain('https://');
    expect(callService).toHaveBeenCalledTimes(1);
  });
  it('doppio click durante invio non duplica e la disconnessione impedisce nuove azioni', async () => {
    let finish!: () => void;
    const callService = serviceMock(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    const view = renderWithRuntime(controls(), { ...runtime(), callService });
    fireEvent.click(screen.getByRole('button', { name: 'Accendi Principale' }));
    fireEvent.click(screen.getByRole('button', { name: 'Accendi Principale' }));
    expect(callService).toHaveBeenCalledTimes(1);
    view.update({ conn: null });
    finish();
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Spegni Principale' }));
    expect(callService).toHaveBeenCalledTimes(1);
  });
  it('nuova preferenza nasconde solo i controlli generici e preserva i quattro extra Camera', () => {
    renderWithRuntime(
      <AdaptiveSettingsSection
        settings={{ ...settings, categoryWidgetType: 'camera' }}
        save={() => undefined}
        showControlPreferences={false}
      />,
      runtime()
    );
    expect(screen.queryByText('Controlli nella scheda')).toBeNull();
    expect(screen.getAllByLabelText('Cartella privata per foto e video').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('Durata registrazione in secondi').length).toBeGreaterThan(0);
    expect(
      screen.getByRole('switch', { name: 'Videocamera con PTZ ONVIF configurato' })
    ).toBeInTheDocument();
    expect(screen.getByText('Lettori per lo stream')).toBeInTheDocument();
  });
});
