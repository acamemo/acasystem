import type { CardSettings } from '@/@types/dashboard';
import type { ProductDeviceBinding } from '@/utils/devices/productBinding';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AndroidTvWidget, AppleTvWidget } from '@/components/widgets/media/widgets/TvWidget';
import { AndroidTvDetails, AppleTvDetails } from '@/components/widgets/media/widgets/TvDetails';
import { ProductTvConsole } from '@/components/widgets/home/tv/ProductTvDetails';
import { ProductTvScope } from '@/components/widgets/home/tv/ProductTvScope';
import { useMediaControls } from '@/components/widgets/media/hooks/useMediaControls';
import {
  productTvScope,
  tvChannelStatus,
  tvPowerSupported,
  tvProductBinding,
} from '@/components/widgets/home/tv/productTvModel';
import { MEDIA_FEATURE as F } from '@/components/widgets/media/model/features';
import { PageVisibilityContext } from '@/hooks/launcher/PageVisibilityContext';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, flush, renderWithRuntime, serviceMock } from './ControlsHarness';

vi.mock('@/components/widgets/media/hooks/useTvBrandLogo', () => ({ useTvBrandLogo: () => null }));

const binding: ProductDeviceBinding = {
  version: 1,
  family: 'tv',
  deviceId: 'screen',
  primaryEntityId: 'media_player.screen',
  channelEntityIds: ['media_player.screen'],
  secondaryEntityIds: ['remote.screen'],
};
const settings: CardSettings = {
  categoryWidgetType: 'androidtv',
  mediaPlayerId: binding.primaryEntityId,
  productDevice: binding,
  name: 'TV soggiorno',
};
const media = (
  state = 'on',
  features: number | undefined = 0,
  id = binding.primaryEntityId,
  attrs: Record<string, unknown> = {}
) =>
  fixtureEntity(id, state, {
    friendly_name: id === binding.primaryEntityId ? 'TV soggiorno' : 'Secondo canale',
    platform: 'androidtv_remote',
    supported_features: features,
    ...attrs,
  });
const entities = (state = 'on', features = F.TURN_ON | F.TURN_OFF, attrs = {}) =>
  fixtureEntities([
    media(state, features, undefined, attrs),
    fixtureEntity('remote.screen', 'on', {}),
  ]);
const runtime = (state = 'on', features = F.TURN_ON | F.TURN_OFF, attrs = {}) => ({
  entities: entities(state, features, attrs),
  conn: fakeConnection().conn,
});
const home = (s = settings, edit = false, apple = false) => {
  const Widget = apple ? AppleTvWidget : AndroidTvWidget;
  return (
    <Widget
      id="androidtv_card_test"
      settingsKey="home::tv"
      settings={s}
      size={{ w: 2, h: 2 }}
      editMode={edit}
    />
  );
};
const details = (s = settings, apple = false) => {
  const Details = apple ? AppleTvDetails : AndroidTvDetails;
  return (
    <Details
      id="androidtv_card_test"
      settingsKey="home::tv"
      settings={s}
      onClose={() => undefined}
    />
  );
};

function PendingPlayer({ action }: { action: 'seek' | 'volume' }) {
  const controls = useMediaControls(binding.primaryEntityId);
  return (
    <button
      onClick={() => {
        if (action === 'seek') {
          controls.seek(20);
          controls.seek(40);
        } else {
          controls.setVolume(25);
          controls.setVolume(75);
        }
      }}
    >
      Regola due volte
    </button>
  );
}

