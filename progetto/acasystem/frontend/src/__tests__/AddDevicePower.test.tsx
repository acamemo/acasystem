import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime } from '@/utils/fixtures/runtime';
import { PowerStep } from '@/templates/devices/PowerStep';
import {
  TV_ENTITY,
  TV_HOST,
  errorReply,
  installFakeDevices,
  type FakeDevices,
} from './devicesFakeServer';

/**
 * The power-on step (D1e, D-D5): anyone only asks for it and the server finds the MAC; when Home
 * Assistant does not know it the field «Indirizzo MAC della TV» appears, and the broadcast address
 * and port are under «Avanzate». The MAC is never shown again and never kept; the test of the TV
 * asks first.
 */

let fake: FakeDevices;
const onFinished = vi.fn();
const callService = vi.fn(async () => undefined);

const MAC = '02:00:00:00:00:01';
const WORKS = { entryId: 'entry1', configured: true, active: true, message: null };

function mount(props: { typedHost?: string | null } = {}) {
  return render(
    <WidgetRuntimeProvider value={createFixtureRuntime({ callService })}>
      <PowerStep
        entryId="entry1"
        mediaPlayerEntityId={TV_ENTITY}
        typedHost={props.typedHost ?? TV_HOST}
        onFinished={onFinished}
      />
    </WidgetRuntimeProvider>
  );
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const power = () => fake.callsTo('POST /accensione/entry1');

beforeEach(() => {
  fake = installFakeDevices();
  onFinished.mockClear();
  callService.mockClear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the person', () => {
  it('sees the guide and no field for the MAC, and sends an empty body', async () => {
    fake.on('POST /accensione/:id', () => ({ body: WORKS }));
    mount();
    expect(screen.getByText(/sul televisore attiva l’accensione via rete/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Indirizzo MAC della TV')).toBeNull();
    click('Attiva l’accensione');
    expect(await screen.findByText('Accensione: funziona')).toBeInTheDocument();
    expect(power()).toHaveLength(1);
    expect(power()[0]?.body).toEqual({});
  });

  it('gets the field «Indirizzo MAC della TV» when Home Assistant does not know the MAC', async () => {
    let answers = 0;
    fake.on('POST /accensione/:id', () => {
      answers += 1;
      return answers === 1
        ? errorReply(409, 'MAC_REQUIRED', 'Per accendere il televisore serve il suo indirizzo MAC.')
        : { body: WORKS };
    });
    mount();
    click('Attiva l’accensione');
    expect(await screen.findByRole('alert')).toHaveTextContent('Scrivi qui l’indirizzo MAC');
    const field = screen.getByLabelText('Indirizzo MAC della TV');
    expect(
      screen.getByText('Sulla TV: Impostazioni › Rete › Stato della rete.')
    ).toBeInTheDocument();

    // Empty and wrong values are stopped before the server.
    click('Attiva l’accensione');
    expect(await screen.findByText('Compila questo campo.')).toBeInTheDocument();
    fireEvent.change(field, { target: { value: '02:00:00:00:00' } });
    click('Attiva l’accensione');
    expect(await screen.findByText(/L’indirizzo MAC non è valido/)).toBeInTheDocument();
    expect(power()).toHaveLength(1);

    // Dashes, no separators and lower case are accepted and sent as AA:BB:CC:DD:EE:FF.
    fireEvent.change(field, { target: { value: 'a0-b1-c2-d3-e4-f6' } });
    click('Attiva l’accensione');
    expect(await screen.findByText('Accensione: funziona')).toBeInTheDocument();
    expect(power()).toHaveLength(2);
    expect(power()[1]?.body).toEqual({ mac: 'A0:B1:C2:D3:E4:F6' });
    expect(document.body.textContent).not.toContain('A0:B1:C2:D3:E4:F6');
  });

  it('can go on without the MAC', async () => {
    fake.on('POST /accensione/:id', () => errorReply(409, 'MAC_REQUIRED', 'Serve il MAC.'));
    mount();
    click('Attiva l’accensione');
    await screen.findByLabelText('Indirizzo MAC della TV');
    click('Salta');
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('a TV that is not ready yet (409) can be tried again', async () => {
    let answers = 0;
    fake.on('POST /accensione/:id', () => {
      answers += 1;
      return answers === 1
        ? errorReply(
            409,
            'ENTRY_NOT_READY',
            'Il dispositivo non è ancora pronto. Riprova tra qualche secondo.'
          )
        : { body: WORKS };
    });
    mount();
    click('Attiva l’accensione');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Il dispositivo non è ancora pronto.'
    );
    click('Riprova');
    expect(await screen.findByText('Accensione: funziona')).toBeInTheDocument();
    expect(power()).toHaveLength(2);
  });

  it('a power-on that is not active says so with the words of the server', async () => {
    fake.on('POST /accensione/:id', () => ({
      body: { ...WORKS, active: false, message: 'L’accensione da spento non è attiva.' },
    }));
    mount();
    click('Attiva l’accensione');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'L’accensione da spento non è attiva.'
    );
    // No test of the TV when there is nothing to test.
    expect(screen.queryByRole('button', { name: 'Prova ad accendere' })).toBeNull();
  });
});

describe('the test of the TV', () => {
  it('asks before it sends the command, and does nothing if the person says no', async () => {
    fake.on('POST /accensione/:id', () => ({ body: WORKS }));
    mount();
    click('Attiva l’accensione');
    await screen.findByText('Accensione: funziona');
    click('Prova ad accendere');
    expect(
      screen.getByText('Il televisore riceverà un comando di accensione.')
    ).toBeInTheDocument();
    expect(callService).not.toHaveBeenCalled();
    click('Annulla');
    expect(callService).not.toHaveBeenCalled();
    expect(screen.queryByText('Il televisore riceverà un comando di accensione.')).toBeNull();
  });

  it('sends turn_on to the media player only after the confirmation', async () => {
    fake.on('POST /accensione/:id', () => ({ body: WORKS }));
    mount();
    click('Attiva l’accensione');
    await screen.findByText('Accensione: funziona');
    click('Prova ad accendere');
    click('Accendi');
    await waitFor(() => expect(callService).toHaveBeenCalledTimes(1));
    expect(callService).toHaveBeenCalledWith('media_player', 'turn_on', { entity_id: TV_ENTITY });
    expect(await screen.findByText(/Comando inviato/)).toBeInTheDocument();
  });

  it('says so when the command fails', async () => {
    fake.on('POST /accensione/:id', () => ({ body: WORKS }));
    callService.mockRejectedValueOnce(new Error('boom'));
    mount();
    click('Attiva l’accensione');
    await screen.findByText('Accensione: funziona');
    click('Prova ad accendere');
    click('Accendi');
    expect(await screen.findByText('Il comando non è riuscito. Riprova.')).toBeInTheDocument();
  });
});

describe('under «Avanzate»', () => {
  it('writes the MAC, which is checked before it is sent', async () => {
    fake.on('POST /accensione/:id', () => ({ body: WORKS }));
    mount();
    click('Avanzate');
    const field = screen.getByLabelText('Indirizzo MAC della TV');
    expect(
      screen.getByText('Sulla TV: Impostazioni › Rete › Stato della rete.')
    ).toBeInTheDocument();

    fireEvent.change(field, { target: { value: '02:00:00:00:00' } });
    click('Attiva l’accensione');
    expect(await screen.findByText(/L’indirizzo MAC non è valido/)).toBeInTheDocument();
    expect(power()).toHaveLength(0);

    for (const bad of ['00:00:00:00:00:00', '01:00:5e:00:00:01', 'zz:00:00:00:00:01']) {
      fireEvent.change(field, { target: { value: bad } });
      click('Attiva l’accensione');
      expect(await screen.findByText(/L’indirizzo MAC non è valido/)).toBeInTheDocument();
    }
    expect(power()).toHaveLength(0);

    fireEvent.change(field, { target: { value: MAC } });
    click('Attiva l’accensione');
    expect(await screen.findByText('Accensione: funziona')).toBeInTheDocument();
    // The broadcast address proposed from the address of the TV goes with it.
    expect(power()[0]?.body).toEqual({ mac: MAC, broadcastAddress: '192.168.1.255' });
    // Gone from the screen once it is sent.
    expect(document.body.textContent).not.toContain(MAC);
  });

  it('proposes the broadcast address of the network of the TV, under «Avanzate» only', async () => {
    fake.on('POST /accensione/:id', () => ({ body: WORKS }));
    mount({ typedHost: '192.168.1.26' });
    expect(screen.queryByLabelText('Indirizzo di broadcast')).toBeNull();
    const toggle = screen.getByRole('button', { name: 'Avanzate' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    click('Avanzate');
    expect(screen.getByRole('button', { name: 'Avanzate' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByLabelText('Indirizzo di broadcast')).toHaveValue('192.168.1.255');
    expect(screen.getByLabelText('Porta')).toHaveValue('');

    fireEvent.change(screen.getByLabelText('Indirizzo MAC della TV'), { target: { value: MAC } });
    fireEvent.change(screen.getByLabelText('Porta'), { target: { value: '9' } });
    click('Attiva l’accensione');
    await screen.findByText('Accensione: funziona');
    expect(power()[0]?.body).toEqual({
      mac: MAC,
      broadcastAddress: '192.168.1.255',
      broadcastPort: 9,
    });
  });

  it('sends no broadcast address or port when they are empty', async () => {
    fake.on('POST /accensione/:id', () => ({ body: WORKS }));
    mount({ typedHost: 'tv.casa' });
    click('Avanzate');
    fireEvent.change(screen.getByLabelText('Indirizzo MAC della TV'), { target: { value: MAC } });
    click('Attiva l’accensione');
    await screen.findByText('Accensione: funziona');
    expect(power()[0]?.body).toEqual({ mac: MAC });
  });

  it('proposes nothing when the address typed is not a plain IPv4, and refuses wrong values', async () => {
    mount({ typedHost: 'tv.casa' });
    click('Avanzate');
    expect(screen.getByLabelText('Indirizzo di broadcast')).toHaveValue('');
    fireEvent.change(screen.getByLabelText('Indirizzo di broadcast'), {
      target: { value: '192.168.1' },
    });
    fireEvent.change(screen.getByLabelText('Porta'), { target: { value: '70000' } });
    click('Attiva l’accensione');
    expect(await screen.findByText(/L’indirizzo di broadcast non è valido/)).toBeInTheDocument();
    expect(screen.getByText('La porta deve essere un numero da 1 a 65535.')).toBeInTheDocument();
    expect(power()).toHaveLength(0);
  });

  it('may leave the MAC empty to let the server take it from Home Assistant', async () => {
    fake.on('POST /accensione/:id', () => ({ body: WORKS }));
    mount();
    click('Attiva l’accensione');
    await screen.findByText('Accensione: funziona');
    expect(power()[0]?.body).toEqual({});
  });

  it('shows the error of the server under the field it names', async () => {
    fake.on('POST /accensione/:id', () =>
      errorReply(400, 'INVALID_INPUT', 'I dati inseriti non sono validi.', { field: 'mac' })
    );
    mount();
    click('Avanzate');
    fireEvent.change(screen.getByLabelText('Indirizzo MAC della TV'), { target: { value: MAC } });
    click('Attiva l’accensione');
    const field = screen.getByLabelText('Indirizzo MAC della TV');
    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'));
    expect(screen.getByText('I dati inseriti non sono validi.')).toBeInTheDocument();
  });
});

describe('nothing is kept, nothing is said', () => {
  it('writes the MAC nowhere in the browser and prints nothing', async () => {
    const stores = [
      vi.spyOn(Storage.prototype, 'setItem'),
      vi.spyOn(Storage.prototype, 'removeItem'),
    ];
    const consoles = (['log', 'info', 'warn', 'error', 'debug'] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined)
    );
    fake.on('POST /accensione/:id', () => ({ body: WORKS }));
    mount();
    click('Avanzate');
    fireEvent.change(screen.getByLabelText('Indirizzo MAC della TV'), { target: { value: MAC } });
    click('Attiva l’accensione');
    await screen.findByText('Accensione: funziona');
    for (const spy of [...stores, ...consoles]) expect(spy).not.toHaveBeenCalled();
  });
});
