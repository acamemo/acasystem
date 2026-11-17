import type { HassEntity } from 'home-assistant-js-websocket';
import type { CardSettings } from '@/@types/dashboard';
import type { CellSize, WidgetProps } from '@/@types/launcher';
import { Caption } from '@/components/primitives';
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
import './weather.css';

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

export function WeatherWidget({
  id,
  settings,
  size,
  editMode,
  openDetails,
}: WidgetProps & {
  openDetails?: () => void;
}) {
  const runtime = useWidgetRuntime();
  const { entityId, entity } = settingEntity(runtime.entities, settings, 'weatherId');
  const name = weatherName(runtime.customNames, id, settings, entity);
  const onPress = openDetails ?? (() => runtime.openDetails(id));

  if (!runtime.entitiesLoaded) {
    return (
      <WidgetShell name={name} size={size} editMode={editMode} className="home-weather">
        <WidgetLoading size={size} label="Caricamento del meteo…" />
      </WidgetShell>
    );
  }
  if (!entityId || !entity || !entityId.startsWith('weather.')) {
    return (
      <WidgetShell
        name={name}
        size={size}
        editMode={editMode}
        state="missing"
        className="home-weather"
        onPress={onPress}
        pressLabel={`Apri il meteo di ${name}`}
      >
        <WidgetNotice
          icon="cloud"
          title={name}
          message={
            entityId
              ? 'La fonte meteo non è più disponibile.'
              : 'Scegli una fonte meteo nelle impostazioni del widget.'
          }
          detail={entityId}
          compact={size.h < 2 || size.w < 2}
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
      onPress={onPress}
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
  onPress: () => void;
}

function WeatherCard({ id, name, weather, settings, size, editMode, onPress }: WeatherCardProps) {
  const { entities, conn, language, haConfig } = useWidgetRuntime();
  const locale = localeFor(language);
  const tempId = settingString(settings, 'tempId');
  const view = readWeather(weather, tempId ? entities[tempId] : undefined, haConfig);
  const hours = graphHours(settings.graphHistoryHours);
  const { forecasts, history, forecastStatus, forecastSource } = useCardWeather(
    conn,
    id,
    weather.entity_id,
    view.temperatureSource === 'sensor' ? tempId : undefined,
    weather,
    view.unit,
    hours
  );
  const wide = size.w >= 3;
  const tall = size.h >= 2;
  const tiny = size.w === 1;
  const forecastType: ForecastType = forecasts.hourly.length > 0 ? 'hourly' : 'daily';
  const source = forecastType === 'hourly' ? forecasts.hourly : forecasts.daily;
  const limit = !wide ? 0 : tall ? (size.w >= 4 ? 6 : 4) : size.w >= 4 ? 4 : 3;
  const items = view.unavailable ? [] : forecastItems(source, undefined, limit);
  const series =
    tall && !tiny && !view.unavailable ? graphSeries(history, source, null, hours) : [];
  const graphUnit = history.length >= 2 ? view.unit : view.weatherUnit;
  const format = (value: number) => formatWithUnit(value, graphUnit, locale);
  const graphLabel =
    history.length >= 2
      ? `Temperatura delle ultime ${hours} ore, ${rangeText(series, format)}`
      : `Temperatura prevista, ${rangeText(series, format)}`;
  const showsForecast = items.length > 0 || (series.length >= 2 && history.length < 2);

  return (
    <WidgetShell
      name={name}
      size={size}
      editMode={editMode}
      state={view.unavailable ? 'unavailable' : view.state}
      onPress={onPress}
      pressLabel={`Apri il meteo di ${name}`}
      className="home-weather"
    >
      <div className="home-weather__summary">
        <div className="home-weather__reading">
          <Caption className="home-weather__name">{name}</Caption>
          <span className="home-weather__temperature">
            {formatWithUnit(view.temperature, view.unit, locale)}
          </span>
          <Caption className="home-weather__condition">{view.condition.label}</Caption>
          {tempId && view.temperatureSource !== 'sensor' && (
            <span className="sr-only">
              Sensore locale non disponibile. Temperatura dalla fonte meteo.
            </span>
          )}
        </div>
        {tall && !tiny && (
          <HomeIcon
            name={view.condition.icon}
            size="lg"
            tone={view.unavailable ? 'danger' : undefined}
            className="home-weather__icon"
          />
        )}
        {!tall && items.length > 0 && (
          <ForecastRow items={items} type={forecastType} unit={view.weatherUnit} locale={locale} />
        )}
      </div>
      {series.length >= 2 && (
        <TemperatureLine points={series} label={graphLabel} className="home-weather__graph" />
      )}
      {tall && items.length > 0 && (
        <ForecastRow items={items} type={forecastType} unit={view.weatherUnit} locale={locale} />
      )}
      {showsForecast &&
        (forecastSource[forecastType] === 'legacy' || forecastStatus[forecastType] === 'error') && (
          <Caption className="home-weather__provenance">
            {forecastStatus[forecastType] === 'error'
              ? forecastSource[forecastType] === 'ha'
                ? 'Previsioni precedenti, aggiornamento non riuscito.'
                : 'Previsioni da attributo HA, aggiornamento non riuscito.'
              : 'Previsioni da attributo HA'}
          </Caption>
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
      className="home-forecast home-weather__forecast"
      aria-label={type === 'hourly' ? 'Previsioni orarie' : 'Previsioni giornaliere'}
    >
      {items.map((item) => (
        <li key={item.key} className="home-forecast__item">
          <Caption>{forecastLabel(item, type, locale)}</Caption>
          <HomeIcon name={item.condition.icon} size="md" />
          <span className="sr-only">{item.condition.label}</span>
          <span className="home-forecast__value">
            {formatWithUnit(item.temperature, unit, locale, 0)}
          </span>
        </li>
      ))}
    </ul>
  );
}
