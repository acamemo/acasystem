import { useState, type ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

import type { Connection, EntityMap } from '@/@types/ha';
import type { LauncherLayout } from '@/@types/launcher';
import { PageProvider } from '@/hooks/context/PageContext';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { AddWidgetSheet } from '@/templates/sheets';
import { CategoryBindingSection } from '@/templates/sheets/CategoryBindingSection';
import { LAUNCHER_LAYOUT_STORAGE_KEY } from '@/utils/launcher/storage';
import {
  TV_ENTITY,
  TV_HOST,
  createdDto,
  entryDto,
  installFakeDevices,
  pairingForm,
  type FakeDevices,
} from './devicesFakeServer';

/**
 * The two ways into «Aggiungi un dispositivo» (REQ-18, D-D2): «Collega» of the Android TV widget
 * and «Aggiungi un widget» → Android TV. The row is offered to that widget only; the flow lives in
 * the same sheet, with no second dialog; at its end the new TV is the one linked or selected.
 */

let fake: FakeDevices;

const ADD_ROW = 'Aggiungi un dispositivo';
const tvEntity = () => fixtureEntity(TV_ENTITY, 'off', { friendly_name: 'LG webOS TV' });
const otherTv = () => fixtureEntity('media_player.salotto', 'idle', { friendly_name: 'Salotto' });

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

/** Drives the flow from the catalogue to «Fine»: the entry is created with no name or power step. */
async function addTvToTheEnd() {
  let answers = 0;
  fake.on('POST /flussi/:id', () => {
    answers += 1;
    return {
      body: answers === 1 ? pairingForm() : createdDto(entryDto({ device: null, power: null })),
    };
  });
  fireEvent.click(await screen.findByRole('button', { name: 'Aggiungi: Televisore LG (webOS)' }));
  fireEvent.change(await screen.findByLabelText('Indirizzo del televisore'), {
    target: { value: TV_HOST },
  });
  click('Avanti');
  await screen.findByText(/Hai 10 secondi per premere OK/);
  click('Avanti');
}

beforeEach(() => {
  auth.headers.mockClear();
  fake = installFakeDevices();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('«Collega» of the Android TV widget', () => {
  const section = (entities: EntityMap, save = vi.fn(), type = 'androidtv', loaded = true) => {
    const runtime = createFixtureRuntime({ entities, entitiesLoaded: loaded });
    const view = render(
      <WidgetRuntimeProvider value={runtime}>
        <CategoryBindingSection settings={{ categoryWidgetType: type }} save={save} />
      </WidgetRuntimeProvider>
    );
    return { ...view, save, runtime };
  };

  it('without a media player in Home Assistant says so and offers the row, with no sample', () => {
    section(fixtureEntities([fixtureEntity('light.sala', 'off', { friendly_name: 'Sala' })]));
    expect(screen.getByText('Nessun televisore in Home Assistant.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: new RegExp(ADD_ROW) })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Dispositivo da collegare/ })).toBeNull();
    expect(document.body.textContent).not.toMatch(/esempio/i);
  });

  it('with media players keeps the list and puts the row after it', () => {
    section(fixtureEntities([otherTv()]));
    const list = screen.getByRole('button', { name: 'Dispositivo da collegare: Non collegato' });
    const row = screen.getByRole('button', { name: new RegExp(ADD_ROW) });
    expect(screen.queryByText('Nessun televisore in Home Assistant.')).toBeNull();
    expect(list.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('does not say the TV is missing while the devices are still loading', () => {
    section(fixtureEntities([]), vi.fn(), 'androidtv', false);
    expect(screen.queryByText('Nessun televisore in Home Assistant.')).toBeNull();
    expect(screen.getByText('Attendo i dispositivi di Home Assistant.')).toBeInTheDocument();
  });

  it('is offered to the Android TV only: not to the Apple TV, the light or the room', () => {
    for (const type of ['appletv', 'light', 'media', 'climate']) {
      const { unmount } = section(fixtureEntities([otherTv()]), vi.fn(), type);
      expect(screen.queryByRole('button', { name: new RegExp(ADD_ROW) }), type).toBeNull();
      unmount();
    }
  });

  it('draws the flow in place of the list, and «Esci» goes back to the list without linking', async () => {
    const { save } = section(fixtureEntities([otherTv()]));
    click(new RegExp(ADD_ROW));
    expect(await screen.findByText('Consigliati per questo widget')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Dispositivo da collegare/ })).toBeNull();
    expect(document.querySelectorAll('dialog')).toHaveLength(0);
    click('Esci');
    expect(
      await screen.findByRole('button', { name: 'Dispositivo da collegare: Non collegato' })
    ).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });

  it('links the new TV once, when its entity reaches the live data', async () => {
    const save = vi.fn();
    function Host() {
      const [entities, setEntities] = useState<EntityMap>(fixtureEntities([otherTv()]));
      return (
        <WidgetRuntimeProvider value={createFixtureRuntime({ entities })}>
          <button
            type="button"
            onClick={() => setEntities(fixtureEntities([otherTv(), tvEntity()]))}
          >
            Arriva dal vivo
          </button>
          <CategoryBindingSection settings={{ categoryWidgetType: 'androidtv' }} save={save} />
        </WidgetRuntimeProvider>
      );
    }
    render(<Host />);
    click(new RegExp(ADD_ROW));
    await addTvToTheEnd();

    // The entry exists in Home Assistant, but its entity is not in the live data yet.
    const done = await screen.findByRole('button', { name: 'Fine' });
    expect(screen.getByText('Il televisore sta comparendo…')).toBeInTheDocument();
    fireEvent.click(done);
    expect(save).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Arriva dal vivo' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Fine' })).not.toHaveAttribute('aria-busy')
    );
    click('Fine');
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('mediaPlayerId', TV_ENTITY);
    // The flow is closed and the list is back.
    expect(
      await screen.findByRole('button', { name: /Dispositivo da collegare/ })
    ).toBeInTheDocument();
  });

  it('after fifteen seconds without the entity it links anyway, and says it will show up', async () => {
    // The clock runs on its own, so the requests and the waits of the test still go through.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const save = vi.fn();
    section(fixtureEntities([otherTv()]), save);
    click(new RegExp(ADD_ROW));
    await addTvToTheEnd();
    await screen.findByRole('button', { name: 'Fine' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(await screen.findByText('Comparirà tra pochi secondi.')).toBeInTheDocument();
    click('Fine');
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('mediaPlayerId', TV_ENTITY);
  });
});

describe('«Aggiungi un widget»', () => {
  const layout = {
    version: 1,
    categoryDefaultsVersion: 1,
    cover: { enabled: false },
    pages: [{ id: 'home', label: 'home', kind: 'widgets', placements: { tablet: {} } }],
  } as unknown as LauncherLayout;

  const wrap = (node: ReactNode, entities: EntityMap) => (
    <PageProvider>
      <WidgetRuntimeProvider
        value={createFixtureRuntime({ entities, conn: {} as unknown as Connection })}
      >
        {node}
      </WidgetRuntimeProvider>
    </PageProvider>
  );

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    localStorage.setItem(
      'tunet_pages_config',
      JSON.stringify({ header: [], pages: ['home'], home: [] })
    );
  });

  const open = (entities: EntityMap = fixtureEntities([tvEntity(), otherTv()])) => {
    const onAdded = vi.fn();
    const onClose = vi.fn();
    const view = render(
      wrap(<AddWidgetSheet open onClose={onClose} pageId="home" onAdded={onAdded} />, entities)
    );
    return { ...view, onAdded, onClose };
  };

  const chooseType = (type: string) =>
    fireEvent.click(document.querySelector<HTMLElement>(`[data-widget-type="${type}"]`)!);

  it('offers the row in the Android TV details, not in the Apple TV, light or room ones', () => {
    open();
    for (const type of ['appletv', 'light', 'media', 'sensor']) {
      chooseType(type);
      expect(screen.queryByRole('button', { name: new RegExp(ADD_ROW) }), type).toBeNull();
      click('Indietro');
    }
    chooseType('androidtv');
    expect(screen.getByRole('button', { name: new RegExp(ADD_ROW) })).toBeInTheDocument();
    // After the media player list, where the new TV would be.
    const list = screen.getByRole('group', { name: 'Lettore multimediale, obbligatorio' });
    const row = screen.getByRole('button', { name: new RegExp(ADD_ROW) });
    expect(list.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('draws the flow inside the same sheet, with its own buttons and no second dialog', async () => {
    open();
    chooseType('androidtv');
    click(new RegExp(ADD_ROW));
    expect(await screen.findByText('Consigliati per questo widget')).toBeInTheDocument();
    expect(document.querySelectorAll('dialog')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Aggiungi il widget' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Indietro' })).toBeNull();
    expect(
      screen.getByText('Aggiungi il dispositivo a Home Assistant, poi collegalo al widget.')
    ).toBeInTheDocument();
  });

  it('«Esci» goes back to the details with nothing selected', async () => {
    open();
    chooseType('androidtv');
    click(new RegExp(ADD_ROW));
    await screen.findByText('Consigliati per questo widget');
    click('Esci');
    const add = await screen.findByRole('button', { name: 'Aggiungi il widget' });
    expect(add).toBeDisabled();
  });

  it('at the end the new TV is selected and «Aggiungi il widget» is ready', async () => {
    const { onAdded } = open();
    chooseType('androidtv');
    click(new RegExp(ADD_ROW));
    await addTvToTheEnd();
    await screen.findByRole('button', { name: 'Fine' });
    click('Fine');

    const row = await screen.findByRole('button', { name: /LG webOS TV/ });
    expect(row).toHaveAttribute('aria-pressed', 'true');
    const add = screen.getByRole('button', { name: 'Aggiungi il widget' });
    expect(add).toBeEnabled();
    fireEvent.click(add);
    await waitFor(() => expect(onAdded).toHaveBeenCalledTimes(1));
    const cards = JSON.parse(localStorage.getItem('tunet_card_settings') ?? '{}') as Record<
      string,
      Record<string, unknown>
    >;
    const added = Object.values(cards).find((settings) => settings.mediaPlayerId === TV_ENTITY);
    expect(added).toBeDefined();
  });

  it('a sheet closed in the middle of the flow cancels the flow in the server', async () => {
    const view = open();
    chooseType('androidtv');
    click(new RegExp(ADD_ROW));
    fireEvent.click(await screen.findByRole('button', { name: 'Aggiungi: Televisore LG (webOS)' }));
    await screen.findByLabelText('Indirizzo del televisore');
    view.unmount();
    await waitFor(() => expect(fake.callsTo('DELETE /flussi/flow1')).toHaveLength(1));
  });
});
