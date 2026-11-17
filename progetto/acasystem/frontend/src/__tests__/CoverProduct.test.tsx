import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CoverWidget } from '@/components/widgets/controls/cover/CoverWidget';
import { CoverDetails } from '@/components/widgets/controls/cover/CoverDetails';
import { ProductCoverConsole } from '@/components/widgets/home/cover/ProductCoverDetails';
import { AdaptiveCategoryWidget } from '@/components/widgets/adaptive/AdaptiveCategoryWidget';
import {
  coverActionCall,
  coverPercent,
  coverProductBinding,
  coverTargetCall,
  productCoverView,
} from '@/components/widgets/home/cover/productCoverModel';
import type { ProductDeviceBinding } from '@/utils/devices/productBinding';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, flush, renderWithRuntime, serviceMock } from './ControlsHarness';

const binding: ProductDeviceBinding = {
  version: 1,
  family: 'cover',
  deviceId: 'motor',
  primaryEntityId: 'cover.main',
  channelEntityIds: ['cover.main'],
  secondaryEntityIds: ['sensor.power', 'sensor.firmware', 'switch.led'],
  technicalEntityIds: ['sensor.firmware', 'switch.led'],
};
const settings = {
  coverId: 'cover.main',
  categoryWidgetType: 'cover',
  name: 'Tenda studio',
  productDevice: binding,
};
const attributes = {
  friendly_name: 'Canale',
  supported_features: 1 | 2 | 4 | 8 | 128,
  current_position: 37,
  current_tilt_position: 53,
};
const entities = fixtureEntities([
  fixtureEntity('cover.main', 'closed', attributes),
  fixtureEntity('sensor.power', '4', { friendly_name: 'Potenza', unit_of_measurement: 'W' }),
  fixtureEntity('sensor.firmware', '2026.10.4-versione-molto-lunga', {
    friendly_name: 'Versione firmware',
  }),
  fixtureEntity('switch.led', 'on', { friendly_name: 'Spia' }),
]);
const services = {
  cover: {
    open_cover: {},
    close_cover: {},
    stop_cover: {},
    set_cover_position: {},
    set_cover_tilt_position: {},
  },
  switch: { turn_on: {}, turn_off: {} },
};
const runtime = () => ({ entities, services, conn: fakeConnection().conn });
const home = (current = settings, editMode = false) => (
  <CoverWidget
    id="cover_card_studio"
    settingsKey="home::cover"
    settings={current}
    size={{ w: 2, h: 2 }}
    editMode={editMode}
  />
);
const details = (current = settings) => (
  <CoverDetails
    id="cover_card_studio"
    settingsKey="home::cover"
    settings={current}
    onClose={() => undefined}
  />
);
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('Cover prodotto: dati osservati e supporto HA2026.10.4', () => {
  it('richiede famiglia e primary coerenti preservando il percorso storico', () => {
    expect(coverProductBinding(settings)).toEqual(binding);
    expect(coverProductBinding({ coverId: 'cover.main' })).toBeNull();
    expect(coverProductBinding({ ...settings, coverId: 'cover.other' })).toBeNull();
    expect(
      coverProductBinding({ ...settings, productDevice: { ...binding, family: 'light' } })
    ).toBeNull();
  });
  it.each([undefined, null, '', ' ', false, true, NaN, Infinity, -1, 101])(
    'non trasforma %s in una percentuale',
    (value) => {
      expect(coverPercent(value)).toBeNull();
    }
  );
  it.each([0, 37, 100, '53'])('conserva la percentuale osservata %s', (value) => {
    expect(coverPercent(value)).toBe(Number(value));
  });
  it.each(['unknown', 'unavailable', '', 'unexpected', 'constructor', 'toString', '__proto__'])(
    'distingue %s da chiusa',
    (state) => {
      const view = productCoverView(fixtureEntity('cover.main', state, attributes));
      expect(view.available).toBe(false);
      expect(view.stateLabel).toBe('Non disponibile');
      expect(coverActionCall(view, services, 'open')).toBeNull();
    }
  );
  it('verifica separatamente feature e servizio per apri, ferma e chiudi', () => {
    const openOnly = productCoverView(
      fixtureEntity('cover.main', 'closed', { supported_features: 1 })
    );
    expect(coverActionCall(openOnly, services, 'open')).toEqual({ service: 'open_cover' });
    expect(coverActionCall(openOnly, services, 'close')).toBeNull();
    expect(coverActionCall(openOnly, services, 'stop')).toBeNull();
    expect(coverActionCall(openOnly, { cover: {} }, 'open')).toBeNull();
  });
  it('128 controlla tilt;256 SPEED non autorizza la posizione delle lamelle', () => {
    const normal = productCoverView(fixtureEntity('cover.main', 'open', attributes));
    expect(coverTargetCall(normal, services, 'position', 100)).toEqual({
      service: 'set_cover_position',
      data: { position: 100 },
    });
    expect(coverTargetCall(normal, services, 'tilt', 0)).toEqual({
      service: 'set_cover_tilt_position',
      data: { tilt_position: 0 },
    });
    expect(
      coverTargetCall(
        productCoverView(
          fixtureEntity('cover.main', 'open', { ...attributes, supported_features: 256 })
        ),
        services,
        'tilt',
        50
      )
    ).toBeNull();
    expect(coverTargetCall(normal, { cover: {} }, 'tilt', 50)).toBeNull();
    expect(coverTargetCall(normal, services, 'position', 50.5)).toBeNull();
    expect(
      coverTargetCall(
        productCoverView(fixtureEntity('cover.main', 'open', { supported_features: 4 })),
        services,
        'position',
        0
      )
    ).toBeNull();
  });
});

