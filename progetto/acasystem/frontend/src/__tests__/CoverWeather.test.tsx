import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { CoverWeather, coverWeatherEntity } from '@/components/widgets/home/cover/CoverWeather';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';

afterEach(cleanup);

const weather = (id: string, state = 'sunny', temperature = 21.4) =>
  fixtureEntity(id, state, {
    friendly_name: 'Casa',
    temperature,
    temperature_unit: '°C',
  });

describe('meteo della copertina (REP-20261007-019)', () => {
  it('sceglie weather.home se c’è, altrimenti la prima fonte meteo', () => {
    const entities = fixtureEntities([weather('weather.zeta'), weather('weather.home')]);
    expect(coverWeatherEntity(entities)?.entity_id).toBe('weather.home');
    const others = fixtureEntities([weather('weather.zeta'), weather('weather.alfa')]);
    expect(coverWeatherEntity(others)?.entity_id).toBe('weather.alfa');
    expect(coverWeatherEntity(fixtureEntities([]))).toBeUndefined();
  });

  it('mostra condizione, temperatura arrotondata e luogo', () => {
    const runtime = createFixtureRuntime({ entities: fixtureEntities([weather('weather.home')]) });
    render(
      <WidgetRuntimeProvider value={runtime}>
        <CoverWeather />
      </WidgetRuntimeProvider>
    );
    expect(screen.getByRole('group', { name: 'Meteo Casa: Soleggiato, 21°C' })).toBeInTheDocument();
  });

  it('non compare senza fonte meteo o fuori dal launcher', () => {
    const runtime = createFixtureRuntime({ entities: fixtureEntities([]) });
    const { container } = render(
      <WidgetRuntimeProvider value={runtime}>
        <CoverWeather />
      </WidgetRuntimeProvider>
    );
    expect(container).toBeEmptyDOMElement();
    cleanup();
    expect(render(<CoverWeather />).container).toBeEmptyDOMElement();
  });

  it('quando la fonte non risponde lo dice, senza temperatura (REP-20261007-025)', () => {
    const runtime = createFixtureRuntime({
      entities: fixtureEntities([weather('weather.home', 'unavailable')]),
    });
    render(
      <WidgetRuntimeProvider value={runtime}>
        <CoverWeather />
      </WidgetRuntimeProvider>
    );
    expect(
      screen.getByRole('group', { name: 'Meteo non raggiungibile: nuovo tentativo a breve' })
    ).toBeInTheDocument();
    expect(screen.queryByText('—')).toBeNull();
  });
});
