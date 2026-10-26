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
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { AddDeviceFlow } from '@/templates/devices/AddDeviceFlow';
import {
  TV_ENTITY,
  TV_HOST,
  abortDto,
  cannotConnect,
  createdDto,
  entryDto,
  errorReply,
  installFakeDevices,
  pairingError,
  pairingForm,
  statusDto,
  userForm,
  type FakeDevices,
  type Reply,
} from './devicesFakeServer';

/**
 * «Aggiungi un dispositivo» (D1c, D1d, D1f): the catalogue, the form of the address, the pairing
 * with its count, the errors of the server, the flow left open, and what follows the creation of
 * the entry (name and room). The server is a fake `fetch`; the client and the screens are real.
 */

let fake: FakeDevices;
const onDone = vi.fn();
const onExit = vi.fn();

const ADD_TV = 'Aggiungi: Televisore LG (webOS)';

function mount(entities = fixtureEntities([])) {
  const runtime = createFixtureRuntime({ entities });
  const view = render(
    <WidgetRuntimeProvider value={runtime}>
      <AddDeviceFlow kind="tv" onDone={onDone} onExit={onExit} />
    </WidgetRuntimeProvider>
  );
  return view;
}

const tvEntities = () =>
  fixtureEntities([fixtureEntity(TV_ENTITY, 'off', { friendly_name: 'LG webOS TV' })]);

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

/** Starts the flow from the catalogue and waits for the form of the address. */
async function startTv() {
  fireEvent.click(await screen.findByRole('button', { name: ADD_TV }));
  await screen.findByLabelText('Indirizzo del televisore');
}

/** Types the address and presses «Avanti». */
function sendHost(host = TV_HOST) {
  fireEvent.change(screen.getByLabelText('Indirizzo del televisore'), { target: { value: host } });
  click('Avanti');
}

/** Lets the requests that are about to leave go out (the client awaits the token first). */
const settled = () => new Promise((resolve) => setTimeout(resolve, 50));

const ENGLISH = /\b(Host|Pairing|Submit|Next|Cancel|Back|Loading|Retry)\b/;
const expectNoEnglish = () => expect(document.body.textContent ?? '').not.toMatch(ENGLISH);

