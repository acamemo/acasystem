import type { HassEntity } from 'home-assistant-js-websocket';
import type { CardSettings } from '@/@types/dashboard';
import type { CellSize, WidgetProps } from '@/@types/launcher';
import { Caption, Display, Numeric } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { attributeString, settingEntity, settingString } from '../shared/entity';
import { formatWithUnit, localeFor } from '../shared/format';
import { HomeIcon } from '../shared/HomeIcon';
import { WidgetLoading, WidgetNotice, WidgetShell } from '../shared/WidgetShell';
import { TemperatureLine, rangeText } from './TemperatureLine';
import { useCardWeather } from './useWeatherData';
import {
  forecastItems,
  forecastLabel,
  graphHours,
  graphSeries,
  readWeather,
  type ForecastItem,
  type ForecastType,
} from './weatherModel';

/** Name of the card: custom name, subtitle, friendly name, then «Meteo». */
function weatherName(
  customNames: Record<string, string>,
  id: string,
  settings: CardSettings,
  entity: HassEntity | undefined
): string {
  return (
    customNames[id] ||
    settingString(settings, 'subtitle') ||
    attributeString(entity, 'friendly_name') ||
    'Meteo'
  );
}

export function WeatherWidget({ id, settings, size, editMode }: WidgetProps) {
  const { entities, entitiesLoaded, customNames } = useWidgetRuntime();
  const { entityId, entity } = settingEntity(entities, settings, 'weatherId');
  const name = weatherName(customNames, id, settings, entity);

  if (!entitiesLoaded) {
    return (
      <WidgetShell name={name} size={size} editMode={editMode}>
        <WidgetLoading size={size} label="Caricamento del meteo…" />
      </WidgetShell>
    );
  }
  if (!entityId || !entity) {
    return (
      <WidgetShell name={name} size={size} editMode={editMode} state="missing">
        <WidgetNotice
          icon="cloud"
          title={name}
          message={
            entityId
              ? 'La fonte meteo non è più presente in Home Assistant.'
              : 'Scegli una fonte meteo nelle impostazioni del widget.'
          }
          detail={entityId}
          compact={size.h < 2}
        />
      </WidgetShell>
    );
  }
  return (
    <WeatherCard
      id={id}
      name={name}
      weather={entity}
      settings={settings}
      size={size}
      editMode={editMode}
    />
  );
}

interface WeatherCardProps {
  id: string;
  name: string;
  weather: HassEntity;
  settings: CardSettings;
  size: CellSize;
  editMode: boolean;
}

function WeatherCard({ id, name, weather, settings, size, editMode }: WeatherCardProps) {
  const { entities, conn, openDetails, language, haConfig } = useWidgetRuntime();
  const locale = localeFor(language);
  const tempId = settingString(settings, 'tempId');
  const tempSensor = tempId ? entities[tempId] : undefined;
  const view = readWeather(weather, tempSensor, haConfig);
  const { forecasts, history } = useCardWeather(conn, id, weather.entity_id, tempId, weather);
  const subtitle = settingString(settings, 'subtitle');

  const wide = size.w >= 3;
  const tall = size.h >= 2;
  const forecastType: ForecastType = forecasts.hourly.length > 0 ? 'hourly' : 'daily';
  const forecastSource = forecastType === 'hourly' ? forecasts.hourly : forecasts.daily;
  const forecastLimit = !wide ? 0 : tall ? (size.w >= 4 ? 6 : 4) : size.w >= 4 ? 4 : 3;
  const items = forecastItems(forecastSource, weather.state, forecastLimit);
  const showGraph = tall;
  const hours = graphHours(settings.graphHistoryHours);
  const series = showGraph
    ? graphSeries(
        history,
        forecasts.hourly.length > 0 ? forecasts.hourly : forecasts.daily,
        view.temperature,
        hours
      )
    : [];
  // History comes from the sensor, the forecast from the weather entity: each in its unit.
  const graphUnit = history.length >= 2 ? view.unit : view.weatherUnit;
  const format = (value: number) => formatWithUnit(value, graphUnit, locale);
  const graphLabel =
    history.length >= 2
      ? `Temperatura delle ultime ${hours} ore, ${rangeText(series, format)}`
      : `Temperatura prevista, ${rangeText(series, format)}`;

  const current = (
    <div className="home-weather__current">
      <HomeIcon
        name={view.condition.icon}
        size="lg"
        tone={view.unavailable ? 'danger' : undefined}
        className="home-weather__icon"
      />
      <div className="home-stack">
        <Display as="p" size="sm">
          <Numeric>{formatWithUnit(view.temperature, view.unit, locale)}</Numeric>
        </Display>
        <Caption className="home-truncate">{view.condition.label}</Caption>
        {subtitle && <Caption className="home-truncate home-hide-short">{subtitle}</Caption>}
      </div>
    </div>
  );

  return (
    <WidgetShell
      name={name}
      size={size}
      editMode={editMode}
      state={view.unavailable ? 'unavailable' : view.state}
      onPress={() => openDetails(id)}
      pressLabel={`Apri il meteo di ${name}`}
      className="home-weather"
    >
      {!tall ? (
        <div className="home-row home-row--between home-fill">
          {current}
          {items.length > 0 && (
            <ForecastRow
              items={items}
              type={forecastType}
              unit={view.weatherUnit}
              locale={locale}
            />
          )}
        </div>
      ) : (
        <>
          <div className="home-row home-row--between home-row--top">
            {current}
            {wide && series.length >= 2 && (
              <TemperatureLine points={series} label={graphLabel} className="home-weather__graph" />
            )}
          </div>
          {!wide && series.length >= 2 && (
            <TemperatureLine
              points={series}
              label={graphLabel}
              className="home-weather__graph home-push"
            />
          )}
          {items.length > 0 && (
            <div className="home-push">
              <ForecastRow
                items={items}
                type={forecastType}
                unit={view.weatherUnit}
                locale={locale}
              />
            </div>
          )}
        </>
      )}
    </WidgetShell>
  );
}

function ForecastRow({
  items,
  type,
  unit,
  locale,
}: {
  items: ForecastItem[];
  type: ForecastType;
  unit: string;
  locale: string;
}) {
  return (
    <ul
      className="home-forecast"
      aria-label={type === 'hourly' ? 'Previsioni orarie' : 'Previsioni giornaliere'}
    >
      {items.map((item) => (
        <li key={item.key} className="home-forecast__item">
          <Caption>{forecastLabel(item, type, locale)}</Caption>
          <HomeIcon name={item.condition.icon} size="md" />
          <span className="sr-only">{item.condition.label}</span>
          <Numeric className="home-forecast__value">
            {formatWithUnit(item.temperature, unit, locale, 0)}
          </Numeric>
        </li>
      ))}
    </ul>
  );
}
