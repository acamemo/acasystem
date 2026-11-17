import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HassEntity } from 'home-assistant-js-websocket';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
vi.mock('@/api/apiAuth', () => ({
  getValidatedHomeAssistantRequestHeadersAsync: () =>
    Promise.resolve({ Authorization: 'Bearer test' }),
  getStoredAuthMethod: () => 'token',
  notifyHomeAssistantApiUnauthorized: () => undefined,
}));

import { resetBrandLogos } from '@/components/widgets/utilities/discover/useBrandLogo';
import { AndroidTvWidget } from '@/components/widgets/media/widgets/TvWidget';
import { AndroidTvConsole } from '@/components/widgets/media/widgets/TvConsole';
import { tvBrandDomains, tvCover } from '@/components/widgets/media/model/tv';

/** The brand logo of a TV replaces the generic TV icon: which logo, in which order, and the icon. */

const TV = 'media_player.tv_sala';
const SIZE_TILE = { w: 3, h: 2 };
const SIZE_ROW = { w: 3, h: 1 };

const tv = (extra: Record<string, unknown>): HassEntity =>
  fixtureEntity(TV, 'on', { friendly_name: 'TV sala', app_name: 'Netflix', ...extra });

function mountWidget(extra: Record<string, unknown>, size = SIZE_TILE) {
  const runtime = createFixtureRuntime({ entities: fixtureEntities([tv(extra)]) });
  return render(
    <WidgetRuntimeProvider value={runtime}>
      <AndroidTvWidget
        id="androidtv_card_1"
        settingsKey="k"
        settings={{ mediaPlayerId: TV }}
        size={size}
        editMode={false}
      />
    </WidgetRuntimeProvider>
  );
}

const logoUrl = (domain: string) => `./api/dispositivi/loghi/${domain}`;

