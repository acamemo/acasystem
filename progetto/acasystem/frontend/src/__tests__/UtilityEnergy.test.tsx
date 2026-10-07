import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CostWidget } from '@/components/widgets/utilities/energy/CostWidget';
import { CostDetails } from '@/components/widgets/utilities/energy/CostDetails';
import { NordpoolWidget } from '@/components/widgets/utilities/energy/NordpoolWidget';
import { NordpoolDetails } from '@/components/widgets/utilities/energy/NordpoolDetails';
import {
  buildBuckets,
  buildCostSeries,
  buildDeltaSeries,
  readCostSettings,
} from '@/components/widgets/utilities/energy/costData';
import { priceLevel, priceSeries, priceUnit, readNordpoolSettings, withSupport } from '@/components/widgets/utilities/energy/nordpoolData';
import { currencySymbol, formatNumber } from '@/components/widgets/utilities/shared/format';
import { currencyUnit } from '@/components/widgets/utilities/shared/units';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, renderWithRuntime } from './UtilityHarness';

const costSettings = { todayId: 'sensor.cost_today', monthId: 'sensor.cost_month', currency: 'EUR', decimals: 2 };
const fixtureConfig = createFixtureRuntime().haConfig;
const withCurrency = (currency: string | undefined) => fixtureConfig && { ...fixtureConfig, currency };
const costEntities = fixtureEntities([
  fixtureEntity('sensor.cost_today', '3.456'),
  fixtureEntity('sensor.cost_month', '8989.3'),
]);
const props = (id: string, settings: Record<string, unknown>, w = 2, h = 2) => ({
  id,
  settingsKey: `home::${id}`,
  settings,
  size: { w, h },
  editMode: false,
});

afterEach(() => {
  vi.useRealTimers();
});

describe('formattazione italiana', () => {
  it('cifre con separatori italiani e simbolo della valuta', () => {
    expect(formatNumber(8989.3, 2)).toBe('8.989,30');
    expect(currencySymbol('EUR')).toBe('€');
    expect(currencySymbol('kr')).toBe('kr');
  });

  it('valuta: impostazione del widget, poi Home Assistant; nessun ripiego inventato', () => {
    expect(currencyUnit('kr', withCurrency('EUR'))).toBe('kr');
    expect(currencyUnit(null, withCurrency('USD'))).toBe('$');
    expect(currencyUnit('  ', withCurrency('EUR'))).toBe('€');
    expect(currencyUnit(null, withCurrency(undefined))).toBeNull();
    expect(currencyUnit(null, null)).toBeNull();
    expect(priceUnit(readNordpoolSettings({ nordpoolId: 'sensor.x' }), withCurrency('USD'))).toBe('$');
  });
});

