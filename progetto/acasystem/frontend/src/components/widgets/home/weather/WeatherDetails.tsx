import { useId, useState } from 'react';
import type { HassEntity } from 'home-assistant-js-websocket';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { Button, Caption, Heading, Segmented, Skeleton } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { attributeString, settingEntity, settingString } from '../shared/entity';
import { formatWithUnit, localeFor } from '../shared/format';
import { HomeIcon } from '../shared/HomeIcon';
import { WidgetNotice } from '../shared/WidgetShell';
import { TemperatureLine, rangeText } from './TemperatureLine';
import { useForecast, useSensorHistory } from './useWeatherData';
import {
  availableForecastTypes,
  forecastDate,
  forecastItems,
  forecastLabel,
  readWeather,
  weatherMeasurement,
  weatherNumber,
  type ForecastType,
  type TimePoint,
} from './weatherModel';
import './weather.css';

const PERIODS = [
  { value: '6', label: '6 ore' },
  { value: '12', label: '12 ore' },
  { value: '24', label: '24 ore' },
] as const;
type Period = (typeof PERIODS)[number]['value'];
const FORECAST_TYPES = [
  { value: 'hourly', label: 'Oraria' },
  { value: 'daily', label: 'Giornaliera' },
] as const;

export function WeatherDetails({ settings }: WidgetDetailsProps) {
  const { entities, entitiesLoaded } = useWidgetRuntime();
  const { entityId, entity } = settingEntity(entities, settings, 'weatherId');
  if (!entitiesLoaded)
    return (
      <div className="home-details home-weather-details">
        <Skeleton rows={3} label="Caricamento del meteo…" />
      </div>
    );
  if (!entityId || !entity || !entityId.startsWith('weather.'))
    return (
      <div className="home-details home-weather-details">
        <WidgetNotice
          icon="cloud"
          title="Meteo"
          message={
            entityId
              ? 'La fonte meteo non è più disponibile.'
              : 'Scegli una fonte meteo nelle impostazioni del widget.'
          }
          detail={entityId}
        />
      </div>
    );
  const tempId = settingString(settings, 'tempId');
  return (
    <WeatherDetailsContent
      key={`${entityId}|${tempId ?? ''}`}
      weather={entity}
      tempSensor={tempId ? entities[tempId] : undefined}
      tempId={tempId}
    />
  );
}