describe('brand logo of a TV', () => {
  let originalCreate: typeof URL.createObjectURL;
  let originalRevoke: typeof URL.revokeObjectURL;
  let fetchMock: ReturnType<typeof stubLogos>;

  /** Home Assistant has the logos of `known` (domains); the others answer 404. */
  function stubLogos(known: string[]) {
    const mock = vi.fn(async (url: string, _init?: RequestInit) => {
      const domain = decodeURIComponent(url.split('/loghi/')[1]?.split('?')[0] ?? '');
      return known.includes(domain)
        ? { ok: true, status: 200, blob: async () => new Blob([domain], { type: 'image/png' }) }
        : { ok: false, status: 404, blob: async () => new Blob([]) };
    });
    vi.stubGlobal('fetch', mock);
    return mock;
  }
  const asked = () => fetchMock.mock.calls.map((call) => call[0]);

  beforeEach(() => {
    resetBrandLogos();
    document.documentElement.dataset.theme = 'light';
    originalCreate = URL.createObjectURL;
    originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn((blob: Blob) => `blob:logo-${blob.size}`);
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
    resetBrandLogos();
    delete document.documentElement.dataset.theme;
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    vi.unstubAllGlobals();
  });

  it.each(['webostv', 'samsungtv', 'apple_tv'])('%s: the logo of the integration', async (p) => {
    fetchMock = stubLogos([p]);
    const { container } = mountWidget({ platform: p, manufacturer: 'Altro' });
    await waitFor(() =>
      expect(container.querySelector('.aca-media-remote__head img.aca-media-brand')).not.toBeNull()
    );
    const image = container.querySelector('img.aca-media-brand');
    expect(image).toHaveAttribute('src', `blob:logo-${p.length}`);
    // The name is the text beside it: the image is decoration.
    expect(image).toHaveAttribute('alt', '');
    expect(asked()).toEqual([logoUrl(p)]);
  });

  it('asks the dark variant with the dark theme', async () => {
    document.documentElement.dataset.theme = 'dark';
    fetchMock = stubLogos(['webostv']);
    const { container } = mountWidget({ platform: 'webostv' });
    await waitFor(() => expect(container.querySelector('img.aca-media-brand')).not.toBeNull());
    expect(asked()).toEqual([`${logoUrl('webostv')}?tema=scuro`]);
  });

  it('a generic integration tries the maker first and shows its logo', async () => {
    fetchMock = stubLogos(['sony', 'androidtv_remote']);
    const { container } = mountWidget({ platform: 'androidtv_remote', manufacturer: 'Sony' });
    await waitFor(() => expect(container.querySelector('img.aca-media-brand')).not.toBeNull());
    expect(container.querySelector('img.aca-media-brand')).toHaveAttribute(
      'src',
      `blob:logo-${'sony'.length}`
    );
    // The integration's logo is not even asked when the maker has one.
    expect(asked()).toEqual([logoUrl('sony')]);
  });

  it('a generic integration falls back to its own logo when the maker has none', async () => {
    fetchMock = stubLogos(['cast']);
    const { container } = mountWidget({ platform: 'cast', manufacturer: 'Philips Electronics' });
    await waitFor(() => expect(container.querySelector('img.aca-media-brand')).not.toBeNull());
    expect(container.querySelector('img.aca-media-brand')).toHaveAttribute(
      'src',
      `blob:logo-${'cast'.length}`
    );
    expect(asked()).toEqual([logoUrl('philips'), logoUrl('cast')]);
  });

  it('keeps the TV icon when HA has no logo, and with no platform asks nothing', async () => {
    fetchMock = stubLogos([]);
    const none = mountWidget({ platform: 'cast', manufacturer: 'Philips' });
    await waitFor(() => expect(asked()).toEqual([logoUrl('philips'), logoUrl('cast')]));
    await act(async () => {
      await Promise.resolve();
    });
    expect(none.container.querySelector('img.aca-media-brand')).toBeNull();
    expect(none.container.querySelector('.aca-media-remote__head .aca-icon')).not.toBeNull();
    none.unmount();

    fetchMock.mockClear();
    const bare = mountWidget({ manufacturer: 'Sony' });
    await act(async () => {
      await Promise.resolve();
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(bare.container.querySelector('img.aca-media-brand')).toBeNull();
    expect(bare.container.querySelector('.aca-media-remote__head .aca-icon')).not.toBeNull();
  });

  it('the one-row tile and the console header show it too', async () => {
    fetchMock = stubLogos(['webostv']);
    const row = mountWidget({ platform: 'webostv', app_name: '' }, SIZE_ROW);
    await waitFor(() =>
      expect(row.container.querySelector('.aca-media-art img')).toHaveAttribute(
        'src',
        `blob:logo-${'webostv'.length}`
      )
    );
    // On the cover the logo is contained, not cropped.
    expect(row.container.querySelector('.aca-media-art img')).toHaveClass(
      'aca-media-art__img--contain'
    );
    row.unmount();

    const runtime = createFixtureRuntime({
      entities: fixtureEntities([tv({ platform: 'webostv' })]),
    });
    const consoleView = render(
      <WidgetRuntimeProvider value={runtime}>
        <AndroidTvConsole
          id="androidtv_card_1"
          settingsKey="k"
          settings={{ mediaPlayerId: TV }}
          onClose={() => undefined}
        />
      </WidgetRuntimeProvider>
    );
    await waitFor(() =>
      expect(consoleView.container.querySelector('img.aca-media-brand')).not.toBeNull()
    );
  });
});

describe('which logo to ask for', () => {
  const entity = (attributes: Record<string, unknown>) => tv(attributes);

  it('the integration for a branded platform, ignoring the maker', () => {
    expect(tvBrandDomains(entity({ platform: 'webostv', manufacturer: 'LG Electronics' }))).toEqual(
      {
        maker: '',
        platform: 'webostv',
      }
    );
  });

  it('the lower-cased first word of the maker for a generic platform', () => {
    expect(tvBrandDomains(entity({ platform: 'androidtv_remote', manufacturer: 'Sony' }))).toEqual({
      maker: 'sony',
      platform: 'androidtv_remote',
    });
    expect(tvBrandDomains(entity({ platform: 'cast', manufacturer: 'Google Inc.' }))).toEqual({
      maker: 'google',
      platform: 'cast',
    });
    expect(tvBrandDomains(entity({ platform: 'cast' }))).toEqual({ maker: '', platform: 'cast' });
  });

  it('nothing without a platform', () => {
    expect(tvBrandDomains(entity({ manufacturer: 'Sony' }))).toEqual({ maker: '', platform: '' });
    expect(tvBrandDomains(undefined)).toEqual({ maker: '', platform: '' });
  });
});

describe('cover order', () => {
  it('media picture, then app logo, then brand logo, then the icon', () => {
    expect(tvCover('pic', 'app', 'brand')).toEqual({ src: 'pic', fit: 'cover' });
    expect(tvCover(null, 'app', 'brand')).toEqual({ src: 'app', fit: 'contain' });
    expect(tvCover(null, null, 'brand')).toEqual({ src: 'brand', fit: 'contain' });
    expect(tvCover(null, null, null)).toEqual({ src: null, fit: 'contain' });
  });
});