describe('costi energetici', () => {
  it('impostazioni legacy e valori come GenericEnergyCostCard', () => {
    expect(readCostSettings({}).decimals).toBe(0);
    renderWithRuntime(<CostWidget {...props('cost_card_1', costSettings)} />, { entities: costEntities });
    expect(screen.getByText('3,46')).toBeInTheDocument();
    // The month total is rounded to whole units.
    expect(screen.getByText('8.989')).toBeInTheDocument();
    expect(screen.getByText('Costi energetici')).toBeInTheDocument();
  });

  it('valuta da haConfig quando il widget non la imposta; senza configurazione nessun simbolo', () => {
    const noCurrency = { todayId: 'sensor.cost_today', monthId: 'sensor.cost_month', decimals: 2 };
    const view = renderWithRuntime(<CostWidget {...props('cost_card_1', noCurrency)} />, {
      entities: costEntities,
      haConfig: withCurrency('USD'),
    });
    expect(screen.getAllByText('$')).toHaveLength(2);
    view.update({ haConfig: null });
    expect(screen.getByText('3,46')).toBeInTheDocument();
    expect(screen.queryByText('$')).not.toBeInTheDocument();
    expect(screen.queryByText('€')).not.toBeInTheDocument();
    // The card setting wins over Home Assistant.
    view.update({ haConfig: withCurrency('USD') }, <CostWidget {...props('cost_card_1', costSettings)} />);
    expect(screen.getAllByText('€')).toHaveLength(2);
  });

  it('il pulsante trasparente che apre i dettagli è marcato data-widget-open', () => {
    const openDetails = vi.fn();
    const view = renderWithRuntime(<CostWidget {...props('cost_card_1', costSettings)} />, {
      entities: costEntities,
      openDetails,
    });
    const opener = screen.getByRole('button', { name: 'Costi energetici, apri lo storico dei costi' });
    expect(opener).toHaveAttribute('data-widget-open');
    fireEvent.click(opener);
    expect(openDetails).toHaveBeenCalledWith('cost_card_1');
    // In edit mode nothing opens: the launcher owns pointer and keys.
    view.update({}, <CostWidget {...props('cost_card_1', costSettings)} editMode />);
    expect(view.container.querySelector('[data-widget-open]')).toBeNull();
  });

  it('nome personalizzato, etichette e taglia 2×1', () => {
    renderWithRuntime(
      <CostWidget {...props('cost_card_1', { ...costSettings, todayLabel: 'Oggi finora' }, 3, 1)} />,
      { entities: costEntities, customNames: { cost_card_1: 'Bolletta' } }
    );
    expect(screen.getByText('Bolletta')).toBeInTheDocument();
    expect(screen.getByText('oggi finora')).toBeInTheDocument();
    expect(screen.getByText('Questo mese')).toBeInTheDocument();
  });

  it('stati: caricamento, non configurato, entità mancanti, non disponibile', () => {
    const view = renderWithRuntime(<CostWidget {...props('cost_card_1', costSettings)} />, {
      entities: costEntities,
      entitiesLoaded: false,
    });
    expect(screen.getByRole('status')).toHaveTextContent(/Caricamento/);
    view.update({ entitiesLoaded: true }, <CostWidget {...props('cost_card_1', {})} />);
    expect(screen.getByText('Scegli le entità dei costi')).toBeInTheDocument();
    view.update({ entities: {} }, <CostWidget {...props('cost_card_1', costSettings)} />);
    expect(screen.getByText('Entità dei costi non trovate')).toBeInTheDocument();
    view.update({
      entities: fixtureEntities([
        fixtureEntity('sensor.cost_today', 'unavailable'),
        fixtureEntity('sensor.cost_month', 'unknown'),
      ]),
    });
    expect(screen.getByText('Non disponibile')).toBeInTheDocument();
  });

  it('serie dello storico: secchi orari, variazioni e copertura dell’intervallo', () => {
    const now = new Date('2026-10-06T12:00:00Z').getTime();
    const at = (hoursAgo: number, value: number) => ({ time: new Date(now - hoursAgo * 3_600_000), value });
    const points = [at(3.5, 1), at(3.2, 1.5), at(2.5, 2), at(1.2, 4)];
    const buckets = buildBuckets(points, 24, now);
    expect(buckets.map((point) => point.value)).toEqual([1.5, 2, 4]);
    expect(buildDeltaSeries(buckets).map((point) => point.value)).toEqual([0.5, 2]);
    const line = buildCostSeries(points, {
      rangeHours: 24,
      view: 'line',
      metric: 'value',
      start: new Date(now - 24 * 3_600_000),
      end: new Date(now),
    });
    expect(line[0]?.time.getTime()).toBe(now - 24 * 3_600_000);
    expect(line[line.length - 1]?.time.getTime()).toBe(now);
  });

  it('dettagli: storico da Home Assistant, statistiche e cambio di periodo', async () => {
    const now = Date.now();
    const { conn, sendMessagePromise } = fakeConnection({
      'history/history_during_period': () => ({
        'sensor.cost_today': [
          { s: '1', lu: (now - 5 * 3_600_000) / 1000 },
          { s: '2.5', lu: (now - 2 * 3_600_000) / 1000 },
          { s: '3.456', lu: (now - 600_000) / 1000 },
        ],
      }),
      'recorder/statistics_during_period': () => ({}),
    });
    renderWithRuntime(<CostDetails id="cost_card_1" settingsKey="k" settings={costSettings} onClose={() => {}} />, {
      conn,
      entities: costEntities,
    });
    expect(await screen.findByRole('img', { name: /Costi di oggi, ultime 24 ore/ })).toBeInTheDocument();
    expect(screen.getByText('Massimo')).toBeInTheDocument();
    expect(sendMessagePromise).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'history/history_during_period', entity_ids: ['sensor.cost_today'], minimal_response: true })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Questo mese' }));
    await waitFor(() =>
      expect(sendMessagePromise).toHaveBeenCalledWith(expect.objectContaining({ entity_ids: ['sensor.cost_month'] }))
    );
  });

  it('dettagli senza collegamento: messaggio chiaro', () => {
    renderWithRuntime(<CostDetails id="cost_card_1" settingsKey="k" settings={costSettings} onClose={() => {}} />, {
      entities: costEntities,
    });
    expect(screen.getByText('Storico non disponibile: Home Assistant non è collegato.')).toBeInTheDocument();
  });
});

