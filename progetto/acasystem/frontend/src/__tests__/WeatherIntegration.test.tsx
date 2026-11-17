import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CategoryWidgetContent } from '@/templates/launcher/CategoryWidgetContent';
import { coverCalendarWidget, coverClockWidget, coverWeatherWidget } from '@/components/widgets/home/cover';
import { homeWeatherSettings } from '@/components/widgets/home/cover/CoverWidgets';
import { isCategoryWidgetReady } from '@/domain/launcher/categoryPages';
import { weatherWidget } from '@/components/widgets/home/weather';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { WidgetDetailsContent } from '@/templates/launcher/DetailsSheet';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { renderDetails, renderWidget } from './ComfortHarness';

afterEach(cleanup);

const source = (id: string, name: string, value = 18) => fixtureEntity(id, 'rainy', {
  friendly_name: name, temperature: value, temperature_unit: '°C',
});

describe('Meteo: raccordi fra categorie, fonti domestiche e schede storiche', () => {
  it('deriva la fonte domestica senza scrivere nelle impostazioni originali', () => {
    const settings = Object.freeze({ categoryWidgetType: 'cover_weather', graphHistoryHours: 6 });
    const entities = fixtureEntities([source('weather.zeta', 'Altrove'), source('weather.home', 'Casa')]);
    expect(homeWeatherSettings(settings, entities)).toEqual({ ...settings, weatherId: 'weather.home' });
    expect(settings).not.toHaveProperty('weatherId');
    expect(homeWeatherSettings(settings, {})).toBe(settings);
  });

  it('mantiene la priorità deterministica storica anche fra due fonti preferite', () => {
    const entities = fixtureEntities([
      source('weather.home', 'Casa'), source('weather.forecast_home', 'Previsioni casa'),
    ]);
    expect(homeWeatherSettings({}, entities).weatherId).toBe('weather.forecast_home');
  });

  it('rispetta la fonte esplicita e non sostituisce un riferimento scomparso', () => {
    const settings = { weatherId: 'weather.scomparsa', tempId: 'sensor.esterno' };
    expect(homeWeatherSettings(settings, fixtureEntities([source('weather.home', 'Casa')]))).toBe(settings);
  });

  it('non trasforma una configurazione malformata in una selezione automatica', () => {
    const settings = { weatherId: 42 };
    expect(homeWeatherSettings(settings, fixtureEntities([source('weather.home', 'Casa')]))).toBe(settings);
  });

  it('rientrare in automatico usa la fonte corrente senza lasciare dati della precedente', () => {
    const settings = { weatherId: '' };
    expect(homeWeatherSettings(settings, fixtureEntities([source('weather.alfa', 'A')])).weatherId).toBe('weather.alfa');
    expect(homeWeatherSettings(settings, fixtureEntities([source('weather.beta', 'B')])).weatherId).toBe('weather.beta');
  });

  it('Meteo di casa ha i dettagli comuni e mantiene identità e taglie salvate', () => {
    expect(coverWeatherWidget.matches('cover_weather_legacy', {})).toBe(true);
    expect(coverWeatherWidget.frameless).toBe(false);
    expect(coverWeatherWidget.Details).toBeDefined();
    expect(coverWeatherWidget.sizes.min).toEqual({ w: 1, h: 1 });
    expect(coverClockWidget.frameless).toBe(true);
    expect(coverCalendarWidget.frameless).toBe(true);
  });

  it('Meteo richiede una fonte, Meteo di casa conserva la modalità automatica', () => {
    expect(isCategoryWidgetReady({ categoryWidgetType: 'weather' })).toBe(false);
    expect(isCategoryWidgetReady({ categoryWidgetType: 'weather', weatherId: 'weather.casa' })).toBe(true);
    expect(isCategoryWidgetReady({ categoryWidgetType: 'cover_weather' })).toBe(true);
  });

  it('la categoria Meteo usa la stessa tessera e apre il proprio widget', () => {
    const runtime = createFixtureRuntime({ entities: fixtureEntities([source('weather.casa', 'Giardino')]), openDetails: vi.fn() });
    render(<WidgetRuntimeProvider value={runtime}>
      <CategoryWidgetContent definition={weatherWidget} id="weather_temp_personale"
        settingsKey="pagina::weather_temp_personale" settings={{ categoryWidgetType: 'weather', weatherId: 'weather.casa' }}
        size={{ w: 2, h: 2 }} editMode={false} onConfigure={() => undefined} />
    </WidgetRuntimeProvider>);
    expect(screen.getByRole('group', { name: 'Giardino' })).toHaveClass('home-weather');
    fireEvent.click(screen.getByRole('button', { name: 'Apri il meteo di Giardino' }));
    expect(runtime.openDetails).toHaveBeenCalledWith('weather_temp_personale');
  });

  it.each([
    ['weather', weatherWidget], ['cover_weather', coverWeatherWidget],
  ] as const)('la schermata %s monta una sola copia dei dettagli', (type, definition) => {
    const runtime = createFixtureRuntime({ entities: fixtureEntities([source('weather.casa', 'Giardino')]) });
    const { container } = render(<WidgetRuntimeProvider value={runtime}>
      <WidgetDetailsContent definition={definition} onClose={() => undefined} target={{
        widgetId: type === 'weather' ? 'weather_temp_personale' : 'cover_weather_personale',
        settingsKey: 'pagina::meteo', pageId: 'pagina', title: 'Giardino',
        settings: { categoryWidgetType: type, weatherId: 'weather.casa' },
      }} />
    </WidgetRuntimeProvider>);
    expect(container.querySelectorAll('.home-weather-details')).toHaveLength(1);
  });

  it('la Home domestica usa l’associazione esplicita senza richiedere quella automatica', () => {
    renderWidget(coverWeatherWidget, { id: 'cover_weather_personale', settings: { weatherId: 'weather.altrove' },
      runtime: { entities: fixtureEntities([source('weather.home', 'Casa', 12), source('weather.altrove', 'Montagna', -3)]) },
    });
    expect(screen.getByText('-3 °C')).toBeInTheDocument();
    expect(screen.queryByText('12 °C')).toBeNull();
  });

  it('la Home domestica senza fonti mostra una spiegazione senza sparire', () => {
    renderWidget(coverWeatherWidget, { id: 'cover_weather_personale', runtime: { entities: {} } });
    expect(screen.getByText('Scegli una fonte meteo nelle impostazioni del widget.')).toBeInTheDocument();
  });

  it('i dettagli domestici seguono il cambio di fonte e conservano le impostazioni originali', () => {
    const settings = Object.freeze({ categoryWidgetType: 'cover_weather' });
    const view = renderDetails(coverWeatherWidget, { id: 'cover_weather_personale', settings,
      runtime: { entities: fixtureEntities([source('weather.alfa', 'Alfa', 14)]) },
    });
    expect(screen.getByText('14 °C')).toBeInTheDocument();
    view.update({ id: 'cover_weather_personale', settings,
      runtime: { entities: fixtureEntities([source('weather.beta', 'Beta', 9)]) },
    });
    expect(screen.getByText('9 °C')).toBeInTheDocument();
    expect(screen.queryByText('14 °C')).toBeNull();
    expect(settings).not.toHaveProperty('weatherId');
  });
});
