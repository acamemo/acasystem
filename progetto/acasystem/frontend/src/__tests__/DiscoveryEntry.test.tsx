/**
 * The ways in and out of «Dispositivi trovati» (REP-20261028-003): the flag of the first opening,
 * the entry among the widget types, the widget added with no sheet, and the logos of the brands.
 */
import { useState, type ReactNode } from 'react';
import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  headers: vi.fn(() => Promise.resolve({ Authorization: 'Bearer test' })),
  method: vi.fn(() => 'oauth'),
  unauthorized: vi.fn((message: string) => Object.assign(new Error(message), { status: 401 })),
}));

vi.mock('@/api/apiAuth', () => ({
  getValidatedHomeAssistantRequestHeadersAsync: auth.headers,
  getStoredAuthMethod: auth.method,
  notifyHomeAssistantApiUnauthorized: auth.unauthorized,
}));

import { BrandLogo } from '@/components/widgets/utilities/discover/BrandLogo';
import { resetBrandLogos } from '@/components/widgets/utilities/discover/useBrandLogo';
import { PageProvider } from '@/hooks/context/PageContext';
import {
  DISCOVERY_SEEN_KEY,
  discoverySeen,
  useDiscoveryScreen,
} from '@/hooks/launcher/useDiscoveryScreen';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { ADD_WIDGET_TYPES } from '@/templates/sheets/catalog';
import { AddWidgetSheet } from '@/templates/sheets';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete document.documentElement.dataset.theme;
});

describe('la prima apertura', () => {
  it('si apre da sola una volta, quando il launcher è pronto, e chiuderla la segna come vista', () => {
    const view = renderHook(({ ready }) => useDiscoveryScreen(ready), {
      initialProps: { ready: false },
    });
    expect(view.result.current.open).toBe(false);

    view.rerender({ ready: true });
    expect(view.result.current.open).toBe(true);
    // The search window belongs to this opening only.
    expect(view.result.current.first).toBe(true);
    expect(discoverySeen()).toBe(false);

    act(() => view.result.current.close());
    expect(view.result.current.open).toBe(false);
    expect(localStorage.getItem(DISCOVERY_SEEN_KEY)).toBe('1');
    expect(discoverySeen()).toBe(true);
  });

  it('non torna al successivo avvio, né quando il launcher si ripresenta pronto', () => {
    localStorage.setItem(DISCOVERY_SEEN_KEY, '1');
    const view = renderHook(({ ready }) => useDiscoveryScreen(ready), {
      initialProps: { ready: true },
    });
    expect(view.result.current.open).toBe(false);
    view.rerender({ ready: false });
    view.rerender({ ready: true });
    expect(view.result.current.open).toBe(false);
  });

  it('non si riapre da sola se ready cambia di nuovo dopo la chiusura', () => {
    const view = renderHook(({ ready }) => useDiscoveryScreen(ready), {
      initialProps: { ready: true },
    });
    expect(view.result.current.open).toBe(true);
    act(() => view.result.current.close());
    view.rerender({ ready: false });
    view.rerender({ ready: true });
    expect(view.result.current.open).toBe(false);
  });

  it('la voce dei tipi di widget la riapre quando si vuole, senza finestra di ricerca', () => {
    localStorage.setItem(DISCOVERY_SEEN_KEY, '1');
    const view = renderHook(() => useDiscoveryScreen(true));
    act(() => view.result.current.show());
    expect(view.result.current.open).toBe(true);
    expect(view.result.current.first).toBe(false);
  });
});

const entities = () =>
  fixtureEntities([
    fixtureEntity('light.studio', 'off', { friendly_name: 'Lampada studio' }),
    fixtureEntity('media_player.lg', 'off', { friendly_name: 'LG webOS TV' }),
  ]);

const wrap = (node: ReactNode) => (
  <PageProvider>
    <WidgetRuntimeProvider value={createFixtureRuntime({ entities: entities() })}>
      {node}
    </WidgetRuntimeProvider>
  </PageProvider>
);

describe('«Trova dispositivi» tra i tipi di widget', () => {
  it('è il primo tipo, con l’icona wifi, e la finta voce «Dispositivi trovati» non c’è più', () => {
    render(wrap(<AddWidgetSheet open onClose={vi.fn()} pageId="home" onAdded={vi.fn()} />));
    const types = screen.getByRole('group', { name: 'Tipi di widget' });
    const first = types.querySelector('[data-widget-type]');
    expect(first).toHaveAttribute('data-widget-type', 'rileva');
    expect(first).toHaveTextContent('Trova dispositivi');
    expect(first?.querySelector('svg')?.getAttribute('data-icon')).toBe('wifi');
    expect(ADD_WIDGET_TYPES[0]?.type).toBe('rileva');
    expect(screen.queryByRole('button', { name: 'Dispositivi trovati' })).toBeNull();
    expect(types.querySelector('[data-discovery-entry]')).toBeNull();
  });
});

