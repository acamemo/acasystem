import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { HassEntity } from 'home-assistant-js-websocket';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { CameraConsole } from '@/components/widgets/media/widgets/CameraConsole';
import { mediaWidgets } from '@/components/widgets/media';

vi.mock('hls.js', () => ({ default: { isSupported: () => false } }));

/** The camera console: the video in its own column, info and controls in the other. */

const CAMERA = 'camera.ingresso';

beforeAll(() => {
  Object.defineProperties(window.HTMLMediaElement.prototype, {
    load: { configurable: true, value: vi.fn() },
    pause: { configurable: true, value: vi.fn() },
    play: { configurable: true, value: vi.fn(() => Promise.resolve()) },
  });
});

afterEach(() => cleanup());

const camera = (state = 'idle'): HassEntity =>
  fixtureEntity(CAMERA, state, { friendly_name: 'Ingresso', access_token: 'tok' });

function setup(entities: HassEntity[], settings: Record<string, unknown> = { cameraId: CAMERA }) {
  const runtime = createFixtureRuntime({ entities: fixtureEntities(entities) });
  render(
    <WidgetRuntimeProvider value={runtime}>
      <CameraConsole
        id="camera_card_1"
        settingsKey="k"
        settings={settings}
        onClose={() => undefined}
      />
    </WidgetRuntimeProvider>
  );
  const [main, side] = Array.from(document.querySelectorAll<HTMLElement>('.aca-console-column'));
  return { main: main && within(main), side: side && within(side) };
}

describe('Camera console', () => {
  it('is registered on the camera definition, next to the sheet', () => {
    const definition = mediaWidgets.find((candidate) => candidate.type === 'camera');
    expect(definition?.Console).toBeDefined();
    expect(definition?.Details).toBeDefined();
  });

  it('puts the video on the left and the info and controls on the right', () => {
    const { main, side } = setup([camera()]);
    expect(document.querySelectorAll('.aca-media-feed')).toHaveLength(1);
    expect(main.getByRole('region', { name: 'Ingresso' })).toBeInTheDocument();
    expect(document.querySelector('.aca-console-column .aca-media-feed')).not.toBeNull();
    expect(side.queryByRole('region', { name: 'Ingresso' })).toBeNull();
    expect(side.getByText(CAMERA)).toBeInTheDocument();
    expect(side.getByRole('button', { name: 'Aggiorna' })).toBeInTheDocument();
  });

  it('switches to the snapshot view from the right column', () => {
    const { main, side } = setup([camera()]);
    expect(main.getByRole('status')).toBeInTheDocument();
    fireEvent.click(side.getByText('Istantanea'));
    expect(document.querySelector('[data-camera-source]')).not.toBeNull();
  });

  it('says the camera is not there when it is not configured', () => {
    setup([], {});
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(document.querySelector('.aca-console-column')).toBeNull();
  });
});