beforeEach(() => {
  auth.headers.mockClear();
  fake = installFakeDevices();
  onDone.mockClear();
  onExit.mockClear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the service is not there', () => {
  it('says so in the words of the server, asks nothing else and offers only «Esci»', async () => {
    const message =
      'Servizio non attivo. La configurazione dei dispositivi da Acasystem è spenta: chiedi all’installatore di attivarla.';
    fake = installFakeDevices({
      status: statusDto({
        service: { state: 'inactive', active: false, message },
        features: { catalog: false, flows: false, power: false },
      }),
    });
    mount();
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(fake.callsTo('GET /catalogo')).toHaveLength(0);
    expect(fake.callsTo('GET /flussi')).toHaveLength(0);
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Esci']);
    click('Esci');
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('says that Home Assistant cannot be reached when the server has no message of its own', async () => {
    fake = installFakeDevices({
      status: statusDto({
        homeAssistant: { reachable: false, onboarded: null },
        features: { catalog: false, flows: false, power: false },
      }),
    });
    mount();
    expect(await screen.findByText(/Home Assistant non è raggiungibile/)).toBeInTheDocument();
    expect(fake.callsTo('GET /catalogo')).toHaveLength(0);
  });

  it('shows the message of the server when the state cannot be read at all', async () => {
    fake.on('GET /stato', () =>
      errorReply(503, 'HA_UNREACHABLE', 'Home Assistant non è raggiungibile. Riprova.')
    );
    mount();
    expect(
      await screen.findByText('Home Assistant non è raggiungibile. Riprova.')
    ).toBeInTheDocument();
  });
});

describe('the catalogue', () => {
  it('puts the recommended TV first and lists the others, which need the installer', async () => {
    mount();
    const recommended = await screen.findByRole('button', { name: ADD_TV });
    expect(screen.getByText('Consigliati per questo widget')).toBeInTheDocument();
    const other = await screen.findByRole('button', { name: /hue/ });
    expect(other).toBeDisabled();
    expect(other).toHaveTextContent('Richiede l’installatore');
    // The recommended row comes before the list, and appears once.
    expect(
      recommended.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.getAllByText(/Televisore LG/)).toHaveLength(1);
    expect(
      screen.getByText(/L’elenco completo delle marche non è ancora disponibile/)
    ).toBeInTheDocument();
    fireEvent.click(other);
    expect(fake.callsTo('POST /flussi')).toHaveLength(0);
    expectNoEnglish();
  });

  it('searches after a pause in the typing, with the text in the query and a limit of 50', async () => {
    mount();
    await screen.findByRole('button', { name: /hue/ });
    fireEvent.change(screen.getByLabelText('Cerca un’integrazione'), { target: { value: 'hue' } });
    expect(fake.callsTo('GET /catalogo?q=')).toHaveLength(0);
    await waitFor(() => expect(fake.callsTo('GET /catalogo?q=hue&limit=50')).toHaveLength(1));
  });

  it('says how many it shows when the list is longer than the page', async () => {
    fake.on('GET /catalogo', () => ({
      body: { items: [], total: 321, degraded: true, message: null },
    }));
    mount();
    expect(await screen.findByText('Mostro 0 di 321: scrivi per restringere.')).toBeInTheDocument();
  });

  it('still lets the person start the TV when the catalogue does not load', async () => {
    fake.on('GET /catalogo', () =>
      errorReply(503, 'HA_UNREACHABLE', 'Home Assistant non è raggiungibile.')
    );
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Home Assistant non è raggiungibile.'
    );
    expect(screen.getByRole('button', { name: ADD_TV })).toBeEnabled();
  });
});

describe('the address of the TV', () => {
  it('starts only the TV and draws the form of the server in Italian', async () => {
    mount();
    await startTv();
    expect(fake.callsTo('POST /flussi')[0]?.body).toEqual({ handler: 'webostv' });
    expect(screen.getByRole('heading', { name: 'Aggiungi il televisore LG' })).toBeInTheDocument();
    expect(screen.getByText('Per esempio 192.168.1.26')).toBeInTheDocument();
    expectNoEnglish();
  });

  it('does not send a required field left empty, and says which one', async () => {
    mount();
    await startTv();
    click('Avanti');
    expect(await screen.findByText('Compila questo campo.')).toBeInTheDocument();
    expect(fake.callsTo('POST /flussi/')).toHaveLength(0);
  });

  it('sends the address as the only key, and leaves out an optional field that is empty', async () => {
    fake.on('POST /flussi', () => ({
      status: 201,
      body: {
        ...userForm(),
        fields: [
          ...userForm().fields,
          { name: 'note', kind: 'text', required: false, label: 'Nota' },
        ],
      },
    }));
    fake.on('POST /flussi/:id', () => ({ body: pairingForm() }));
    mount();
    await startTv();
    sendHost(` ${TV_HOST} `);
    await screen.findByText(/Hai 10 secondi per premere OK/);
    expect(fake.callsTo('POST /flussi/flow1')[0]?.body).toEqual({ input: { host: TV_HOST } });
  });

  it('shows an error of the whole step on top, and keeps what was typed', async () => {
    fake.on('POST /flussi/:id', () => ({ body: userForm([cannotConnect]) }));
    mount();
    await startTv();
    sendHost('192.168.1.99');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Non riesco a collegarmi al televisore/
    );
    expect(screen.getByLabelText('Indirizzo del televisore')).toHaveValue('192.168.1.99');
  });

  it('shows the error of one field under it', async () => {
    fake.on('POST /flussi/:id', () =>
      errorReply(400, 'INVALID_INPUT', 'I dati inseriti non sono validi.', { field: 'host' })
    );
    mount();
    await startTv();
    sendHost('8.8.8.8');
    const field = await screen.findByLabelText('Indirizzo del televisore');
    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'));
    expect(screen.getByText('I dati inseriti non sono validi.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Avanti' })).toBeEnabled();
  });
});

