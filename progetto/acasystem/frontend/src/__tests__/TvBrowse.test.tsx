import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HassEntity } from 'home-assistant-js-websocket';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { AndroidTvDetails, AppleTvDetails } from '@/components/widgets/media/widgets/TvDetails';
import { AndroidTvConsole } from '@/components/widgets/media/widgets/TvConsole';
import { MEDIA_FEATURE } from '@/components/widgets/media/model/features';

/** «Scegli contenuto» of a TV (BROWSE_MEDIA) and the apps that browsing gives an Android TV. */

const TV = 'media_player.tv_salotto';
const POWER = MEDIA_FEATURE.TURN_ON | MEDIA_FEATURE.TURN_OFF;
const BROWSE = POWER | MEDIA_FEATURE.PLAY_MEDIA | MEDIA_FEATURE.BROWSE_MEDIA;

const node = (title: string, id: string, type: string, extra: Record<string, unknown> = {}) => ({
  title,
  media_content_id: id,
  media_content_type: type,
  can_play: false,
  can_expand: false,
  ...extra,
});

const APPLE_ROOT = node('Apple TV', '', 'library', {
  can_expand: true,
  children: [
    node('App', 'apps', 'apps', { can_expand: true }),
    node('Video', 'media-source://x/video', 'directory', { can_expand: true }),
  ],
});
const APPLE_APPS = node('App', 'apps', 'apps', {
  can_expand: true,
  children: [
    node('Netflix', 'com.netflix', 'app', { can_play: true }),
    node('YouTube', 'com.google.youtube', 'app', { can_play: true }),
  ],
});
const APPLE_VIDEO = node('Video', 'media-source://x/video', 'directory', {
  can_expand: true,
  children: [node('Documentario sul mare', 'x:doc', 'video', { can_play: true })],
});
const ANDROID_ROOT = node('Android TV', '', 'library', {
  can_expand: true,
  children: [
    node('Disney+', 'com.disney', 'app', { can_play: true }),
    node('Spotify', 'com.spotify', 'app', { can_play: true }),
  ],
});

const trees: Record<string, unknown> = {
  '': APPLE_ROOT,
  apps: APPLE_APPS,
  'media-source://x/video': APPLE_VIDEO,
};

function connection(root?: unknown, fail = false) {
  return {
    sendMessagePromise: vi.fn(async (message: Record<string, unknown>) => {
      if (fail) throw new Error('browse failed');
      const id = String(message.media_content_id ?? '');
      return root !== undefined && id === '' ? root : trees[id];
    }),
  };
}

const apple = (features: number, state = 'playing'): HassEntity =>
  fixtureEntity(TV, state, {
    friendly_name: 'Apple TV',
    supported_features: features,
    source_list: ['Netflix', 'YouTube'],
    platform: 'apple_tv',
  });

const android = (features: number): HassEntity =>
  fixtureEntity(TV, 'playing', {
    friendly_name: 'Android TV',
    supported_features: features,
    platform: 'androidtv_remote',
  });

function setup(
  entity: HassEntity,
  conn: unknown,
  Component: typeof AppleTvDetails = AppleTvDetails,
  callService = vi.fn(async () => undefined)
) {
  render(
    <WidgetRuntimeProvider
      value={createFixtureRuntime({
        entities: fixtureEntities([entity]),
        conn: conn as never,
        callService,
      })}
    >
      <Component
        id="tv_1"
        settingsKey="k"
        settings={{ mediaPlayerId: TV }}
        onClose={() => undefined}
      />
    </WidgetRuntimeProvider>
  );
  return callService;
}

const flush = () => act(async () => void (await Promise.resolve()));
const open = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Scegli contenuto' }));
  });
  await flush();
  await flush();
};

afterEach(cleanup);

describe('TV: scegli contenuto', () => {
  it('shows only for a TV that declares BROWSE_MEDIA and is on', () => {
    setup(apple(POWER), connection());
    expect(screen.queryByRole('button', { name: 'Scegli contenuto' })).toBeNull();
    cleanup();
    setup(apple(BROWSE, 'off'), connection());
    expect(screen.queryByRole('button', { name: 'Scegli contenuto' })).toBeNull();
    cleanup();
    setup(apple(BROWSE), connection());
    expect(screen.getByRole('button', { name: 'Scegli contenuto' })).toBeTruthy();
  });

  it('shows in the console as well', () => {
    setup(apple(BROWSE), connection(), AndroidTvConsole);
    expect(screen.getByRole('button', { name: 'Scegli contenuto' })).toBeTruthy();
  });

  it('does not list the apps again: they are in the «App» section', async () => {
    setup(apple(BROWSE), connection());
    await open();
    // One «Netflix» and one «YouTube» on the screen: the ones of the App section.
    expect(screen.getAllByRole('button', { name: 'Netflix' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'YouTube' })).toHaveLength(1);
  });

  it('plays an item with its own id and type', async () => {
    const callService = setup(apple(BROWSE), connection());
    await open();
    await act(async () => {
      fireEvent.click(screen.getByText('Libreria'));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Documentario sul mare/ }));
    });
    expect(callService).toHaveBeenCalledWith('media_player', 'play_media', {
      entity_id: TV,
      media_content_id: 'x:doc',
      media_content_type: 'video',
    });
  });
});

describe('Android TV remote: apps from browse', () => {
  it('uses the apps the TV lists instead of the fixed list, and opens them with their id', async () => {
    const callService = setup(android(BROWSE), connection(ANDROID_ROOT), AndroidTvDetails);
    await flush();
    await flush();
    expect(screen.getByRole('button', { name: 'Disney+' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Spotify' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Netflix' })).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Spotify' }));
    });
    expect(callService).toHaveBeenCalledWith('media_player', 'play_media', {
      entity_id: TV,
      media_content_type: 'app',
      media_content_id: 'com.spotify',
    });
  });

  it('keeps the fixed list when browse lists no app or fails', async () => {
    const empty = node('Android TV', '', 'library', { can_expand: true });
    setup(android(BROWSE), connection(empty), AndroidTvDetails);
    await flush();
    await flush();
    expect(screen.getByRole('button', { name: 'Netflix' })).toBeTruthy();
    cleanup();
    setup(android(BROWSE), connection(undefined, true), AndroidTvDetails);
    await flush();
    await flush();
    expect(screen.getByRole('button', { name: 'Netflix' })).toBeTruthy();
    cleanup();
    // Without BROWSE_MEDIA nothing is browsed at all.
    const conn = connection(ANDROID_ROOT);
    setup(android(POWER | MEDIA_FEATURE.PLAY_MEDIA), conn, AndroidTvDetails);
    await flush();
    expect(conn.sendMessagePromise).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Netflix' })).toBeTruthy();
  });
});
