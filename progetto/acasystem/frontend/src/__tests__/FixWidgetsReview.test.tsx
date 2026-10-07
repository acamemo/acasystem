import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LockWidget } from '@/components/widgets/controls/lock/LockWidget';
import { FanWidget } from '@/components/widgets/controls/fan/FanWidget';
import { WidgetMissing } from '@/components/widgets/controls/shared/WidgetContent';
import { CameraDetails } from '@/components/widgets/media/widgets/Camera';
import { testi } from '@/components/widgets/media/testi';
import { utilityWidgets } from '@/components/widgets/utilities';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, flush, renderWithRuntime, serviceMock } from './ControlsHarness';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const lock = (state: string) =>
  fixtureEntity('lock.porta', state, {
    friendly_name: 'Porta',
    supported_features: 1,
  });

describe('PAR-4: conferma della serratura con funzione di apertura', () => {
  it.each(['open', 'opening', 'unlocked'])(
    'da bloccata conferma lo stato %s senza falso timeout',
    async (state) => {
      vi.useFakeTimers();
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
      view.setEntities([lock(state)]);
      await flush();
      act(() => vi.advanceTimersByTime(30_500));
      expect(screen.queryByText('Nessuna conferma da Home Assistant')).not.toBeInTheDocument();
      expect(screen.queryByText('In attesa…')).not.toBeInTheDocument();
    }
  );

  it('non conferma un’apertura iniziata con la serratura già sbloccata senza cambiamento di stato', async () => {
    vi.useFakeTimers();
    renderWithRuntime(
      <LockWidget
        id="lock.porta"
        settingsKey="k"
        settings={{}}
        size={{ w: 2, h: 2 }}
        editMode={false}
      />,
      { entities: fixtureEntities([lock('unlocked')]), conn: fakeConnection().conn }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Apri: Porta' }));
    await flush();
    act(() => vi.advanceTimersByTime(30_500));
    expect(screen.getByText('Nessuna conferma da Home Assistant')).toBeInTheDocument();
  });
});

describe('DES-3/9/10: contenuto leggibile e dimensioni utili', () => {
  it('il dispositivo mancante 1×1 usa una spiegazione breve', () => {
    render(<WidgetMissing size={{ w: 1, h: 1 }} name="Sensore" editMode={false} />);
    expect(screen.getByText('Non trovato')).toBeInTheDocument();
  });

  it.each([
    ['auto', 'Automatico'],
    ['sleep', 'Notte'],
    ['normal', 'Normale'],
    ['eco', 'Risparmio'],
    ['custom quiet', 'Custom quiet'],
  ])('il preset %s diventa %s senza cambiare il comando HA', (preset, label) => {
    renderWithRuntime(
      <FanWidget
        id="fan.sala"
        settingsKey="k"
        settings={{}}
        size={{ w: 2, h: 1 }}
        editMode={false}
      />,
      {
        entities: fixtureEntities([
          fixtureEntity('fan.sala', 'on', {
            friendly_name: 'Ventilatore',
            supported_features: 8 | 16 | 32,
            preset_mode: preset,
            preset_modes: [preset],
          }),
        ]),
      }
    );
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('Sonos usa il singolare per un unico lettore', () => {
    expect(testi.lettoriAttivi(1)).toBe('1 lettore');
    expect(testi.lettoriAttivi(2)).toBe('2 lettori');
  });

  it.each(['cost', 'car', 'room'])(
    '%s non offre più una taglia priva di informazioni aggiuntive',
    (type) => {
      expect(utilityWidgets.find((widget) => widget.type === type)?.sizes.max).toEqual({
        w: 2,
        h: 2,
      });
    }
  );
});

const customSettings = {
  cameraId: 'camera.ingresso',
  cameraStreamEngine: 'go2rtc',
  cameraWebrtcUrl: 'http://player.local/stream.html?src={entity_id}',
};

async function customCamera() {
  const view = renderWithRuntime(
    <CameraDetails
      id="camera_card_1"
      settingsKey="k"
      settings={customSettings}
      onClose={() => undefined}
    />,
    {
      entities: fixtureEntities([
        fixtureEntity('camera.ingresso', 'idle', { access_token: 'fixture' }),
      ]),
    }
  );
  await flush();
  expect(view.container.querySelector('[data-camera-source]')).toHaveAttribute(
    'data-camera-source',
    'custom'
  );
  return view;
}

function policyViolation(
  blockedURI: string,
  effectiveDirective = 'frame-src',
  disposition = 'enforce'
) {
  const event = new Event('securitypolicyviolation');
  Object.defineProperties(event, {
    blockedURI: { value: blockedURI },
    effectiveDirective: { value: effectiveDirective },
    disposition: { value: disposition },
  });
  fireEvent(document, event);
}

describe('SEC-3: un iframe bloccato passa alla fonte successiva senza allargare la CSP', () => {
  it('ignora violazioni estranee e in sola segnalazione, poi passa a MJPEG per quella del player', async () => {
    const view = await customCamera();
    const feed = () => view.container.querySelector('[data-camera-source]');
    policyViolation('http://other.local/');
    policyViolation('http://player.local/', 'img-src');
    policyViolation('http://player.local/', 'frame-src', 'report');
    expect(feed()).toHaveAttribute('data-camera-source', 'custom');
    policyViolation('http://player.local/');
    expect(feed()).toHaveAttribute('data-camera-source', 'mjpeg');
    expect(view.container.querySelector('iframe')).not.toBeInTheDocument();
  });

  it('un lettore cross-origin caricato senza violazioni resta, anche dopo il timeout', async () => {
    vi.useFakeTimers();
    const view = await customCamera();
    fireEvent.load(view.container.querySelector('iframe') as HTMLIFrameElement);
    // Assestamento di 1 s senza violazioni: il lettore è pronto e il timeout non lo sostituisce.
    act(() => vi.advanceTimersByTime(1_000));
    act(() => vi.advanceTimersByTime(30_000));
    expect(view.container.querySelector('[data-camera-source]')).toHaveAttribute(
      'data-camera-source',
      'custom'
    );
  });
});