describe('the pairing', () => {
  /** The flow up to the pairing screen; the next answer is held until `release` is called. */
  async function toPairing() {
    let release: (reply: Reply) => void = () => undefined;
    const held = new Promise<Reply>((resolve) => {
      release = resolve;
    });
    let answers = 0;
    fake.on('POST /flussi/:id', () => {
      answers += 1;
      if (answers === 1) return { body: pairingForm() };
      // The second answer is held until the test releases it; any later one never comes.
      return answers === 2 ? held : new Promise<Reply>(() => undefined);
    });
    mount();
    await startTv();
    sendHost();
    await screen.findByText(/Hai 10 secondi per premere OK/);
    return { release };
  }

  it('explains it before the press, with LG Connect Apps and the ten seconds', async () => {
    await toPairing();
    expect(screen.getByRole('heading', { name: 'Accetta sul televisore' })).toBeInTheDocument();
    expect(
      screen.getByText('Sul televisore deve essere attivo LG Connect Apps.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Tieni in mano il telecomando. Premi Avanti: sul televisore comparirà una richiesta. Hai 10 secondi per premere OK.'
      )
    ).toBeInTheDocument();
    expectNoEnglish();
  });

  it('counts from ten while the call is open, presses nothing, then says it is waiting', async () => {
    const { release } = await toPairing();
    vi.useFakeTimers();
    click('Avanti');
    await vi.advanceTimersByTimeAsync(0);

    const ring = screen.getByRole('progressbar', { name: 'Secondi rimasti per premere OK' });
    expect(ring).toHaveAttribute('aria-valuenow', '10');
    expect(screen.getByRole('status')).toHaveTextContent('Guarda il televisore e premi OK.');
    // Nothing can be pressed while the TV is asked, not even «Esci».
    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();

    await vi.advanceTimersByTimeAsync(3000);
    expect(ring).toHaveAttribute('aria-valuenow', '7');
    await vi.advanceTimersByTimeAsync(7000);
    expect(ring).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Sto aspettando la risposta del televisore…'
    );
    expect(fake.callsTo('DELETE')).toHaveLength(0);

    release({ body: pairingForm([pairingError]) });
    await vi.advanceTimersByTimeAsync(0);
    vi.useRealTimers();
    expect(await screen.findByRole('alert')).toHaveTextContent(pairingError.message);
  });

  it('after a failed pairing «Riprova» answers the same flow again, with an empty input', async () => {
    const { release } = await toPairing();
    click('Avanti');
    release({ body: pairingForm([pairingError]) });
    await screen.findByText(pairingError.message);
    const retry = screen.getByRole('button', { name: 'Riprova' });
    expect(retry).toBeEnabled();
    click('Riprova');
    await waitFor(() => expect(fake.callsTo('POST /flussi/flow1')).toHaveLength(3));
    const answers = fake.callsTo('POST /flussi/flow1');
    expect(answers[1]?.body).toEqual({ input: {} });
    expect(answers[2]?.body).toEqual({ input: {} });
  });

  it('a TV that is already added ends in a message and a way back to the choice', async () => {
    const { release } = await toPairing();
    click('Avanti');
    release({ body: abortDto() });
    expect(await screen.findByText('Questo dispositivo è già stato aggiunto.')).toBeInTheDocument();
    click('Torna alla scelta del dispositivo');
    expect(onExit).toHaveBeenCalledTimes(1);
    // The flow ended with the abort: nothing is left to cancel.
    expect(fake.callsTo('DELETE')).toHaveLength(0);
  });

  it('another abort offers to start again from the catalogue', async () => {
    const { release } = await toPairing();
    click('Avanti');
    release({ body: abortDto('cannot_connect', 'Non riesco a collegarmi al dispositivo.') });
    expect(await screen.findByText('Non riesco a collegarmi al dispositivo.')).toBeInTheDocument();
    click('Ricomincia');
    expect(await screen.findByRole('button', { name: ADD_TV })).toBeInTheDocument();
  });
});

