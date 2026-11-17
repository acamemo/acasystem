import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CardSettings } from '@/@types/dashboard';
import type { ProductDeviceBinding } from '@/utils/devices/productBinding';
import { PageVisibilityContext } from '@/hooks/launcher/PageVisibilityContext';
import { ProductMediaWidget } from '@/components/widgets/home/media/ProductMediaWidget';
import {
  ProductMediaConsole,
  ProductMediaDetails,
} from '@/components/widgets/home/media/ProductMediaDetails';
import {
  mediaActionAllowed,
  mediaProductBinding,
  productMediaView,
} from '@/components/widgets/home/media/productMediaModel';
import { MediaGroupWidget } from '@/components/widgets/media/widgets/MediaWidgets';
import { MediaGroupDetails } from '@/components/widgets/media/widgets/MediaDetails';
import { MediaGroupConsole } from '@/components/widgets/media/widgets/MediaConsole';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, flush, renderWithRuntime, serviceMock } from './ControlsHarness';

const primary = 'media_player.speaker';
const binding: ProductDeviceBinding = {
  version: 1,
  family: 'media',
  deviceId: 'speaker',
  primaryEntityId: primary,
  channelEntityIds: [primary],
  secondaryEntityIds: [],
};
const settings: CardSettings = {
  categoryWidgetType: 'media',
  mediaIds: [primary],
  productDevice: binding,
  name: 'Soggiorno',
};
const services = {
  media_player: Object.fromEntries(
    [
      'media_play',
      'media_pause',
      'media_stop',
      'media_previous_track',
      'media_next_track',
      'turn_on',
      'turn_off',
      'volume_set',
      'volume_up',
      'volume_down',
      'volume_mute',
      'media_seek',
      'shuffle_set',
      'repeat_set',
      'select_source',
      'select_sound_mode',
      'play_media',
    ].map((key) => [key, {}])
  ),
};
const all =
  1 |
  2 |
  4 |
  8 |
  16 |
  32 |
  128 |
  256 |
  512 |
  1024 |
  2048 |
  4096 |
  16384 |
  32768 |
  65536 |
  131072 |
  262144;
const player = (state = 'paused', patch: Record<string, unknown> = {}, id = primary) =>
  fixtureEntity(id, state, {
    friendly_name: 'Soggiorno',
    supported_features: all,
    media_title: 'La canzone',
    media_artist: 'Artista',
    volume_level: 0.3,
    is_volume_muted: false,
    shuffle: false,
    repeat: 'off',
    media_duration: 240,
    media_position: 10,
    source: 'Radio',
    source_list: ['Radio', 'TV'],
    sound_mode: 'Film',
    sound_mode_list: ['Film', 'Musica'],
    ...patch,
  });
const runtime = (state = 'paused', patch: Record<string, unknown> = {}) => ({
  conn: fakeConnection().conn,
  services,
  entities: fixtureEntities([player(state, patch)]),
});
const home = (current = settings, editMode = false) => (
  <ProductMediaWidget
    id="media_group_test"
    settingsKey="home::media"
    settings={current}
    size={{ w: 2, h: 2 }}
    editMode={editMode}
  />
);
const details = (current = settings) => (
  <ProductMediaDetails
    id="media_group_test"
    settingsKey="home::media"
    settings={current}
    onClose={() => undefined}
  />
);
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('Lettori e Sonos prodotto: stato e capacità', () => {
  it('richiede un binding coerente con mediaIds e conserva gruppi legacy distinti', () => {
    expect(mediaProductBinding(settings)).toEqual(binding);
    expect(
      mediaProductBinding({ ...settings, mediaIds: [primary, 'media_player.other'] })
    ).toBeNull();
    expect(mediaProductBinding({ mediaIds: [primary] })).toBeNull();
  });
  it.each(['unknown', 'unavailable', '', 'constructor', 'toString', '__proto__', 'connected'])(
    '%s non diventa spento o acceso',
    (state) => {
      const view = productMediaView(player(state));
      expect(view.available).toBe(false);
      expect(view.stateLabel).toBe('Non disponibile');
      expect(mediaActionAllowed(view, services, 'media_play')).toBe(false);
    }
  );
  it.each([
    ['playing', 'In riproduzione'],
    ['paused', 'In pausa'],
    ['off', 'Spento'],
    ['idle', 'Inattivo'],
    ['on', 'Acceso'],
    ['buffering', 'Caricamento'],
  ])('stato %s osservato', (state, label) => {
    expect(productMediaView(player(state)).stateLabel).toBe(label);
  });
  it.each([undefined, null, '16384', -1, NaN, 1.5])(
    'non inventa capacità con supported_features=%s',
    (features) => {
      const view = productMediaView(player('paused', { supported_features: features }));
      expect(view.features).toBe(0);
      expect(mediaActionAllowed(view, services, 'media_play')).toBe(false);
    }
  );
  it('i comandi richiedono anche la presenza del servizio', () => {
    expect(mediaActionAllowed(productMediaView(player()), { media_player: {} }, 'media_play')).toBe(
      false
    );
    expect(mediaActionAllowed(productMediaView(player()), services, 'constructor')).toBe(false);
  });
  it.each([-1, 2, NaN, '0.3', null])('volume %s non inventa una misura', (volume) => {
    expect(productMediaView(player('playing', { volume_level: volume })).volume).toBeNull();
  });
  it('filtra opzioni senza inventare sorgenti o modalità', () => {
    const view = productMediaView(
      player('playing', { source_list: ['Radio', '', null, 'Radio'], sound_mode_list: null })
    );
    expect(view.sources).toEqual(['Radio']);
    expect(view.sounds).toEqual([]);
  });
});