/** The sheet as the launcher holds it: open until it asks to close, like after an add. */
function OwnedSheet({ onAdded }: { onAdded: (id: string) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <AddWidgetSheet
      open={open}
      onClose={() => setOpen(false)}
      pageId="home"
      onAdded={onAdded}
      autoAdd
      initialSelection={{ type: 'light', entityIds: ['light.studio'] }}
    />
  );
}

describe('«Aggiungi un widget» in modo automatico con un dispositivo', () => {
  it('con autoAdd aggiunge il widget senza mai mostrare il foglio', async () => {
    // A dialog that gets its `open` attribute is a sheet that was shown.
    const shown = vi.fn();
    const watcher = new MutationObserver((records) => {
      for (const record of records) {
        if (record.attributeName === 'open' && (record.target as Element).hasAttribute('open')) {
          shown();
        }
      }
    });
    watcher.observe(document.body, { subtree: true, attributes: true });
    const onAdded = vi.fn();
    render(wrap(<OwnedSheet onAdded={onAdded} />));

    await waitFor(() => expect(onAdded).toHaveBeenCalledWith('light.studio'));
    expect(onAdded).toHaveBeenCalledTimes(1);
    await act(async () => {
      await Promise.resolve();
    });
    watcher.disconnect();
    expect(shown).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('se la scelta non basta ad aggiungere, il foglio si mostra per finire a mano', async () => {
    const onAdded = vi.fn();
    render(
      wrap(
        <AddWidgetSheet
          open
          onClose={vi.fn()}
          pageId="home"
          onAdded={onAdded}
          autoAdd
          initialSelection={{ type: 'androidtv', entityIds: [] }}
        />
      )
    );
    expect(await screen.findByRole('dialog', { name: 'Aggiungi un widget' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aggiungi il widget' })).toBeDisabled();
    expect(onAdded).not.toHaveBeenCalled();
  });

  it('senza autoAdd il foglio resta visibile, come per «Rileva dispositivi»', async () => {
    render(
      wrap(
        <AddWidgetSheet
          open
          onClose={vi.fn()}
          pageId="home"
          onAdded={vi.fn()}
          initialSelection={{ type: 'light', entityIds: ['light.studio'] }}
        />
      )
    );
    expect(await screen.findByRole('dialog', { name: 'Aggiungi un widget' })).toBeInTheDocument();
  });
});

describe('i loghi delle marche', () => {
  let originalCreate: typeof URL.createObjectURL;
  let originalRevoke: typeof URL.revokeObjectURL;

  const answer = (known: Record<string, boolean>) =>
    vi.fn(async (url: string, _init?: RequestInit) => {
      const domain = decodeURIComponent(url.split('/loghi/')[1]?.split('?')[0] ?? '');
      return known[domain]
        ? { ok: true, status: 200, blob: async () => new Blob(['png'], { type: 'image/png' }) }
        : { ok: false, status: 404, blob: async () => new Blob([]) };
    });

  beforeEach(() => {
    resetBrandLogos();
    originalCreate = URL.createObjectURL;
    originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn((blob: Blob) => `blob:logo-${blob.size}`);
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    resetBrandLogos();
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });

  it('prende il logo da Acasystem con il token e lo mostra come immagine senza testo alternativo', async () => {
    const fetchMock = answer({ hue: true });
    vi.stubGlobal('fetch', fetchMock);
    const { container } = render(<BrandLogo handler="hue" family="light" />);

    await waitFor(() => expect(container.querySelector('img')).not.toBeNull());
    const image = container.querySelector('img');
    expect(image).toHaveAttribute('src', 'blob:logo-3');
    expect(image).toHaveAttribute('alt', '');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('./api/dispositivi/loghi/hue');
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: { Authorization: 'Bearer test' },
    });
  });

  it('con il tema scuro chiede la variante scura', async () => {
    document.documentElement.dataset.theme = 'dark';
    const fetchMock = answer({ hue: true });
    vi.stubGlobal('fetch', fetchMock);
    const { container } = render(<BrandLogo handler="hue" family="light" />);
    await waitFor(() => expect(container.querySelector('img')).not.toBeNull());
    expect(fetchMock.mock.calls[0]?.[0]).toBe('./api/dispositivi/loghi/hue?tema=scuro');
  });

  it('su un 404 usa l’icona della famiglia, e non lo richiede più (cache anche dei fallimenti)', async () => {
    const fetchMock = answer({});
    vi.stubGlobal('fetch', fetchMock);
    const first = render(<BrandLogo handler="acme" family="camera" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await act(async () => {
      await Promise.resolve();
    });
    expect(first.container.querySelector('img')).toBeNull();
    expect(first.container.querySelector('svg')?.getAttribute('data-icon')).toBe('camera');
    first.unmount();

    const second = render(<BrandLogo handler="acme" family="camera" />);
    expect(second.container.querySelector('svg')?.getAttribute('data-icon')).toBe('camera');
    await act(async () => {
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('senza famiglia l’icona è wifi, e una rete che cade non rompe nulla', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const { container } = render(<BrandLogo handler="acme" family={null} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.querySelector('svg')?.getAttribute('data-icon')).toBe('wifi');
  });
});