describe('what the server can refuse', () => {
  it('a step this version cannot answer (422) says so and offers only «Esci»', async () => {
    fake.on('POST /flussi/:id', () =>
      errorReply(
        422,
        'UNSUPPORTED_STEP',
        'Questo dispositivo non si può ancora aggiungere da Acasystem. Chiedi all’installatore.'
      )
    );
    mount();
    await startTv();
    sendHost();
    expect(await screen.findByRole('alert')).toHaveTextContent(/non si può ancora aggiungere/);
    expect(screen.queryByRole('button', { name: /Riprova|Ricomincia/ })).toBeNull();
    click('Esci');
    // The server has already cancelled it: there is nothing to cancel from here.
    await waitFor(() => expect(onExit).toHaveBeenCalled());
    expect(fake.callsTo('DELETE')).toHaveLength(0);
  });

  it('a menu or a progress step is not drawn: the flow is cancelled with a plain message', async () => {
    fake.on('POST /flussi/:id', () => ({
      body: {
        type: 'menu',
        flowId: 'flow1',
        handler: 'webostv',
        stepId: 'x',
        title: 'Menu',
        options: [],
      },
    }));
    mount();
    await startTv();
    sendHost();
    expect(
      await screen.findByText('Questo dispositivo non si può ancora aggiungere da Acasystem.')
    ).toBeInTheDocument();
    await waitFor(() => expect(fake.callsTo('DELETE /flussi/flow1')).toHaveLength(1));
  });

  it('a start refused for the installer (403) says so', async () => {
    fake.on('POST /flussi', () =>
      errorReply(403, 'REQUIRES_INSTALLER', 'Richiede l’installatore.')
    );
    mount();
    fireEvent.click(await screen.findByRole('button', { name: ADD_TV }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Richiede l’installatore.');
    expect(screen.getByRole('button', { name: 'Esci' })).toBeEnabled();
  });

  it('a timeout (504) can be repeated with the same answer', async () => {
    let answers = 0;
    fake.on('POST /flussi/:id', () => {
      answers += 1;
      return answers === 1
        ? errorReply(504, 'HA_TIMEOUT', 'Home Assistant non ha risposto in tempo. Riprova.')
        : { body: pairingForm() };
    });
    mount();
    await startTv();
    sendHost();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Home Assistant non ha risposto in tempo. Riprova.'
    );
    click('Riprova');
    await screen.findByText(/Hai 10 secondi per premere OK/);
    const calls = fake.callsTo('POST /flussi/flow1');
    expect(calls.map((call) => call.body)).toEqual([
      { input: { host: TV_HOST } },
      { input: { host: TV_HOST } },
    ]);
  });

  it('a flow that no longer exists (404) offers to start again', async () => {
    fake.on('POST /flussi/:id', () =>
      errorReply(404, 'FLOW_NOT_FOUND', 'Questa aggiunta non esiste più. Ricomincia.')
    );
    mount();
    await startTv();
    sendHost();
    expect(
      await screen.findByText('Questa aggiunta non esiste più. Ricomincia.')
    ).toBeInTheDocument();
    click('Ricomincia');
    expect(await screen.findByRole('button', { name: ADD_TV })).toBeInTheDocument();
    expect(fake.callsTo('DELETE')).toHaveLength(0);
  });

  it('a start that finds an open flow (409) offers to continue it or to cancel it', async () => {
    fake.on('POST /flussi', () =>
      errorReply(409, 'FLOW_ALREADY_OPEN', 'Hai già un’aggiunta in corso per questo dispositivo.', {
        flowId: 'flow7',
      })
    );
    fake.on('GET /flussi/:id', () => ({ body: userForm([], 'flow7') }));
    mount();
    fireEvent.click(await screen.findByRole('button', { name: ADD_TV }));
    expect(
      await screen.findByText(/Hai già un’aggiunta in corso per questo dispositivo/)
    ).toBeInTheDocument();
    click('Continua');
    await screen.findByLabelText('Indirizzo del televisore');
    expect(fake.callsTo('GET /flussi/flow7')).toHaveLength(1);
    // The flow that was continued is the one that is cancelled on exit.
    click('Esci');
    await waitFor(() => expect(fake.callsTo('DELETE /flussi/flow7')).toHaveLength(1));
  });

  it('a 409 can be cancelled instead, and the catalogue comes back', async () => {
    fake.on('POST /flussi', () =>
      errorReply(409, 'FLOW_ALREADY_OPEN', 'Hai già un’aggiunta in corso.', { flowId: 'flow7' })
    );
    mount();
    fireEvent.click(await screen.findByRole('button', { name: ADD_TV }));
    await screen.findByText(/Hai già un’aggiunta in corso/);
    click('Annulla');
    expect(await screen.findByRole('button', { name: ADD_TV })).toBeInTheDocument();
    expect(fake.callsTo('DELETE /flussi/flow7')).toHaveLength(1);
  });
});

describe('a flow left open', () => {
  it('offers to resume one found when opening, with the step the server says', async () => {
    fake.on('GET /flussi', () => ({
      body: {
        flows: [
          { flowId: 'flow5', handler: 'webostv', stepId: 'user', createdAt: '', expiresAt: '' },
        ],
      },
    }));
    fake.on('GET /flussi/:id', () => ({ body: userForm([], 'flow5') }));
    mount();
    expect(await screen.findByText('Hai un’aggiunta in sospeso.')).toBeInTheDocument();
    expect(fake.callsTo('GET /catalogo')).toHaveLength(0);
    click('Riprendi');
    await screen.findByLabelText('Indirizzo del televisore');
    expect(fake.callsTo('GET /flussi/flow5')).toHaveLength(1);
  });

  it('or to cancel it and start from the catalogue', async () => {
    fake.on('GET /flussi', () => ({
      body: {
        flows: [
          { flowId: 'flow5', handler: 'webostv', stepId: 'user', createdAt: '', expiresAt: '' },
        ],
      },
    }));
    mount();
    await screen.findByText('Hai un’aggiunta in sospeso.');
    click('Annulla');
    expect(await screen.findByRole('button', { name: ADD_TV })).toBeInTheDocument();
    expect(fake.callsTo('DELETE /flussi/flow5')).toHaveLength(1);
  });

  it('«Esci» cancels the flow in the server, and a flow that is gone (404) does not stop it', async () => {
    fake.on('DELETE /flussi/:id', () =>
      errorReply(404, 'FLOW_NOT_FOUND', 'Questa aggiunta non esiste più.')
    );
    mount();
    await startTv();
    click('Esci');
    await waitFor(() => expect(onExit).toHaveBeenCalledTimes(1));
    expect(fake.callsTo('DELETE /flussi/flow1')).toHaveLength(1);
  });

  it('closing the sheet while a step waits for the person cancels the flow', async () => {
    const view = mount();
    await startTv();
    view.unmount();
    await waitFor(() => expect(fake.callsTo('DELETE /flussi/flow1')).toHaveLength(1));
  });

  it('but not while a call is still open: the server expires it', async () => {
    fake.on('POST /flussi/:id', () => new Promise<Reply>(() => undefined));
    const view = mount();
    await startTv();
    sendHost();
    await waitFor(() => expect(fake.callsTo('POST /flussi/flow1')).toHaveLength(1));
    view.unmount();
    await settled();
    expect(fake.callsTo('DELETE')).toHaveLength(0);
  });

  it('leaving before starting cancels nothing', async () => {
    const view = mount();
    await screen.findByRole('button', { name: ADD_TV });
    view.unmount();
    await settled();
    expect(fake.callsTo('DELETE')).toHaveLength(0);
  });
});

describe('after the entry is created', () => {
  /** Runs the flow to the end of the pairing, which creates the entry the test describes. */
  async function createWith(created: ReturnType<typeof createdDto>, entities = tvEntities()) {
    let answers = 0;
    fake.on('POST /flussi/:id', () => {
      answers += 1;
      return { body: answers === 1 ? pairingForm() : created };
    });
    mount(entities);
    await startTv();
    sendHost();
    await screen.findByText(/Hai 10 secondi per premere OK/);
    click('Avanti');
  }

  it('asks for the name and the room, proposes «Televisore» and saves both on the device', async () => {
    await createWith(createdDto());
    expect(
      await screen.findByRole('heading', { name: 'Dispositivo aggiunto.' })
    ).toBeInTheDocument();
    const name = screen.getByLabelText('Nome del dispositivo');
    expect(name).toHaveValue('Televisore');
    fireEvent.change(name, { target: { value: 'Televisore sala' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Salotto' }));
    fake.on('PATCH /dispositivi/:id', () => ({ body: entryDto().device }));
    click('Salva');
    await screen.findByRole('button', { name: 'Attiva l’accensione' });
    expect(fake.callsTo('PATCH /dispositivi/dev1')[0]?.body).toEqual({
      name: 'Televisore sala',
      areaId: 'salotto',
    });
  });

  it('a new room is created first and then chosen; one that exists shows its error under the field', async () => {
    await createWith(createdDto());
    await screen.findByLabelText('Nome del dispositivo');
    click('Nuova stanza');
    fake.on('POST /stanze', () =>
      errorReply(409, 'AREA_EXISTS', 'Esiste già una stanza con questo nome.')
    );
    fireEvent.change(screen.getByLabelText('Nome della nuova stanza'), {
      target: { value: 'Cucina' },
    });
    click('Crea la stanza');
    expect(await screen.findByText('Esiste già una stanza con questo nome.')).toBeInTheDocument();
    fake.on('POST /stanze', () => ({ status: 201, body: { id: 'cucina', name: 'Cucina' } }));
    click('Crea la stanza');
    const cucina = await screen.findByRole('button', { name: 'Cucina' });
    expect(cucina).toHaveAttribute('aria-pressed', 'true');
  });

  it('«Salta» leaves the name and the room as they are', async () => {
    await createWith(createdDto());
    await screen.findByLabelText('Nome del dispositivo');
    click('Salta');
    await screen.findByRole('button', { name: 'Attiva l’accensione' });
    expect(fake.callsTo('PATCH')).toHaveLength(0);
  });

  it('a TV that is not ready says what is wrong, and «Riprova» reads the entry again', async () => {
    await createWith(
      createdDto(
        entryDto({
          loaded: false,
          state: 'setup_retry',
          device: null,
          mediaPlayerEntityId: null,
          message: 'Il dispositivo non risponde: controlla che sia acceso e collegato alla rete.',
        }),
        true
      )
    );
    expect(
      await screen.findByText(/Il dispositivo non risponde: controlla che sia acceso/)
    ).toBeInTheDocument();
    click('Riprova');
    await screen.findByLabelText('Nome del dispositivo');
    expect(fake.callsTo('GET /voci/entry1')).toHaveLength(1);
  });

  it('with no power-on step and no device to name, the end is «Fine», which links the entity once', async () => {
    await createWith(createdDto(entryDto({ device: null, power: null })));
    await screen.findByRole('button', { name: 'Fine' });
    click('Fine');
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledWith(TV_ENTITY);
  });

  it('«Fine» waits for the entity to reach the live data', async () => {
    await createWith(createdDto(entryDto({ device: null, power: null })), fixtureEntities([]));
    const done = await screen.findByRole('button', { name: 'Fine' });
    expect(screen.getByText('Il televisore sta comparendo…')).toBeInTheDocument();
    expect(done).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(done);
    expect(onDone).not.toHaveBeenCalled();
  });
});

describe('nothing is kept, nothing is said, nothing is in English', () => {
  it('writes nothing in the storage and prints nothing, with the address typed', async () => {
    const stores = [
      vi.spyOn(Storage.prototype, 'setItem'),
      vi.spyOn(Storage.prototype, 'removeItem'),
    ];
    const consoles = (['log', 'info', 'warn', 'error', 'debug'] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined)
    );
    fake.on('POST /flussi/:id', () => ({ body: userForm([cannotConnect]) }));
    mount();
    await startTv();
    sendHost();
    await screen.findByRole('alert');
    click('Esci');
    await waitFor(() => expect(onExit).toHaveBeenCalled());
    for (const spy of [...stores, ...consoles]) expect(spy).not.toHaveBeenCalled();
    expect(JSON.stringify(localStorage)).not.toContain(TV_HOST);
    expectNoEnglish();
  });
});