describe('Lettori prodotto: Home e controlli', () => {
  it('apre i dettagli senza impartire comandi', () => {
    const callService = serviceMock(),
      openDetails = vi.fn();
    renderWithRuntime(
      <ProductMediaWidget
        id="media_group_test"
        settingsKey="x"
        settings={settings}
        size={{ w: 2, h: 2 }}
        editMode={false}
        openDetails={openDetails}
      />,
      { ...runtime(), callService }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Dettagli: Soggiorno' }));
    expect(openDetails).toHaveBeenCalledOnce();
    expect(callService).not.toHaveBeenCalled();
  });
  it('la Home multicanale sintetica non offre comandi collettivi', () => {
    const second = 'media_player.channel_two';
    const current = {
      ...settings,
      mediaIds: [primary, second],
      productDevice: { ...binding, channelEntityIds: [primary, second] },
    };
    renderWithRuntime(home(current), {
      ...runtime(),
      entities: fixtureEntities([player('playing'), player('unavailable', {}, second)]),
    });
    expect(screen.getByText('1 di 2 canali in riproduzione')).toBeInTheDocument();
    expect(screen.getByText('1 non disponibili')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Riproduci' })).not.toBeInTheDocument();
  });
  it('usa media_play e non un toggle quando è supportata solo la riproduzione', async () => {
    const callService = serviceMock();
    renderWithRuntime(home(), { ...runtime('paused', { supported_features: 16384 }), callService });
    fireEvent.click(screen.getByRole('button', { name: 'Riproduci' }));
    await flush();
    expect(callService).toHaveBeenCalledWith('media_player', 'media_play', { entity_id: primary });
  });
  it('usa media_pause solo se dichiarato', async () => {
    const callService = serviceMock();
    renderWithRuntime(home(), { ...runtime('playing', { supported_features: 1 }), callService });
    fireEvent.click(screen.getByRole('button', { name: 'Metti in pausa' }));
    await flush();
    expect(callService).toHaveBeenCalledWith('media_player', 'media_pause', { entity_id: primary });
  });
  it('non mostra pausa quando il lettore supporta solo play', () => {
    renderWithRuntime(home(), runtime('playing', { supported_features: 16384 }));
    expect(screen.queryByRole('button', { name: 'Metti in pausa' })).not.toBeInTheDocument();
  });
  it.each(['unknown', 'unavailable', 'off'])('nessun comando Home durante %s', (state) => {
    const callService = serviceMock();
    renderWithRuntime(home(), { ...runtime(state), callService });
    const button = screen.queryByRole('button', { name: 'Riproduci' });
    if (button) fireEvent.click(button);
    expect(callService).not.toHaveBeenCalled();
  });
  it('in editing non riproduce', () => {
    const callService = serviceMock();
    renderWithRuntime(home(settings, true), { ...runtime(), callService });
    fireEvent.click(screen.getByRole('button', { name: 'Riproduci' }));
    expect(callService).not.toHaveBeenCalled();
  });
  it('senza connessione non accoda comandi', () => {
    const callService = serviceMock();
    renderWithRuntime(home(), { ...runtime(), conn: null, callService });
    fireEvent.click(screen.getByRole('button', { name: 'Riproduci' }));
    expect(callService).not.toHaveBeenCalled();
  });
  it('blocca il doppio invio prima della risposta senza impedire Stop', async () => {
    const call = deferred(),
      callService = serviceMock((_domain, service) =>
        service === 'media_play' ? call.promise : Promise.resolve()
      );
    renderWithRuntime(details(), { ...runtime(), callService });
    const play = screen.getByRole('button', { name: 'Riproduci' });
    fireEvent.click(play);
    fireEvent.click(play);
    fireEvent.click(screen.getByRole('button', { name: 'Ferma' }));
    await flush();
    expect(callService.mock.calls.filter((item) => item[1] === 'media_play')).toHaveLength(1);
    expect(callService).toHaveBeenCalledWith('media_player', 'media_stop', { entity_id: primary });
    call.resolve();
    await flush();
  });
  it('un comando negato non mostra successo o segreti', async () => {
    const callService = serviceMock(async () => {
      throw new Error('SECRET_TOKEN');
    });
    renderWithRuntime(details(), { ...runtime(), callService });
    fireEvent.click(screen.getByRole('button', { name: 'Riproduci' }));
    await flush();
    expect(
      screen.getByText('Esito non confermato. Verifica lo stato del lettore.')
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('SECRET_TOKEN');
  });
  it('il riscontro HA non cambia lo stato osservato', async () => {
    renderWithRuntime(details(), runtime());
    fireEvent.click(screen.getByRole('button', { name: 'Riproduci' }));
    await flush();
    expect(screen.getByText('HA ha accettato il comando.')).toBeInTheDocument();
    expect(screen.getByText('In pausa')).toBeInTheDocument();
  });
  it('Home fuori vista non carica immagini o invia comandi', () => {
    const callService = serviceMock();
    renderWithRuntime(
      <PageVisibilityContext.Provider value={false}>{home()}</PageVisibilityContext.Provider>,
      { ...runtime('playing', { entity_picture: '/api/image_proxy/speaker' }), callService }
    );
    expect(document.querySelector('img')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Metti in pausa' }));
    expect(callService).not.toHaveBeenCalled();
  });
});

describe('Lettori prodotto: schermata completa e compatibilità', () => {
  it('mostra i controlli soltanto secondo capacità e servizi', () => {
    renderWithRuntime(details(), runtime('paused', { supported_features: 16384 }));
    expect(screen.getByRole('button', { name: 'Riproduci' })).toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ferma' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sorgente:/ })).not.toBeInTheDocument();
  });
  it('cambia canale senza comandarlo', async () => {
    const second = 'media_player.second',
      callService = serviceMock();
    const current = {
      ...settings,
      mediaIds: [primary, second],
      productDevice: { ...binding, channelEntityIds: [primary, second] },
    };
    renderWithRuntime(details(current), {
      ...runtime(),
      entities: fixtureEntities([player(), player('idle', { friendly_name: 'Zona due' }, second)]),
      callService,
    });
    fireEvent.click(screen.getByRole('button', { name: /Canale: Soggiorno/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Zona due' }));
    await flush();
    expect(screen.getByRole('heading', { name: 'Zona due' })).toBeInTheDocument();
    expect(callService).not.toHaveBeenCalled();
  });
  it('Sonos espone il gruppo osservato senza aggregare o comandare altri apparecchi', () => {
    const sonos = {
      ...settings,
      categoryWidgetType: 'sonos',
      productDevice: { ...binding, family: 'sonos' as const },
    };
    renderWithRuntime(details(sonos), {
      ...runtime('playing', { group_members: [primary, 'media_player.other'] }),
      entities: fixtureEntities([
        player('playing', { group_members: [primary, 'media_player.other'] }),
        player('paused', { friendly_name: 'Cucina' }, 'media_player.other'),
      ]),
    });
    expect(screen.getByRole('heading', { name: 'Gruppo audio' })).toBeInTheDocument();
    expect(screen.getByText('Soggiorno · Cucina')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Raggruppa|Separa|Aggiungi Sonos/ })
    ).not.toBeInTheDocument();
  });
  it('non avvia browsing o riproduzione al mount', async () => {
    const conn = fakeConnection(),
      callService = serviceMock();
    renderWithRuntime(details(), { ...runtime(), conn: conn.conn, callService });
    await flush();
    expect(conn.sendMessagePromise).not.toHaveBeenCalled();
    expect(callService).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Scegli contenuto' })).toBeInTheDocument();
  });
  it('non abilita il browser con solo play_media senza BROWSE_MEDIA', () => {
    renderWithRuntime(details(), runtime('playing', { supported_features: 512 }));
    expect(screen.queryByRole('button', { name: 'Scegli contenuto' })).not.toBeInTheDocument();
  });
  it('tecnica separata dalle misure, senza payload sensibili', () => {
    const current = {
      ...settings,
      productDevice: {
        ...binding,
        secondaryEntityIds: ['sensor.power', 'sensor.version'],
        technicalEntityIds: ['sensor.version'],
      },
    };
    renderWithRuntime(details(current), {
      ...runtime(),
      entities: fixtureEntities([
        player(),
        fixtureEntity('sensor.power', '4.5', {
          friendly_name: 'Potenza',
          unit_of_measurement: 'W',
        }),
        fixtureEntity('sensor.version', '2.0', {
          friendly_name: 'Versione',
          token: 'SECRET_TOKEN',
        }),
      ]),
    });
    expect(screen.getByRole('heading', { name: 'Misure e informazioni' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tecnica e manutenzione' })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('SECRET_TOKEN');
  });
  it.each(['home', 'details', 'console'])(
    'il wrapper %s usa il prodotto solo con binding coerente',
    (mode) => {
      const props = {
        id: 'media_group_test',
        settingsKey: 'x',
        settings,
        onClose: () => undefined,
      };
      const element =
        mode === 'home' ? (
          <MediaGroupWidget {...props} size={{ w: 2, h: 2 }} editMode={false} />
        ) : mode === 'details' ? (
          <MediaGroupDetails {...props} />
        ) : (
          <MediaGroupConsole {...props} />
        );
      const rendered = renderWithRuntime(element, runtime());
      expect(
        rendered.container.querySelector(
          mode === 'home' ? '.product-media' : '.product-media-details'
        )
      ).not.toBeNull();
    }
  );
  it('la Console mantiene il layout condiviso', () => {
    const rendered = renderWithRuntime(
      <ProductMediaConsole
        id="media_group_test"
        settingsKey="x"
        settings={settings}
        onClose={() => undefined}
      />,
      runtime()
    );
    expect(rendered.container.querySelector('.product-media-details')).not.toBeNull();
  });
});

describe('Lettori prodotto: richieste indipendenti e risorse', () => {
  it('l’accensione dalla Home attende un generico stato acceso, anche playing', async () => {
    const callService = serviceMock();
    const rendered = renderWithRuntime(home(), {
      ...runtime('off', { supported_features: 128 }),
      callService,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Accendi' }));
    await flush();
    expect(callService).toHaveBeenCalledWith('media_player', 'turn_on', { entity_id: primary });
    rendered.setEntities([player('playing', { supported_features: 128 })]);
    expect(screen.queryByRole('button', { name: 'Accendi' })).not.toBeInTheDocument();
  });
  it('supporta volume a passi senza inventare un livello percentuale', async () => {
    const callService = serviceMock();
    renderWithRuntime(details(), {
      ...runtime('playing', { supported_features: 1024, volume_level: undefined }),
      callService,
    });
    expect(screen.queryByRole('slider', { name: 'Volume' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Aumenta volume' }));
    await flush();
    expect(callService).toHaveBeenCalledWith('media_player', 'volume_up', { entity_id: primary });
  });
  it('invia volume e seek solo al canale selezionato', async () => {
    const callService = serviceMock();
    renderWithRuntime(details(), { ...runtime('playing'), callService });
    fireEvent.change(screen.getByRole('slider', { name: 'Volume' }), { target: { value: '45' } });
    fireEvent.change(screen.getByRole('slider', { name: 'Posizione nel brano' }), {
      target: { value: '42' },
    });
    await flush();
    expect(callService).toHaveBeenCalledWith('media_player', 'volume_set', {
      entity_id: primary,
      volume_level: 0.45,
    });
    expect(callService).toHaveBeenCalledWith('media_player', 'media_seek', {
      entity_id: primary,
      seek_position: 42,
    });
  });
  it('seleziona sorgenti e modalità da liste HA esplicite', async () => {
    const callService = serviceMock();
    renderWithRuntime(details(), { ...runtime('playing'), callService });
    fireEvent.click(screen.getByRole('button', { name: 'Sorgente: Radio' }));
    fireEvent.click(screen.getByRole('button', { name: 'TV' }));
    await flush();
    expect(callService).toHaveBeenCalledWith('media_player', 'select_source', {
      entity_id: primary,
      source: 'TV',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Modalità audio: Film' }));
    fireEvent.click(screen.getByRole('button', { name: 'Musica' }));
    await flush();
    expect(callService).toHaveBeenCalledWith('media_player', 'select_sound_mode', {
      entity_id: primary,
      sound_mode: 'Musica',
    });
  });
  it('mute, shuffle e repeat restano comandi indipendenti', async () => {
    const callService = serviceMock();
    renderWithRuntime(details(), { ...runtime('playing'), callService });
    fireEvent.click(screen.getByRole('button', { name: 'Disattiva l’audio' }));
    fireEvent.click(screen.getByRole('button', { name: 'Riproduzione casuale' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ripeti: no' }));
    await flush();
    expect(callService).toHaveBeenCalledWith('media_player', 'volume_mute', {
      entity_id: primary,
      is_volume_muted: true,
    });
    expect(callService).toHaveBeenCalledWith('media_player', 'shuffle_set', {
      entity_id: primary,
      shuffle: true,
    });
    expect(callService).toHaveBeenCalledWith('media_player', 'repeat_set', {
      entity_id: primary,
      repeat: 'one',
    });
  });
  it('smontare il canale annulla il valore throttled ancora non inviato', async () => {
    vi.useFakeTimers();
    const callService = serviceMock();
    const rendered = renderWithRuntime(details(), { ...runtime('playing'), callService });
    fireEvent.change(screen.getByRole('slider', { name: 'Volume' }), { target: { value: '45' } });
    await flush();
    fireEvent.change(screen.getByRole('slider', { name: 'Volume' }), { target: { value: '65' } });
    rendered.unmount();
    vi.advanceTimersByTime(500);
    await flush();
    expect(callService.mock.calls.filter((call) => call[1] === 'volume_set')).toHaveLength(1);
  });
  it('la Console nascosta sospende immagini e browsing', async () => {
    const conn = fakeConnection();
    renderWithRuntime(
      <PageVisibilityContext.Provider value={false}>{details()}</PageVisibilityContext.Provider>,
      {
        ...runtime('playing', { entity_picture: '/api/media_player_proxy/speaker' }),
        conn: conn.conn,
      }
    );
    await flush();
    expect(document.querySelector('img')).toBeNull();
    expect(conn.sendMessagePromise).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Scegli contenuto' })).toBeDisabled();
  });
  it('un metadato TV non attiva il renderer lettore', () => {
    expect(
      mediaProductBinding({
        ...settings,
        mediaPlayerId: primary,
        productDevice: { ...binding, family: 'tv' },
      })
    ).toBeNull();
  });
});

describe('Lettori prodotto: regolazioni seriali', () => {
  it('conserva l’ultimo volume durante una risposta lenta, senza invii paralleli', async () => {
    vi.useFakeTimers();
    const waiting = deferred();
    let count = 0;
    const callService = serviceMock(async (_domain, service) => {
      if (service === 'volume_set' && count++ === 0) return waiting.promise;
    });
    renderWithRuntime(details(), { ...runtime('playing'), callService });
    fireEvent.change(screen.getByRole('slider', { name: 'Volume' }), { target: { value: '45' } });
    await flush();
    fireEvent.change(screen.getByRole('slider', { name: 'Volume' }), { target: { value: '65' } });
    vi.advanceTimersByTime(250);
    await flush();
    expect(callService.mock.calls.filter((call) => call[1] === 'volume_set')).toHaveLength(1);
    waiting.resolve();
    await flush();
    expect(callService.mock.calls.filter((call) => call[1] === 'volume_set')).toHaveLength(2);
    expect(callService).toHaveBeenLastCalledWith('media_player', 'volume_set', {
      entity_id: primary,
      volume_level: 0.65,
    });
  });
  it('nessun volume pendente viene spedito dopo chiusura durante risposta lenta', async () => {
    vi.useFakeTimers();
    const waiting = deferred(),
      callService = serviceMock(() => waiting.promise);
    const rendered = renderWithRuntime(details(), { ...runtime('playing'), callService });
    fireEvent.change(screen.getByRole('slider', { name: 'Volume' }), { target: { value: '45' } });
    await flush();
    fireEvent.change(screen.getByRole('slider', { name: 'Volume' }), { target: { value: '65' } });
    vi.advanceTimersByTime(250);
    await flush();
    rendered.unmount();
    waiting.resolve();
    await flush();
    expect(callService.mock.calls.filter((call) => call[1] === 'volume_set')).toHaveLength(1);
  });
});
