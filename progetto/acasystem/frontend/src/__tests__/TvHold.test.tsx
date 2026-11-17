import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { AndroidTvDetails } from '@/components/widgets/media/widgets/TvDetails';

/** The D-pad arrows and the channel buttons of the details repeat while they are held. */

const TV = 'media_player.ue50j6200_ue50j6200';
const REMOTE = 'remote.ue50j6200_ue50j6200';

function setup() {
  const callService = vi.fn(
    async (_domain: string, _service: string, _data?: Record<string, unknown>) => undefined
  );
  const runtime = createFixtureRuntime({
    entities: fixtureEntities([
      fixtureEntity(TV, 'on', {
        friendly_name: 'UE50J6200',
        supported_features: 24381,
        platform: 'samsungtv',
      }),
      fixtureEntity(REMOTE, 'on', {}),
    ]),
    callService,
  });
  render(
    <WidgetRuntimeProvider value={runtime}>
      <AndroidTvDetails
        id="androidtv_card_1"
        settingsKey="k"
        settings={{ mediaPlayerId: TV, remoteId: REMOTE }}
        onClose={vi.fn()}
      />
    </WidgetRuntimeProvider>
  );
  const sent = (command: string) =>
    callService.mock.calls.filter(
      ([domain, service, data]) =>
        domain === 'remote' &&
        service === 'send_command' &&
        (data as { command?: string }).command === command
    ).length;
  return { callService, sent };
}

const wait = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('TV remote: hold to repeat', () => {
  it('a tap on an arrow is one key', () => {
    const { sent } = setup();
    const up = screen.getByRole('button', { name: 'Su' });
    fireEvent.pointerDown(up);
    fireEvent.pointerUp(up);
    fireEvent.click(up);
    wait(1000);
    expect(sent('KEY_UP')).toBe(1);
  });

  it('holding an arrow for a second sends it five times, and stops on release', () => {
    const { sent } = setup();
    const left = screen.getByRole('button', { name: 'Sinistra' });
    fireEvent.pointerDown(left);
    wait(1000);
    expect(sent('KEY_LEFT')).toBe(5);
    fireEvent.pointerUp(left);
    wait(1000);
    expect(sent('KEY_LEFT')).toBe(5);
  });

  it('OK does not repeat', () => {
    const { sent } = setup();
    const ok = screen.getByRole('button', { name: 'OK' });
    fireEvent.pointerDown(ok);
    fireEvent.pointerUp(ok);
    fireEvent.click(ok);
    wait(1000);
    expect(sent('KEY_ENTER')).toBe(1);
  });

  it('holding «Canale +» repeats the channel key; a click is one channel', () => {
    const { sent } = setup();
    const more = screen.getByRole('button', { name: 'Canale +' });
    fireEvent.pointerDown(more);
    wait(1000);
    expect(sent('KEY_CHUP')).toBe(5);
    fireEvent.pointerCancel(more);
    wait(1000);
    expect(sent('KEY_CHUP')).toBe(5);
    fireEvent.click(screen.getByRole('button', { name: 'Canale −' }));
    expect(sent('KEY_CHDOWN')).toBe(1);
  });

  it('the volume buttons are unchanged: one step per click, no repeat', () => {
    const { callService } = setup();
    const louder = screen.getByRole('button', { name: 'Alza il volume' });
    fireEvent.pointerDown(louder);
    wait(1000);
    fireEvent.pointerUp(louder);
    expect(callService).not.toHaveBeenCalledWith('media_player', 'volume_up', expect.anything());
  });
});
