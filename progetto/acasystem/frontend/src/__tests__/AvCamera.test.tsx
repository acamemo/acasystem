import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Connection, HassEntity } from 'home-assistant-js-websocket';
import type { WidgetRuntime } from '@/@types/launcher';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { CameraDetails, CameraWidget } from '@/components/widgets/media/widgets/Camera';

vi.mock('hls.js', () => ({ default: { isSupported: () => false } }));

const CAMERA = 'camera.ingresso';

beforeAll(() => {
  Object.defineProperties(window.HTMLMediaElement.prototype, {
    load: { configurable: true, value: vi.fn() },
    pause: { configurable: true, value: vi.fn() },
    play: { configurable: true, value: vi.fn(() => Promise.resolve()) },
  });
});

afterEach(() => vi.useRealTimers());

const camera = (state = 'idle', attributes: Record<string, unknown> = {}): HassEntity =>
  fixtureEntity(CAMERA, state, { friendly_name: 'Ingresso', access_token: 'tok', ...attributes });

function setup(entities: HassEntity[], overrides: Partial<WidgetRuntime> = {}) {
  const openDetails = vi.fn();
  const runtime = createFixtureRuntime({
    entities: fixtureEntities(entities),
    openDetails,
    ...overrides,
  });
  const wrap = (node: React.ReactNode) =>
    render(<WidgetRuntimeProvider value={runtime}>{node}</WidgetRuntimeProvider>);
  return { openDetails, wrap };
}

describe('Videocamera: widget con anteprima', () => {
  it('mostra l’istantanea dal proxy con il token e apre i dettagli', () => {
    const { wrap, openDetails } = setup([camera()]);
    const { container } = wrap(
      <CameraWidget
        id="camera_card_1"
        settingsKey="k"
        settings={{ cameraId: CAMERA }}
        size={{ w: 2, h: 2 }}
        editMode={false}
      />
    );
    const next = container.querySelector('img');
    expect(next?.getAttribute('src')).toMatch(
      /^http:\/\/ha\.local\/api\/camera_proxy\/camera\.ingresso\?token=tok&_ts=\d+$/
    );
    fireEvent.load(next as HTMLImageElement);
    expect(container.querySelector('[data-snapshot]')).toHaveAttribute('data-snapshot', 'image');
    expect(screen.getByText(/Aggiornata alle/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Ingresso/ }));
    expect(openDetails).toHaveBeenCalledWith('camera_card_1');
  });

  it('immagine rotta: messaggio e riprova, senza icona di immagine rotta', () => {
    const { wrap } = setup([camera()]);
    const { container } = wrap(
      <CameraWidget
        id="camera_card_1"
        settingsKey="k"
        settings={{ cameraId: CAMERA }}
        size={{ w: 2, h: 2 }}
        editMode={false}
      />
    );
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('Immagine non disponibile')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));
    expect(container.querySelector('img')).not.toBeNull();
  });

  it('aggiorna l’istantanea all’intervallo configurato', () => {
    vi.useFakeTimers();
    const { wrap } = setup([camera()]);
    const { container } = wrap(
      <CameraWidget
        id="camera_card_1"
        settingsKey="k"
        settings={{ cameraId: CAMERA, cameraRefreshInterval: 5 }}
        size={{ w: 2, h: 2 }}
        editMode={false}
      />
    );
    const first = container.querySelector('img')?.getAttribute('src');
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(container.querySelector('img')?.getAttribute('src')).not.toBe(first);
  });

  it('spenta o irraggiungibile: non disponibile', () => {
    const { wrap } = setup([camera('unavailable')]);
    wrap(
      <CameraWidget
        id="camera_card_1"
        settingsKey="k"
        settings={{ cameraId: CAMERA }}
        size={{ w: 2, h: 1 }}
        editMode={false}
      />
    );
    expect(screen.getByText('Non disponibile')).toBeInTheDocument();
  });

  it('movimento rilevato in modalità movimento', () => {
    const { wrap } = setup([camera(), fixtureEntity('binary_sensor.movimento', 'on')]);
    wrap(
      <CameraWidget
        id="camera_card_1"
        settingsKey="k"
        settings={{
          cameraId: CAMERA,
          cameraRefreshMode: 'motion',
          cameraMotionSensor: 'binary_sensor.movimento',
        }}
        size={{ w: 2, h: 2 }}
        editMode={false}
      />
    );
    expect(screen.getByText('Movimento rilevato')).toBeInTheDocument();
  });

  it('non configurata: messaggio chiaro', () => {
    const { wrap } = setup([]);
    wrap(
      <CameraWidget
        id="camera_card_1"
        settingsKey="k"
        settings={{}}
        size={{ w: 2, h: 2 }}
        editMode={false}
      />
    );
    expect(screen.getByText('Dispositivo non configurato')).toBeInTheDocument();
  });
});