describe('Cover prodotto: Home, dettagli e compatibilita', () => {
  it('monta senza impartire comandi e mostra lo stato e la posizione osservati', async () => {
    const callService = serviceMock(),
      rendered = renderWithRuntime(home(), { ...runtime(), callService });
    await flush();
    expect(rendered.container.querySelector('article.product-cover')).toBeTruthy();
    expect(screen.getByText('Chiusa')).toBeTruthy();
    expect(screen.getByText('37%')).toBeTruthy();
    expect(callService).not.toHaveBeenCalled();
  });
  it('Home multicanale offre solo riepilogo e nessun comando collettivo', () => {
    const current = {
      ...settings,
      productDevice: { ...binding, channelEntityIds: ['cover.main', 'cover.other'] },
    };
    renderWithRuntime(home(current), {
      ...runtime(),
      entities: {
        ...entities,
        'cover.other': fixtureEntity('cover.other', 'unavailable', attributes),
      },
    });
    expect(screen.getByText('2 canali · 0 aperti')).toBeTruthy();
    expect(screen.getByText('1 non disponibili')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^(Apri|Ferma|Chiudi) / })).toBeNull();
  });
  it('non inventa0% senza posizione e non abilita azioni quando non disponibile', () => {
    const rendered = renderWithRuntime(home(), {
      ...runtime(),
      entities: fixtureEntities([
        fixtureEntity('cover.main', 'unknown', { supported_features: 15 }),
      ]),
    });
    expect(screen.getByText('Non disponibile')).toBeTruthy();
    expect(screen.queryByText(/0%/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Apri Tenda studio' })).toBeDisabled();
    rendered.setEntities([fixtureEntity('cover.main', 'closed', { supported_features: 15 })]);
    expect(screen.getByText('Chiusa')).toBeTruthy();
    expect(screen.queryByText('37%')).toBeNull();
  });
  it('nomina univocamente canali e separa misure e tecnica', async () => {
    const current = {
      ...settings,
      productDevice: { ...binding, channelEntityIds: ['cover.main', 'cover.other'] },
    };
    renderWithRuntime(details(current), {
      ...runtime(),
      entities: { ...entities, 'cover.other': fixtureEntity('cover.other', 'open', attributes) },
    });
    await flush();
    expect(screen.getByRole('region', { name: 'Canale (cover.main)' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Canale (cover.other)' })).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Misure' })).getByText('4 W')).toBeTruthy();
    const technical = screen.getByRole('button', { name: 'Tecnica e manutenzione' });
    expect(technical).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.getByText('2026.10.4-versione-molto-lunga').closest('.aca-disclosure__panel')
    ).toHaveAttribute('inert');
    fireEvent.click(technical);
    expect(technical).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('2026.10.4-versione-molto-lunga')).toBeTruthy();
  });
  it('usa ConsoleColumns condiviso e lo stesso renderer nei nuovi binding adattivi', () => {
    const rendered = renderWithRuntime(
      <ProductCoverConsole
        id="cover_card_studio"
        settingsKey="home::cover"
        settings={settings}
        onClose={() => undefined}
      />,
      runtime()
    );
    expect(
      rendered.container.querySelector(
        '.aca-console-columns .widget-console-details .product-cover-details'
      )
    ).toBeTruthy();
    cleanup();
    const adaptive = renderWithRuntime(
      <AdaptiveCategoryWidget
        type="cover"
        entityId="cover.main"
        id="cover_card_studio"
        settings={settings}
        size={{ w: 2, h: 2 }}
        editMode={false}
      />,
      runtime()
    );
    expect(adaptive.container.querySelector('article.product-cover')).toBeTruthy();
  });
  it('mantiene il renderer storico senza metadata', () => {
    const rendered = renderWithRuntime(
      <CoverWidget
        id="cover_card_old"
        settingsKey="home::old"
        settings={{ coverId: 'cover.main' }}
        size={{ w: 2, h: 2 }}
        editMode={false}
      />,
      runtime()
    );
    expect(rendered.container.querySelector('.product-cover')).toBeNull();
    expect(rendered.container.querySelector('.ctl-cover')).toBeTruthy();
  });
});

