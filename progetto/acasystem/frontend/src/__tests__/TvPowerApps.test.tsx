import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HassEntity } from 'home-assistant-js-websocket';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { AndroidTvWidget, AppleTvWidget } from '@/components/widgets/media/widgets/TvWidget';
import { AndroidTvDetails, AppleTvDetails } from '@/components/widgets/media/widgets/TvDetails';
import { MEDIA_FEATURE } from '@/components/widgets/media/model/features';

/**
 * REQ-18 (D1): an LG TV added from Acasystem has to be turned on and have its apps opened from
 * the Android TV widget. The widget shows what the entity declares it can do: the power button
 * with TURN_ON (128) while off or TURN_OFF (256) while on, and the apps with SELECT_SOURCE
 * (2048). An Android TV that declares nothing keeps showing neither, as before.
 */

const TV = 'media_player.lg_webos_tv';
const TURN_ON = 128;
const TURN_OFF = 256;
const SELECT_SOURCE = MEDIA_FEATURE.SELECT_SOURCE;

const tv = (state: string, attributes: Record<string, unknown> = {}): HassEntity =>
  fixtureEntity(TV, state, { friendly_name: 'TV sala', ...attributes });

function setup(entity: HassEntity) {
  const callService = vi.fn(async () => undefined);
  const runtime = createFixtureRuntime({ entities: fixtureEntities([entity]), callService });
  const wrap = (node: React.ReactNode) =>
    render(<WidgetRuntimeProvider value={runtime}>{node}</WidgetRuntimeProvider>);
  return { callService, wrap };
}

const widget = (
  <AndroidTvWidget
    id="androidtv_card_1"
    settingsKey="k"
    settings={{ mediaPlayerId: TV }}
    size={{ w: 2, h: 2 }}
    editMode={false}
  />
);
const details = (
  <AndroidTvDetails
    id="androidtv_card_1"
    settingsKey="k"
    settings={{ mediaPlayerId: TV }}
    onClose={() => undefined}
  />
);

afterEach(() => cleanup());

describe('Android TV: the power button follows what the entity declares', () => {
  it('off and able to turn on: «Accendi» calls turn_on', () => {
    const { callService, wrap } = setup(tv('off', { supported_features: TURN_ON | TURN_OFF }));
    wrap(widget);
    fireEvent.click(screen.getByRole('button', { name: 'Accendi' }));
    expect(callService).toHaveBeenCalledWith('media_player', 'turn_on', { entity_id: TV });
  });

  it('on and able to turn off: «Spegni» calls turn_off', () => {
    const { callService, wrap } = setup(tv('on', { supported_features: TURN_ON | TURN_OFF }));
    wrap(widget);
    fireEvent.click(screen.getByRole('button', { name: 'Spegni' }));
    expect(callService).toHaveBeenCalledWith('media_player', 'turn_off', { entity_id: TV });
  });

  it('off with TURN_OFF only (no power-on from off yet): the key stays, waiting, and calls nothing', () => {
    const { callService, wrap } = setup(tv('off', { supported_features: TURN_OFF }));
    wrap(widget);
    const power = screen.getByRole('button', { name: 'Accendi' });
    expect(power.className).toContain('aca-media-key--waiting');
    fireEvent.click(power);
    expect(callService).not.toHaveBeenCalled();
  });

  it('an Android TV that declares nothing and is off keeps the power key, waiting', () => {
    const { wrap } = setup(tv('off'));
    wrap(widget);
    expect(screen.getByRole('button', { name: 'Accendi' }).className).toContain(
      'aca-media-key--waiting'
    );
  });

  it('the Apple TV keeps its button whatever it declares', () => {
    const { wrap } = setup(tv('playing'));
    wrap(
      <AppleTvWidget
        id="appletv_card_1"
        settingsKey="k"
        settings={{ mediaPlayerId: TV }}
        size={{ w: 2, h: 2 }}
        editMode={false}
      />
    );
    expect(screen.getByRole('button', { name: 'Spegni' })).toBeInTheDocument();
  });

  it('shows the button in the details too, with no remote linked', () => {
    const { callService, wrap } = setup(tv('off', { supported_features: TURN_ON | TURN_OFF }));
    wrap(details);
    fireEvent.click(screen.getByRole('button', { name: 'Accendi' }));
    expect(callService).toHaveBeenCalledWith('media_player', 'turn_on', { entity_id: TV });
  });

  it('shows its single power key among the base keys, as the widget does', () => {
    const { wrap } = setup(tv('on'));
    wrap(details);
    expect(screen.getAllByRole('button', { name: /Accendi|Spegni/ })).toHaveLength(1);
  });
});

describe('Android TV: the apps follow SELECT_SOURCE', () => {
  const sources = ['Netflix', 'YouTube', 'HDMI 1'];

  it('lists apps and inputs apart and opens one with select_source', () => {
    const { callService, wrap } = setup(
      tv('on', { supported_features: SELECT_SOURCE | TURN_OFF, source_list: sources })
    );
    wrap(details);
    const apps = screen.getByRole('region', { name: 'App' });
    const inputs = screen.getByRole('region', { name: 'Ingressi' });
    expect(within(apps).getByRole('button', { name: 'Netflix' })).toBeInTheDocument();
    expect(within(apps).getByRole('button', { name: 'YouTube' })).toBeInTheDocument();
    expect(within(inputs).getByRole('button', { name: 'HDMI 1' })).toBeInTheDocument();
    expect(within(apps).queryByRole('button', { name: 'HDMI 1' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Netflix' }));
    expect(callService).toHaveBeenCalledWith('media_player', 'select_source', {
      entity_id: TV,
      source: 'Netflix',
    });
  });

  it('marks the app that is open', () => {
    const { wrap } = setup(
      tv('on', {
        supported_features: SELECT_SOURCE,
        source_list: sources,
        app_name: 'netflix',
      })
    );
    wrap(details);
    expect(screen.getByRole('button', { name: 'Netflix' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'YouTube' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('without SELECT_SOURCE there is no list, even if the entity has a source list', () => {
    const { wrap } = setup(tv('on', { supported_features: TURN_OFF, source_list: sources }));
    wrap(details);
    expect(screen.queryByRole('heading', { name: 'App' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Netflix' })).toBeNull();
  });

  it('with no declared features at all there is no list, as before', () => {
    const { wrap } = setup(tv('on', { source_list: sources }));
    wrap(details);
    expect(screen.queryByRole('heading', { name: 'App' })).toBeNull();
  });

  it('with SELECT_SOURCE but no sources there is no empty list', () => {
    const { wrap } = setup(tv('on', { supported_features: SELECT_SOURCE, source_list: [] }));
    wrap(details);
    expect(screen.queryByRole('heading', { name: 'App' })).toBeNull();
  });

  it('the Apple TV keeps its list whatever it declares', () => {
    const { wrap } = setup(tv('on', { source_list: sources }));
    wrap(
      <AppleTvDetails
        id="appletv_card_1"
        settingsKey="k"
        settings={{ mediaPlayerId: TV }}
        onClose={() => undefined}
      />
    );
    expect(screen.getByRole('heading', { name: 'App' })).toBeInTheDocument();
  });
});