const pendingPlayer = (action: 'seek' | 'volume', visible = true) => (
  <PageVisibilityContext.Provider value={visible}>
    <ProductTvScope settings={settings} binding={binding} active={binding.primaryEntityId}>
      {() => <PendingPlayer action={action} />}
    </ProductTvScope>
  </PageVisibilityContext.Provider>
);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('TV prodotto: identità e separazione esatta', () => {
  it('accetta soltanto v1 tv e primario coerente', () => {
    expect(tvProductBinding(settings)).toEqual(binding);
    expect(tvProductBinding({ ...settings, mediaPlayerId: 'media_player.other' })).toBeNull();
    expect(tvProductBinding({ mediaPlayerId: binding.primaryEntityId })).toBeNull();
    expect(
      tvProductBinding({ ...settings, productDevice: { ...binding, family: 'light' } })
    ).toBeNull();
  });
  it('non include un nativo o telecomando omonimo estraneo', () => {
    const all = fixtureEntities([
      media(),
      media('on', F.TURN_OFF, 'media_player.other', {
        platform: 'webostv',
        friendly_name: 'TV soggiorno',
      }),
      fixtureEntity('remote.screen', 'on', {}),
      fixtureEntity('remote.other', 'on', {}),
    ]);
    const own = { ...binding, secondaryEntityIds: [] };
    const scoped = productTvScope(settings, own, binding.primaryEntityId, all);
    expect(Object.keys(scoped.entities)).toEqual([binding.primaryEntityId]);
    expect(scoped.settings.remoteId).toBe('');
  });
  it('risolve solo un remote ordinario proprio, senza scrivere settings', () => {
    const save = JSON.stringify(settings);
    const scoped = productTvScope(settings, binding, binding.primaryEntityId, entities());
    expect(scoped.settings.remoteId).toBe('remote.screen');
    expect(JSON.stringify(settings)).toBe(save);
  });
  it('non decide fra due remote senza un’associazione esplicita', () => {
    const scoped = productTvScope(
      settings,
      { ...binding, secondaryEntityIds: ['remote.screen', 'remote.second'] },
      binding.primaryEntityId,
      { ...entities(), 'remote.second': fixtureEntity('remote.second', 'on', {}) }
    );
    expect(scoped.settings.remoteId).toBe('');
    expect(scoped.entities['remote.screen']).toBeUndefined();
    renderWithRuntime(
      details({
        ...settings,
        productDevice: { ...binding, secondaryEntityIds: ['remote.screen', 'remote.second'] },
      }),
      {
        ...runtime(),
        entities: { ...entities(), 'remote.second': fixtureEntity('remote.second', 'on', {}) },
      }
    );
    expect(screen.queryByRole('heading', { name: 'Telecomando' })).not.toBeInTheDocument();
  });
  it('un media_player tecnico secondario non viene scelto come controparte nativa', () => {
    const own = {
      ...binding,
      secondaryEntityIds: ['media_player.native'],
      technicalEntityIds: ['media_player.native'],
    };
    const scoped = productTvScope(
      settings,
      own,
      binding.primaryEntityId,
      fixtureEntities([
        media('on', F.TURN_OFF, undefined, { platform: 'cast' }),
        media('on', F.TURN_OFF, 'media_player.native', {
          platform: 'webostv',
          friendly_name: 'TV soggiorno',
        }),
      ])
    );
    expect(scoped.entities['media_player.native']).toBeUndefined();
  });
  it('esclude i remote tecnici dall’associazione automatica', () => {
    expect(
      productTvScope(
        settings,
        { ...binding, technicalEntityIds: ['remote.screen'] },
        binding.primaryEntityId,
        entities()
      ).settings.remoteId
    ).toBe('');
  });
  it('conserva i collegamenti espliciti storici senza aggregare altre entità', () => {
    const original = {
      ...settings,
      remoteId: 'remote.explicit',
      linkedMediaPlayers: ['media_player.linked'],
    };
    const all = {
      ...entities(),
      'remote.explicit': fixtureEntity('remote.explicit', 'on', {}),
      'media_player.linked': media('playing', F.PLAY, 'media_player.linked'),
      'media_player.stranger': media('playing', F.PLAY, 'media_player.stranger'),
    };
    const scoped = productTvScope(original, binding, binding.primaryEntityId, all);
    expect(scoped.settings.remoteId).toBe('remote.explicit');
    expect(scoped.entities['media_player.linked']).toBeDefined();
    expect(scoped.entities['media_player.stranger']).toBeUndefined();
  });
  it('un canale non ingloba gli altri media_player dello stesso prodotto', () => {
    const second = 'media_player.other';
    const scoped = productTvScope(
      settings,
      { ...binding, channelEntityIds: [binding.primaryEntityId, second] },
      second,
      { ...entities(), [second]: media('on', 0, second) }
    );
    expect(scoped.entities[binding.primaryEntityId]).toBeUndefined();
    expect(scoped.settings.mediaPlayerId).toBe(second);
  });
  it.each([undefined, 'garbage', null, -1, NaN, Infinity, 1.5])(
    'normalizza feature mancanti o invalide %s a zero',
    (value) => {
      const scoped = productTvScope(
        settings,
        binding,
        binding.primaryEntityId,
        fixtureEntities([media('on', undefined, undefined, { supported_features: value })])
      );
      expect(scoped.entities[binding.primaryEntityId]?.attributes.supported_features).toBe(0);
      expect(
        tvPowerSupported(
          entities('on', undefined, { supported_features: value }),
          binding.primaryEntityId,
          true
        )
      ).toBe(false);
    }
  );
  it('conserva un intero non negativo anche se HA lo fornisce come stringa numerica', () => {
    const scoped = productTvScope(
      settings,
      binding,
      binding.primaryEntityId,
      entities('on', undefined, { supported_features: String(F.TURN_OFF) })
    );
    expect(scoped.entities[binding.primaryEntityId]?.attributes.supported_features).toBe(
      F.TURN_OFF
    );
    expect(tvPowerSupported(scoped.entities, binding.primaryEntityId, true)).toBe(true);
  });
  it.each([
    ['playing', 'In riproduzione'],
    ['paused', 'In pausa'],
    ['off', 'Spenta'],
    ['unknown', 'Stato sconosciuto'],
    ['unavailable', 'Non disponibile'],
  ])('stato %s distinto', (state, label) => {
    expect(tvChannelStatus(binding.primaryEntityId, entities(state))).toBe(label);
  });
  it('assenza stato non significa spento', () => {
    expect(tvChannelStatus(binding.primaryEntityId, {})).toBe('Non disponibile');
  });
  it.each(['constructor', 'toString', '__proto__'])(
    'stato arbitrario %s non legge Object.prototype o abilita comandi',
    (state) => {
      expect(tvChannelStatus(binding.primaryEntityId, entities(state))).toBe('Non disponibile');
      expect(tvPowerSupported(entities(state), binding.primaryEntityId, true)).toBe(false);
      renderWithRuntime(home(), runtime(state));
      expect(screen.queryByRole('button', { name: 'Spegni' })).not.toBeInTheDocument();
    }
  );
  it('potenza richiede i bit della direzione richiesta', () => {
    const own = entities('on', F.TURN_OFF);
    expect(tvPowerSupported(own, binding.primaryEntityId, true)).toBe(true);
    expect(tvPowerSupported(own, binding.primaryEntityId, false)).toBe(false);
    expect(tvPowerSupported(entities('unknown'), binding.primaryEntityId, false)).toBe(false);
  });
  it('webOS indisponibile non diventa spento senza prova di wake', () => {
    const own = entities('unavailable', 0, { platform: 'webostv' });
    expect(tvPowerSupported(own, binding.primaryEntityId, false)).toBe(false);
    expect(tvPowerSupported(own, binding.primaryEntityId, false, '', true)).toBe(true);
  });
});