describe('Cover prodotto: richieste personali e Stop indipendente', () => {
  it('invia Stop una volta anche con apertura ancora pendente e mantiene lo stato osservato', async () => {
    const callService = serviceMock(() => new Promise(() => undefined));
    const rendered = renderWithRuntime(home(), { ...runtime(), callService });
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Apri Tenda studio' }));
    expect(screen.getByText('Chiusa')).toBeTruthy();
    expect(screen.getByText('37%')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Apri Tenda studio' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ferma Tenda studio' })).not.toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Ferma Tenda studio' }));
    expect(callService.mock.calls).toEqual([
      ['cover', 'open_cover', { entity_id: 'cover.main' }],
      ['cover', 'stop_cover', { entity_id: 'cover.main' }],
    ]);
    rendered.setEntities([fixtureEntity('cover.main', 'opening', attributes)]);
    expect(screen.getByText('In apertura')).toBeTruthy();
  });
  it('annulla una posizione non ancora inviata quando si premeStop', async () => {
    vi.useFakeTimers();
    const callService = serviceMock();
    renderWithRuntime(details(), { ...runtime(), callService });
    await flush();
    fireEvent.change(screen.getByRole('slider', { name: 'Apertura di Canale' }), {
      target: { value: '61' },
    });
    expect(screen.getByText('Richiesta · 61%')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Ferma Canale' }));
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    expect(callService.mock.calls).toEqual([['cover', 'stop_cover', { entity_id: 'cover.main' }]]);
  });
  it('invia posizione e tilt separatamente0-100 senza cambiare i valori osservati', async () => {
    vi.useFakeTimers();
    const callService = serviceMock();
    renderWithRuntime(details(), { ...runtime(), callService });
    await flush();
    fireEvent.change(screen.getByRole('slider', { name: 'Apertura di Canale' }), {
      target: { value: '100' },
    });
    await act(async () => {
      vi.advanceTimersByTime(210);
    });
    expect(callService).toHaveBeenLastCalledWith('cover', 'set_cover_position', {
      entity_id: 'cover.main',
      position: 100,
    });
    expect(screen.getByText('Apertura osservata · 37%')).toBeTruthy();
    fireEvent.change(screen.getByRole('slider', { name: 'Inclinazione di Canale' }), {
      target: { value: '0' },
    });
    await act(async () => {
      vi.advanceTimersByTime(210);
    });
    expect(callService).toHaveBeenLastCalledWith('cover', 'set_cover_tilt_position', {
      entity_id: 'cover.main',
      tilt_position: 0,
    });
  });
  it.each([
    ['Apertura di Canale', 'set_cover_position', 'current_position', 'position'],
    ['Inclinazione di Canale', 'set_cover_tilt_position', 'current_tilt_position', 'tilt_position'],
  ])(
    'il passo30→31 di %s resta richiesto fino al nuovo stato osservato',
    async (label, service, attribute, payloadKey) => {
      vi.useFakeTimers();
      const callService = serviceMock();
      const observed = { ...attributes, current_position: 30, current_tilt_position: 30 };
      const rendered = renderWithRuntime(details(), {
        ...runtime(),
        callService,
        entities: { ...entities, 'cover.main': fixtureEntity('cover.main', 'open', observed) },
      });
      await flush();
      const slider = screen.getByRole('slider', { name: label });
      fireEvent.change(slider, { target: { value: '31' } });
      expect(slider).toHaveValue('31');
      expect(slider).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByText('Richiesta · 31%')).toBeTruthy();
      await act(async () => {
        vi.advanceTimersByTime(199);
      });
      expect(callService).not.toHaveBeenCalled();
      expect(slider).toHaveValue('31');
      expect(slider).toHaveAttribute('aria-busy', 'true');
      await act(async () => {
        vi.advanceTimersByTime(2);
      });
      expect(callService.mock.calls).toEqual([
        ['cover', service, { entity_id: 'cover.main', [payloadKey]: 31 }],
      ]);
      expect(slider).toHaveAttribute('aria-busy', 'true');
      rendered.setEntities([fixtureEntity('cover.main', 'open', { ...observed, [attribute]: 31 })]);
      await flush();
      expect(slider).not.toHaveAttribute('aria-busy');
      expect(slider).toHaveValue('31');
      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      expect(callService).toHaveBeenCalledTimes(1);
    }
  );
  it('nessun invio differito dopo uscita o perdita del collegamento', async () => {
    vi.useFakeTimers();
    const callService = serviceMock();
    const rendered = renderWithRuntime(details(), { ...runtime(), callService });
    await flush();
    fireEvent.change(screen.getByRole('slider', { name: 'Apertura di Canale' }), {
      target: { value: '62' },
    });
    rendered.update({ conn: null });
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    expect(callService).not.toHaveBeenCalled();
    rendered.unmount();
  });
});