describe('Videocamera: stream nei dettagli', () => {
  it('stream non disponibile: tutte le sorgenti falliscono, messaggio e riprova', async () => {
    const sendMessagePromise = vi.fn(async (message: { type: string }) => {
      if (message.type === 'camera/capabilities')
        return { frontend_stream_types: ['web_rtc', 'hls'] };
      if (message.type === 'auth/sign_path')
        return { path: '/api/camera_proxy/camera.ingresso?authSig=x' };
      throw new Error('stream non disponibile');
    });
    const conn = { sendMessagePromise } as unknown as Connection;
    const { wrap } = setup([camera('idle', { access_token: '' })], { conn });
    const { container } = wrap(
      <CameraDetails
        id="camera_card_1"
        settingsKey="k"
        settings={{ cameraId: CAMERA }}
        onClose={() => undefined}
      />
    );
    const feed = () => container.querySelector('[data-camera-source]');
    // WebRTC is not available in jsdom and the HLS request is rejected: the plan reaches the snapshot.
    await waitFor(() => expect(feed()).toHaveAttribute('data-camera-source', 'snapshot'));
    expect(sendMessagePromise).toHaveBeenCalledWith({
      type: 'camera/stream',
      entity_id: CAMERA,
      format: 'hls',
    });
    const snapshot = await waitFor(() => {
      const img = container.querySelector('.aca-media-feed img');
      expect(img).not.toBeNull();
      return img as HTMLImageElement;
    });
    expect(snapshot.getAttribute('src')).toMatch(/authSig=x&_ts=\d+$/);
    fireEvent.error(snapshot);
    expect(feed()).toHaveAttribute('data-camera-source', 'unavailable');
    expect(screen.getByText('Stream non disponibile')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));
    expect(feed()).not.toHaveAttribute('data-camera-source', 'unavailable');
  });

  it('vista istantanea: solo il proxy, senza tentativi di stream', async () => {
    const { wrap } = setup([camera()]);
    const { container } = wrap(
      <CameraDetails
        id="camera_card_1"
        settingsKey="k"
        settings={{ cameraId: CAMERA, cameraStreamEngine: 'snapshot' }}
        onClose={() => undefined}
      />
    );
    await waitFor(() =>
      expect(container.querySelector('[data-camera-source]')).toHaveAttribute(
        'data-camera-source',
        'snapshot'
      )
    );
    fireEvent.click(screen.getByRole('button', { name: 'Istantanea' }));
    expect(screen.getByRole('button', { name: 'Istantanea' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('videocamera spenta: lo dice prima del flusso', () => {
    const { wrap } = setup([camera('off')]);
    wrap(
      <CameraDetails
        id="camera_card_1"
        settingsKey="k"
        settings={{ cameraId: CAMERA }}
        onClose={() => undefined}
      />
    );
    expect(screen.getByText('La videocamera è spenta o non raggiungibile.')).toBeInTheDocument();
  });
});