describe('TV prodotto: Home compatta', () => {
  it('apertura e render non inviano comandi', () => {
    const callService = serviceMock(),
      openDetails = vi.fn();
    renderWithRuntime(home(), { ...runtime(), callService, openDetails });
    fireEvent.click(screen.getByRole('button', { name: 'Dettagli: TV soggiorno' }));
    expect(openDetails).toHaveBeenCalledWith('androidtv_card_test');
    expect(callService).not.toHaveBeenCalled();
  });
  it('spegne solo il canale scelto sul percorso runtime', async () => {
    const callService = serviceMock();
    renderWithRuntime(home(), { ...runtime(), callService });
    fireEvent.click(screen.getByRole('button', { name: 'Spegni' }));
    await flush();
    expect(callService).toHaveBeenCalledExactlyOnceWith('media_player', 'turn_off', {
      entity_id: binding.primaryEntityId,
    });
  });
  it('accende solo quando dichiarato', async () => {
    const callService = serviceMock();
    renderWithRuntime(home(), { ...runtime('off'), callService });
    fireEvent.click(screen.getByRole('button', { name: 'Accendi' }));
    await flush();
    expect(callService).toHaveBeenCalledExactlyOnceWith('media_player', 'turn_on', {
      entity_id: binding.primaryEntityId,
    });
  });
  it('modalità editing non attiva la TV', () => {
    const callService = serviceMock();
    renderWithRuntime(home(settings, true), { ...runtime(), callService });
    expect(screen.getByRole('button', { name: 'Spegni' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Spegni' }));
    expect(callService).not.toHaveBeenCalled();
  });
  it('multicanale è un riepilogo senza comando collettivo', () => {
    const current = {
      ...settings,
      productDevice: {
        ...binding,
        channelEntityIds: [binding.primaryEntityId, 'media_player.other'],
      },
    };
    renderWithRuntime(home(current), {
      ...runtime('playing'),
      entities: {
        ...entities('playing'),
        'media_player.other': media('unavailable', 0, 'media_player.other'),
      },
    });
    expect(screen.getByText('2 canali')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Spegni' })).not.toBeInTheDocument();
    expect(screen.getByText('1 in riproduzione')).toBeInTheDocument();
  });
  it('Apple TV senza bit non inventa volume o accensione', () => {
    renderWithRuntime(
      home({ ...settings, categoryWidgetType: 'appletv' }, false, true),
      runtime('on', 0, { platform: 'apple_tv' })
    );
    expect(screen.queryByRole('button', { name: 'Spegni' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /volume/i })).not.toBeInTheDocument();
  });
  it('tap toggle esplicito Apple conserva l’accesso separato ai dettagli', async () => {
    const callService = serviceMock(),
      openDetails = vi.fn();
    renderWithRuntime(
      home({ ...settings, categoryWidgetType: 'appletv', tapAction: 'toggle' }, false, true),
      { ...runtime(), callService, openDetails }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Spegni TV soggiorno' }));
    await flush();
    expect(callService).toHaveBeenCalledExactlyOnceWith('media_player', 'turn_off', {
      entity_id: binding.primaryEntityId,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Dettagli: TV soggiorno' }));
    expect(openDetails).toHaveBeenCalledWith('androidtv_card_test');
    expect(callService).toHaveBeenCalledTimes(1);
  });
  it('il toggle Apple non viene inferito come impostazione predefinita', () => {
    const callService = serviceMock(),
      openDetails = vi.fn();
    renderWithRuntime(home({ ...settings, categoryWidgetType: 'appletv' }, false, true), {
      ...runtime(),
      callService,
      openDetails,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Dettagli: TV soggiorno' }));
    expect(openDetails).toHaveBeenCalledTimes(1);
    expect(callService).not.toHaveBeenCalled();
  });
  it.each(['unknown', 'unavailable'])('stato %s senza comandi fisici', (state) => {
    renderWithRuntime(home(), runtime(state));
    expect(screen.queryByRole('button', { name: 'Accendi' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Spegni' })).not.toBeInTheDocument();
  });
  it('perdita del dispositivo rimane leggibile', () => {
    renderWithRuntime(home(), { entities: {}, entitiesLoaded: true });
    expect(screen.getByText('Non raggiungibile')).toBeInTheDocument();
  });
  it('errore di permessi rimane locale e non cambia identità', async () => {
    const callService = serviceMock(async () => {
      throw new Error('Forbidden');
    });
    renderWithRuntime(home(), { ...runtime(), callService });
    fireEvent.click(screen.getByRole('button', { name: 'Spegni' }));
    await flush();
    expect(callService).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Comando non riuscito. Riprova.')).toBeInTheDocument();
  });
});

describe('TV prodotto: dettagli condivisi', () => {
  it.each(['seek', 'volume'] as const)(
    'unmount annulla il seguito %s prima del cleanup del player',
    async (action) => {
      vi.useFakeTimers();
      vi.setSystemTime(1000);
      const callService = serviceMock();
      const ui = renderWithRuntime(pendingPlayer(action), {
        ...runtime('playing', F.SEEK | F.VOLUME_SET),
        callService,
      });
      fireEvent.click(screen.getByRole('button', { name: 'Regola due volte' }));
      await flush();
      expect(callService).toHaveBeenCalledTimes(1);
      ui.unmount();
      await flush();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      expect(callService).toHaveBeenCalledTimes(1);
    }
  );
  it.each(['seek', 'volume'] as const)(
    'pagina nascosta non invia %s, neppure dal cleanup',
    async (action) => {
      vi.useFakeTimers();
      vi.setSystemTime(1000);
      const callService = serviceMock();
      const ui = renderWithRuntime(pendingPlayer(action, false), {
        ...runtime('playing', F.SEEK | F.VOLUME_SET),
        callService,
      });
      fireEvent.click(screen.getByRole('button', { name: 'Regola due volte' }));
      await flush();
      ui.unmount();
      await flush();
      expect(callService).not.toHaveBeenCalled();
    }
  );
  it.each(['seek', 'volume'] as const)('connessione persa non accoda %s', async (action) => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    const callService = serviceMock(),
      connection = fakeConnection().conn;
    Object.defineProperty(connection, 'connected', { value: false });
    const ui = renderWithRuntime(pendingPlayer(action), {
      ...runtime('playing', F.SEEK | F.VOLUME_SET),
      conn: connection,
      callService,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Regola due volte' }));
    await flush();
    ui.unmount();
    await flush();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(callService).not.toHaveBeenCalled();
  });
  it('remote soltanto del dispositivo e comandi concreti della piattaforma', async () => {
    const callService = serviceMock();
    renderWithRuntime(details(), { ...runtime(), callService });
    fireEvent.click(screen.getByRole('button', { name: 'Su' }));
    await flush();
    expect(callService).toHaveBeenCalledExactlyOnceWith('remote', 'send_command', {
      entity_id: 'remote.screen',
      command: 'DPAD_UP',
    });
  });
  it('Apple TV usa i tasti del suo adattatore', async () => {
    const callService = serviceMock();
    renderWithRuntime(details({ ...settings, categoryWidgetType: 'appletv' }, true), {
      ...runtime('on', F.TURN_OFF, { platform: 'apple_tv' }),
      callService,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Su' }));
    await flush();
    expect(callService).toHaveBeenCalledExactlyOnceWith('remote', 'send_command', {
      entity_id: 'remote.screen',
      command: 'up',
    });
  });
  it('senza remote non ne inventa uno dal nome dell’entità', () => {
    renderWithRuntime(
      details({ ...settings, productDevice: { ...binding, secondaryEntityIds: [] } }),
      runtime()
    );
    expect(screen.queryByRole('heading', { name: 'Telecomando' })).not.toBeInTheDocument();
  });
  it('remote indisponibile non produce tasti operativi', () => {
    renderWithRuntime(details(), {
      ...runtime(),
      entities: {
        ...entities(),
        'remote.screen': fixtureEntity('remote.screen', 'unavailable', {}),
      },
    });
    expect(screen.queryByRole('heading', { name: 'Telecomando' })).not.toBeInTheDocument();
  });
  it('TV spenta non offre telecomando o riproduzione', () => {
    renderWithRuntime(details(), runtime('off', F.TURN_ON | F.PLAY | F.PAUSE));
    expect(screen.queryByRole('heading', { name: 'Telecomando' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Riproduci' })).not.toBeInTheDocument();
  });
  it('senza bit Apple non forza transport, sorgenti o volume', () => {
    renderWithRuntime(
      details(
        {
          ...settings,
          categoryWidgetType: 'appletv',
          productDevice: { ...binding, secondaryEntityIds: [] },
        },
        true
      ),
      runtime('on', 0, { platform: 'apple_tv', source_list: ['Netflix'] })
    );
    expect(screen.queryByRole('button', { name: 'Riproduci' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Netflix' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Volume' })).not.toBeInTheDocument();
  });
  it('selezione sorgente solo quando dichiarata, senza richieste all’apertura', async () => {
    const callService = serviceMock();
    renderWithRuntime(details(), {
      ...runtime('on', F.SELECT_SOURCE, { source_list: ['HDMI 1', 'Netflix'] }),
      callService,
    });
    expect(callService).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'HDMI 1' }));
    await flush();
    expect(callService).toHaveBeenCalledExactlyOnceWith('media_player', 'select_source', {
      entity_id: binding.primaryEntityId,
      source: 'HDMI 1',
    });
  });
  it('cambio canale mantiene il prodotto e non invia azioni', async () => {
    const current = {
      ...settings,
      productDevice: {
        ...binding,
        channelEntityIds: [binding.primaryEntityId, 'media_player.second'],
      },
    };
    const callService = serviceMock();
    renderWithRuntime(details(current), {
      ...runtime(),
      entities: {
        ...entities(),
        'media_player.second': media('off', F.TURN_ON, 'media_player.second'),
      },
      callService,
    });
    fireEvent.click(screen.getByRole('button', { name: /Canale TV/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Secondo canale' }));
    await flush();
    expect(screen.getByRole('button', { name: 'Accendi' })).toBeInTheDocument();
    expect(callService).not.toHaveBeenCalled();
  });
  it('cambio canale annulla il seek in coda del canale precedente prima di 150ms', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    const current = {
      ...settings,
      productDevice: {
        ...binding,
        channelEntityIds: [binding.primaryEntityId, 'media_player.second'],
        secondaryEntityIds: [],
      },
    };
    const callService = serviceMock();
    renderWithRuntime(details(current), {
      ...runtime('playing', F.SEEK | F.PLAY | F.PAUSE, { media_duration: 240, media_position: 10 }),
      entities: fixtureEntities([
        media('playing', F.SEEK | F.PLAY | F.PAUSE, undefined, {
          media_duration: 240,
          media_position: 10,
        }),
        media('playing', F.SEEK | F.PLAY | F.PAUSE, 'media_player.second', {
          media_duration: 240,
          media_position: 10,
        }),
      ]),
      callService,
    });
    const slider = screen.getByRole('slider', { name: 'Posizione nel brano' });
    fireEvent.change(slider, { target: { value: '20' } });
    fireEvent.change(slider, { target: { value: '40' } });
    await flush();
    expect(callService).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /Canale TV:/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Secondo canale' }));
    await flush();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(callService).toHaveBeenCalledExactlyOnceWith('media_player', 'media_seek', {
      entity_id: binding.primaryEntityId,
      seek_position: 20,
    });
  });
  it('Apple non presenta NEXT/PREV_TRACK come Canali TV', () => {
    renderWithRuntime(
      details({ ...settings, categoryWidgetType: 'appletv' }, true),
      runtime('playing', F.NEXT_TRACK | F.PREVIOUS_TRACK, { platform: 'apple_tv' })
    );
    expect(screen.queryByRole('heading', { name: 'Canali' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Brano precedente' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Brano successivo' })).toBeInTheDocument();
  });
  it('TV con remote nativo mantiene i veri comandi Canali', () => {
    renderWithRuntime(details(), runtime());
    expect(screen.getByRole('heading', { name: 'Canali' })).toBeInTheDocument();
  });
  it('cambio canale annulla la regolazione volume non confermata durante il gesto', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    const current = {
      ...settings,
      productDevice: {
        ...binding,
        channelEntityIds: [binding.primaryEntityId, 'media_player.second'],
        secondaryEntityIds: [],
      },
    };
    const callService = serviceMock();
    renderWithRuntime(details(current), {
      ...runtime(),
      entities: fixtureEntities([
        media('on', F.VOLUME_SET, undefined, { volume_level: 0.2 }),
        media('on', F.VOLUME_SET, 'media_player.second', { volume_level: 0.4 }),
      ]),
      callService,
    });
    const knob = screen.getByRole('slider', { name: 'Volume' });
    const pointer = { pointerId: 1, pointerType: 'touch', button: 0 };
    fireEvent.pointerDown(knob, { ...pointer, clientY: 160 });
    fireEvent.pointerMove(knob, { ...pointer, clientY: 128 });
    fireEvent.pointerMove(knob, { ...pointer, clientY: 96 });
    await flush();
    expect(callService).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /Canale TV:/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Secondo canale' }));
    await flush();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(callService).toHaveBeenCalledTimes(1);
    expect(callService.mock.calls[0]?.[2]?.entity_id).toBe(binding.primaryEntityId);
  });
  it('tecnica è una disclosure separata', () => {
    const current = {
      ...settings,
      productDevice: {
        ...binding,
        secondaryEntityIds: ['sensor.temp', 'sensor.rssi'],
        technicalEntityIds: ['sensor.rssi'],
      },
    };
    renderWithRuntime(details(current), {
      ...runtime(),
      entities: {
        ...entities(),
        'sensor.temp': fixtureEntity('sensor.temp', '30', {
          friendly_name: 'Temperatura',
          unit_of_measurement: '°C',
        }),
        'sensor.rssi': fixtureEntity('sensor.rssi', '-50', { friendly_name: 'Segnale' }),
      },
    });
    expect(screen.getByText('Temperatura')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tecnica e manutenzione/ })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(screen.getByText('Segnale').closest('[inert]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Tecnica e manutenzione/ }));
    expect(screen.getByText('Segnale')).toBeInTheDocument();
  });
  it('la Console usa lo stesso componente dettagli', () => {
    const callService = serviceMock();
    const ui = renderWithRuntime(
      <ProductTvConsole
        id="androidtv_card_test"
        settingsKey="home::tv"
        settings={settings}
        onClose={() => undefined}
      />,
      { ...runtime(), callService }
    );
    expect(
      ui.container.querySelector('.widget-console-details .product-tv-details')
    ).toBeInTheDocument();
    expect(callService).not.toHaveBeenCalled();
  });
  it('pagina nascosta mantiene la tessera ma rende inerti i comandi', () => {
    const callService = serviceMock();
    renderWithRuntime(
      <PageVisibilityContext.Provider value={false}>{home()}</PageVisibilityContext.Provider>,
      { ...runtime(), callService }
    );
    expect(screen.getByRole('button', { name: 'Spegni' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Spegni' }));
    expect(callService).not.toHaveBeenCalled();
  });
  it('aggiornamento osservato non produce nuovi comandi', async () => {
    const callService = serviceMock();
    const ui = renderWithRuntime(home(), { ...runtime(), callService });
    fireEvent.click(screen.getByRole('button', { name: 'Spegni' }));
    await flush();
    ui.update({ entities: entities('off') });
    await flush();
    expect(screen.getByRole('button', { name: 'Accendi' })).toBeInTheDocument();
    expect(callService).toHaveBeenCalledTimes(1);
  });
  it('render con dati non caricati usa il caricamento condiviso', () => {
    const ui = renderWithRuntime(home(), { entities: {}, entitiesLoaded: false });
    expect(ui.container.querySelector('.product-tv')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
  it('Apple mostra solo il trasporto realmente esposto', () => {
    renderWithRuntime(
      details(
        {
          ...settings,
          categoryWidgetType: 'appletv',
          productDevice: { ...binding, secondaryEntityIds: [] },
        },
        true
      ),
      runtime('paused', F.PLAY | F.PAUSE, { platform: 'apple_tv' })
    );
    expect(screen.getByRole('button', { name: 'Riproduci' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Brano precedente' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Brano successivo' })).not.toBeInTheDocument();
  });
  it.each([
    ['playing', F.PLAY, 'Pausa'],
    ['paused', F.PAUSE, 'Riproduci'],
  ])('non offre l’inverso non supportato in stato %s', (state, features, label) => {
    renderWithRuntime(
      details({ ...settings, productDevice: { ...binding, secondaryEntityIds: [] } }),
      runtime(String(state), Number(features))
    );
    expect(screen.queryByRole('button', { name: String(label) })).not.toBeInTheDocument();
  });
  it('l’app scelta a TV spenta usa il risveglio esistente e annulla il seguito dopo smontaggio', async () => {
    vi.useFakeTimers();
    const callService = serviceMock();
    const ui = renderWithRuntime(details(), {
      ...runtime('off', F.PLAY_MEDIA | F.TURN_ON),
      callService,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Netflix' }));
    await flush();
    expect(callService).toHaveBeenCalledExactlyOnceWith('media_player', 'turn_on', {
      entity_id: binding.primaryEntityId,
    });
    ui.update({ entities: entities('on', F.PLAY_MEDIA | F.TURN_ON) });
    ui.unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(35000);
    });
    expect(callService).toHaveBeenCalledTimes(1);
  });
  it('solo browse senza play_media non propone riproduzione di contenuti', () => {
    renderWithRuntime(
      details({ ...settings, productDevice: { ...binding, secondaryEntityIds: [] } }),
      runtime('on', F.BROWSE_MEDIA)
    );
    expect(screen.queryByRole('button', { name: 'Scegli contenuto' })).not.toBeInTheDocument();
  });
});