describe('Nordpool', () => {
  const now = new Date(2026, 9, 6, 14, 20);
  const today = Array.from({ length: 24 }, (_, hour) => (hour === 14 ? 0.5 : 0.2));
  const nordpool = fixtureEntity('sensor.nordpool', '0.5', { today, tomorrow_valid: false, currency: 'EUR' });

  it('fasce dal tempo, prezzo attuale dallo stato e livello rispetto alla media', () => {
    const series = priceSeries(nordpool, now);
    expect(series.points).toHaveLength(24);
    expect(series.currentIndex).toBe(14);
    expect(series.current).toBe(0.5);
    expect(priceLevel(series.current, series.stats?.avg)).toBe('veryHigh');
    expect(priceLevel(0.1, 0.2)).toBe('low');
  });

  it('usa raw_today con inizio e fine quando presenti (quarti d’ora)', () => {
    const start = new Date(2026, 9, 6, 0, 0).getTime();
    const raw = Array.from({ length: 96 }, (_, index) => ({
      start: new Date(start + index * 900_000).toISOString(),
      end: new Date(start + (index + 1) * 900_000).toISOString(),
      value: index / 100,
    }));
    const series = priceSeries(fixtureEntity('sensor.np', '0.57', { raw_today: raw }), now);
    expect(series.points).toHaveLength(96);
    expect(series.currentIndex).toBe(57);
  });

  it('sostegno norvegese come il legacy', () => {
    expect(withSupport(80)).toBe(80);
    expect(withSupport(200)).toBeCloseTo(200 - (200 / 1.25 - 75) * 0.9 * 1.25);
  });

  it('widget: prezzo, livello e stati', () => {
    const view = renderWithRuntime(
      <NordpoolWidget {...props('nordpool_card_1', { nordpoolId: 'sensor.nordpool', decimals: 2 })} />,
      { entities: fixtureEntities([nordpool]) }
    );
    expect(screen.getByText('0,50')).toBeInTheDocument();
    expect(screen.getByText('€')).toBeInTheDocument();
    // Currency of Home Assistant, not the unit or currency attribute of the sensor.
    view.update({ haConfig: withCurrency('USD') });
    expect(screen.getByText('$')).toBeInTheDocument();
    view.update({ haConfig: null });
    expect(screen.queryByText('€')).not.toBeInTheDocument();
    view.update({ haConfig: fixtureConfig });
    view.update({}, <NordpoolWidget {...props('nordpool_card_1', {})} />);
    expect(screen.getByText('Scegli il sensore dei prezzi')).toBeInTheDocument();
    view.update({ entities: {} }, <NordpoolWidget {...props('nordpool_card_1', { nordpoolId: 'sensor.nordpool' })} />);
    expect(screen.getByText('Sensore dei prezzi non trovato')).toBeInTheDocument();
  });

  it('dettagli: esplorazione da tastiera e sostegno salvato nelle impostazioni del widget', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(now);
    const saveCardSetting = vi.fn();
    renderWithRuntime(
      <NordpoolDetails id="nordpool_card_1" settingsKey="home::nordpool_card_1" settings={{ nordpoolId: 'sensor.nordpool' }} onClose={() => {}} />,
      { entities: fixtureEntities([nordpool]), saveCardSetting }
    );
    const explorer = screen.getByRole('slider', { name: 'Fascia oraria' });
    expect(explorer).toHaveAttribute('aria-valuenow', '14');
    // Dragging across the chart holds the pointer: no long press into edit mode.
    expect(explorer).toHaveAttribute('data-no-long-press');
    fireEvent.keyDown(explorer, { key: 'ArrowRight' });
    expect(explorer).toHaveAttribute('aria-valuenow', '15');
    expect(explorer.getAttribute('aria-valuetext')).toMatch(/^Oggi 15:00–16:00: 0,20 €$/);
    fireEvent.click(screen.getByRole('switch'));
    expect(saveCardSetting).toHaveBeenCalledWith('home::nordpool_card_1', 'showWithSupport', true);
  });
});
