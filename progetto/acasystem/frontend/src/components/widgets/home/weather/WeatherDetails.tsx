import { useId, useState } from 'react';
import type { HassEntity } from 'home-assistant-js-websocket';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { Caption, Display, Heading, Numeric, Segmented, Skeleton } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { attributeNumber, attributeString, settingEntity, settingString } from '../shared/entity';
import { MISSING_VALUE, formatWithUnit, localeFor, toFiniteNumber } from '../shared/format';
import { HomeIcon } from '../shared/HomeIcon';
import { WidgetNotice } from '../shared/WidgetShell';
import { TemperatureLine, rangeText } from './TemperatureLine';
import { useForecast, useSensorHistory } from './useWeatherData';
import {
  forecastDate,
  forecastItems,
  forecastLabel,
  readWeather,
  type ForecastType,
  type TimePoint,
} from './weatherModel';

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
  const { entities } = useWidgetRuntime();
  const { entityId, entity } = settingEntity(entities, settings, 'weatherId');
  if (!entityId || !entity) {
    return (
      <WidgetNotice
        icon="cloud"
        title="Meteo"
        message={
          entityId
            ? 'La fonte meteo non è più presente in Home Assistant.'
            : 'Scegli una fonte meteo nelle impostazioni del widget.'
        }
        detail={entityId}
      />
    );
  }
  const tempId = settingString(settings, 'tempId');
  return (
    <WeatherDetailsContent
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
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const trendId = `meteo-${uid}-andamento`;
  const forecastId = `meteo-${uid}-previsioni`;
  const view = readWeather(weather, tempSensor, haConfig);
  const [forecastType, setForecastType] = useState<ForecastType>('hourly');
  const [period, setPeriod] = useState<Period>('12');
  const hours = Number(period);
  const hasSensor = Boolean(tempId && tempSensor);
  const { forecast, loading: forecastLoading } = useForecast(conn, weather, forecastType);
  const { points: historyPoints, loading: historyLoading } = useSensorHistory(
    conn,
    hasSensor ? tempId : undefined,
    hours
  );

  const forecastSeries: TimePoint[] = forecast
    .map((entry) => ({ time: forecastDate(entry), value: toFiniteNumber(entry.temperature) }))
    .filter(
      (point): point is TimePoint => point.value !== null && !Number.isNaN(point.time.getTime())
    );
  const series = hasSensor ? historyPoints : forecastSeries;
  const seriesLoading = hasSensor ? historyLoading : forecastLoading;
  const list = forecastItems(forecast, weather.state, forecastType === 'hourly' ? 12 : 7);
  // History comes from the sensor, the forecast from the weather entity: each in its unit.
  const seriesUnit = hasSensor ? view.unit : view.weatherUnit;
  const format = (value: number) => formatWithUnit(value, seriesUnit, locale);

  const { pressureUnit, windUnit, precipitationUnit } = view;
  const wind = attributeNumber(weather, 'wind_speed');
  const gust = attributeNumber(weather, 'wind_gust_speed');
  const windText = wind === null ? MISSING_VALUE : formatWithUnit(wind, windUnit, locale);
  const gustText =
    wind !== null && gust !== null && gust !== wind
      ? `raffiche ${formatWithUnit(gust, windUnit, locale)}`
      : undefined;
  const details: Array<{ key: string; label: string; value: string; note?: string }> = [
    {
      key: 'humidity',
      label: 'Umidità',
      value: formatWithUnit(attributeNumber(weather, 'humidity'), '%', locale, 0),
    },
    {
      key: 'pressure',
      label: 'Pressione',
      value: formatWithUnit(attributeNumber(weather, 'pressure'), pressureUnit, locale, 0),
    },
    { key: 'wind', label: 'Vento', value: windText, note: gustText },
    {
      key: 'dew',
      label: 'Punto di rugiada',
      value: formatWithUnit(attributeNumber(weather, 'dew_point'), view.weatherUnit, locale),
    },
    {
      key: 'precip',
      label: 'Precipitazioni',
      value: formatWithUnit(attributeNumber(weather, 'precipitation'), precipitationUnit, locale),
    },
  ];

  return (
    <div className="home-details">
      <div className="home-weather__current">
        <HomeIcon
          name={view.condition.icon}
          size="lg"
          tone={view.unavailable ? 'danger' : undefined}
          className="home-weather__icon"
        />
        <div className="home-stack">
          <Caption as="p">{attributeString(weather, 'friendly_name') ?? 'Meteo'}</Caption>
          <Display as="p" size="md">
            <Numeric>{formatWithUnit(view.temperature, view.unit, locale)}</Numeric>
          </Display>
          <Caption as="p" tone={view.unavailable ? 'danger' : 'muted'}>
            {view.condition.label}
          </Caption>
        </div>
      </div>

      <dl className="home-facts">
        {details.map((detail) => (
          <div key={detail.key} className="home-facts__item">
            <dt>
              <Caption>{detail.label}</Caption>
            </dt>
            <dd className="home-stack">
              <Numeric>{detail.value}</Numeric>
              {detail.note && <Caption>{detail.note}</Caption>}
            </dd>
          </div>
        ))}
      </dl>

      <section className="home-section" aria-labelledby={trendId}>
        <div className="home-row home-row--between home-row--wrap">
          <Heading level={3} size="sm" id={trendId}>
            {hasSensor ? 'Andamento della temperatura' : 'Temperatura prevista'}
          </Heading>
          {hasSensor && (
            <Segmented<Period>
              label="Periodo"
              size="sm"
              options={PERIODS}
              value={period}
              onChange={setPeriod}
            />
          )}
        </div>
        {seriesLoading ? (
          <Skeleton
            variant="chart"
            style={{ height: '8rem' }}
            label="Caricamento delle temperature…"
          />
        ) : series.length >= 2 ? (
          <TemperatureLine
            points={series}
            label={`${hasSensor ? `Ultime ${hours} ore` : 'Previsione'}, ${rangeText(series, format)}`}
            className="home-weather__chart"
          />
        ) : (
          <Caption as="p">
            {hasSensor
              ? 'Nessuno storico disponibile per questo periodo.'
              : 'Nessuna previsione disponibile.'}
          </Caption>
        )}
      </section>

      <section className="home-section" aria-labelledby={forecastId}>
        <div className="home-row home-row--between home-row--wrap">
          <Heading level={3} size="sm" id={forecastId}>
            Previsioni
          </Heading>
          <Segmented<ForecastType>
            label="Tipo di previsione"
            size="sm"
            options={FORECAST_TYPES}
            value={forecastType}
            onChange={setForecastType}
          />
        </div>
        {forecastLoading ? (
          <Skeleton rows={3} label="Caricamento delle previsioni…" />
        ) : list.length === 0 ? (
          <Caption as="p">Nessuna previsione disponibile.</Caption>
        ) : (
          <ul
            className="home-forecast home-forecast--scroll"
            aria-label={forecastType === 'hourly' ? 'Previsioni orarie' : 'Previsioni giornaliere'}
            data-no-long-press=""
          >
            {list.map((item) => (
              <li key={item.key} className="home-forecast__item">
                <Caption>{forecastLabel(item, forecastType, locale)}</Caption>
                <HomeIcon name={item.condition.icon} size="lg" />
                <span className="sr-only">{item.condition.label}</span>
                <Numeric className="home-forecast__value">
                  {formatWithUnit(item.temperature, view.weatherUnit, locale)}
                </Numeric>
                {item.precipitation !== null && item.precipitation > 0 && (
                  <Caption>
                    <Numeric>
                      {formatWithUnit(item.precipitation, precipitationUnit, locale)}
                    </Numeric>
                  </Caption>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