function WeatherDetailsContent({
  weather,
  tempSensor,
  tempId,
}: {
  weather: HassEntity;
  tempSensor: HassEntity | undefined;
  tempId: string | undefined;
}) {
  const { conn, language, haConfig } = useWidgetRuntime();
  const locale = localeFor(language);
  const uid = useId();
  const view = readWeather(weather, tempSensor, haConfig);
  const supported = availableForecastTypes(weather);
  const [requestedType, setForecastType] = useState<ForecastType>(
    supported.includes('hourly') ? 'hourly' : 'daily'
  );
  const forecastType = supported.includes(requestedType)
    ? requestedType
    : (supported[0] ?? requestedType);
  const [period, setPeriod] = useState<Period>('12');
  const hours = Number(period);
  const sensorReady = Boolean(tempId && tempSensor && view.temperatureSource === 'sensor');
  const forecastState = useForecast(conn, weather, forecastType);
  const historyState = useSensorHistory(conn, sensorReady ? tempId : undefined, hours, view.unit);
  const list = forecastItems(forecastState.forecast, undefined, forecastType === 'hourly' ? 12 : 7);
  const forecastSeries: TimePoint[] = forecastState.forecast
    .map((entry) => ({
      time: forecastDate(entry),
      value: weatherNumber(entry.temperature),
    }))
    .filter(
      (point): point is TimePoint => point.value !== null && Number.isFinite(point.time.getTime())
    );
  const format = (value: number) => formatWithUnit(value, view.weatherUnit, locale);
  const historyFormat = (value: number) => formatWithUnit(value, view.unit, locale);
  const facts = [
    {
      label: 'Umidità',
      value: weatherMeasurement(weather, 'humidity'),
      unit: '%',
      max: 100,
      min: 0,
    },
    {
      label: 'Pressione',
      value: weatherMeasurement(weather, 'pressure'),
      unit: view.pressureUnit,
      min: 0,
    },
    {
      label: 'Vento',
      value: weatherMeasurement(weather, 'wind_speed'),
      unit: view.windUnit,
      min: 0,
    },
    {
      label: 'Raffiche',
      value: weatherMeasurement(weather, 'wind_gust_speed'),
      unit: view.windUnit,
      min: 0,
    },
    {
      label: 'Punto di rugiada',
      value: weatherMeasurement(weather, 'dew_point'),
      unit: view.weatherUnit,
    },
    {
      label: 'Precipitazioni',
      value: weatherMeasurement(weather, 'precipitation'),
      unit: view.precipitationUnit,
      min: 0,
    },
  ].filter(
    (fact) =>
      fact.value !== null &&
      (fact.min === undefined || fact.value >= fact.min) &&
      (fact.max === undefined || fact.value <= fact.max)
  );
  const sourceName = attributeString(weather, 'friendly_name') ?? 'Meteo';
  const updated = new Date(weather.last_updated);

  return (
    <div className="home-details home-weather-details">
      <section className="home-weather-details__current" aria-label="Condizioni attuali">
        <div className="home-weather__reading">
          <Heading level={2} size="md" className="home-weather-details__source">
            {sourceName}
          </Heading>
          <span className="home-weather__temperature">
            {formatWithUnit(view.temperature, view.unit, locale)}
          </span>
          <Caption as="p" tone={view.unavailable ? 'danger' : 'muted'}>
            {view.condition.label}
          </Caption>
        </div>
        <HomeIcon
          name={view.condition.icon}
          size="lg"
          tone={view.unavailable ? 'danger' : undefined}
          className="home-weather__icon"
        />
      </section>
      {tempId && !sensorReady && (
        <Caption as="p">
          Sensore locale non disponibile.
          {view.temperatureSource === 'weather' ? ' Temperatura dalla fonte meteo.' : ''}
        </Caption>
      )}
      {sensorReady && (
        <Caption as="p">
          Temperatura locale: {attributeString(tempSensor, 'friendly_name') ?? tempId}
        </Caption>
      )}
      {facts.length > 0 && (
        <dl className="home-facts home-weather-details__facts">
          {facts.map((fact) => (
            <div key={fact.label} className="home-facts__item">
              <dt>
                <Caption>{fact.label}</Caption>
              </dt>
              <dd>{formatWithUnit(fact.value, fact.unit, locale, fact.unit === '%' ? 0 : 1)}</dd>
            </div>
          ))}
        </dl>
      )}

      <section className="home-section" aria-labelledby={`${uid}-forecast`}>
        <div className="home-row home-row--between home-row--wrap">
          <Heading level={3} size="sm" id={`${uid}-forecast`}>
            Previsioni
          </Heading>
          {supported.length > 1 && (
            <Segmented<ForecastType>
              label="Tipo di previsione"
              size="sm"
              options={FORECAST_TYPES.filter((option) => supported.includes(option.value))}
              value={forecastType}
              onChange={setForecastType}
            />
          )}
        </div>
        {forecastState.loading ? (
          <Skeleton rows={3} label="Caricamento delle previsioni…" />
        ) : (
          <>
            {forecastState.error && (
              <div className="home-weather-details__status" role="status">
                <Caption as="p">Impossibile caricare le previsioni.</Caption>
                <Button variant="secondary" size="sm" onClick={forecastState.retry}>
                  Riprova
                </Button>
              </div>
            )}
            {list.length === 0 ? (
              !forecastState.error && (
                <Caption as="p">
                  {supported.length === 0
                    ? 'Nessuna previsione oraria o giornaliera disponibile.'
                    : 'Nessuna previsione disponibile.'}
                </Caption>
              )
            ) : (
              <>
                {forecastState.source === 'legacy' && (
                  <Caption as="p">
                    Previsioni da attributo HA
                    {forecastState.error ? ', aggiornamento non riuscito.' : '.'}
                  </Caption>
                )}
                {forecastState.source === 'ha' && forecastState.error && (
                  <Caption as="p">Previsioni precedenti, aggiornamento non riuscito.</Caption>
                )}
                {forecastSeries.length >= 2 && (
                  <TemperatureLine
                    points={forecastSeries}
                    label={`Temperatura prevista, ${rangeText(forecastSeries, format)}`}
                    className="home-weather__chart"
                  />
                )}
                <ul
                  className="home-forecast home-weather-details__forecast"
                  aria-label={
                    forecastType === 'hourly' ? 'Previsioni orarie' : 'Previsioni giornaliere'
                  }
                  data-no-long-press=""
                >
                  {list.map((item) => (
                    <li key={item.key} className="home-forecast__item">
                      <Caption>{forecastLabel(item, forecastType, locale)}</Caption>
                      <HomeIcon name={item.condition.icon} size="md" />
                      <Caption>{item.condition.label}</Caption>
                      <span className="home-forecast__value">
                        {formatWithUnit(item.temperature, view.weatherUnit, locale)}
                      </span>
                      {item.templow !== null && (
                        <Caption>
                          Min {formatWithUnit(item.templow, view.weatherUnit, locale)}
                        </Caption>
                      )}
                      {item.precipitation !== null && (
                        <Caption>
                          <span>
                            {formatWithUnit(item.precipitation, view.precipitationUnit, locale)}
                          </span>{' '}
                          di precipitazioni
                        </Caption>
                      )}
                      {item.precipitationProbability !== null && (
                        <Caption>
                          <span>
                            {formatWithUnit(item.precipitationProbability, '%', locale, 0)}
                          </span>{' '}
                          probabilità
                        </Caption>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </section>

      {tempId && (
        <section className="home-section" aria-labelledby={`${uid}-history`}>
          <div className="home-row home-row--between home-row--wrap">
            <Heading level={3} size="sm" id={`${uid}-history`}>
              Andamento della temperatura locale
            </Heading>
            {sensorReady && (
              <Segmented<Period>
                label="Periodo"
                size="sm"
                options={PERIODS}
                value={period}
                onChange={setPeriod}
              />
            )}
          </div>
          {!sensorReady ? (
            <Caption as="p">Storico non disponibile per il sensore selezionato.</Caption>
          ) : historyState.loading ? (
            <Skeleton variant="chart" label="Caricamento delle temperature…" />
          ) : historyState.error ? (
            <div className="home-weather-details__status" role="status">
              <Caption as="p">Impossibile caricare lo storico.</Caption>
              <Button variant="secondary" size="sm" onClick={historyState.retry}>
                Riprova storico
              </Button>
            </div>
          ) : historyState.points.length >= 2 ? (
            <TemperatureLine
              points={historyState.points}
              label={`Ultime ${hours} ore, ${rangeText(historyState.points, historyFormat)}`}
              className="home-weather__chart"
            />
          ) : (
            <Caption as="p">Nessuno storico disponibile per questo periodo.</Caption>
          )}
        </section>
      )}

      <details className="home-weather-details__technical">
        <summary>Informazioni sulla fonte</summary>
        <dl className="home-facts">
          <div className="home-facts__item">
            <dt>Fonte meteo</dt>
            <dd>{weather.entity_id}</dd>
          </div>
          {tempId && (
            <div className="home-facts__item">
              <dt>Sensore locale</dt>
              <dd>{tempId}</dd>
            </div>
          )}
          {Number.isFinite(updated.getTime()) && (
            <div className="home-facts__item">
              <dt>Aggiornamento HA</dt>
              <dd>
                <time dateTime={updated.toISOString()}>{updated.toLocaleString(locale)}</time>
              </dd>
            </div>
          )}
          {forecastState.source && (
            <div className="home-facts__item">
              <dt>Previsioni</dt>
              <dd>
                {forecastState.source === 'ha'
                  ? 'Risposta Home Assistant'
                  : 'Attributo della fonte'}
              </dd>
            </div>
          )}
        </dl>
      </details>
    </div>
  );
}
