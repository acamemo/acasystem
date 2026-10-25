import type { HassEntity } from 'home-assistant-js-websocket';
import type { EntityMap } from '@/@types/ha';
import { Surface } from '@/components/primitives';
import { HomeIcon } from '@/components/widgets/home/shared/HomeIcon';
import { readWeather } from '@/components/widgets/home/weather/weatherModel';
import { useOptionalWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import '@/components/system/cover/coverCards.css';

/**
 * Weather source of the cover: the first weather entity of Home Assistant by id, preferring
 * the default «weather.home» / «weather.forecast_home» when present.
 */
export function coverWeatherEntity(entities: EntityMap): HassEntity | undefined {
  const ids = Object.keys(entities)
    .filter((id) => id.startsWith('weather.'))
    .sort();
  const preferred = ids.find((id) => id === 'weather.home' || id === 'weather.forecast_home');
  const id = preferred ?? ids[0];
  return id ? entities[id] : undefined;
}

/**
 * Weather card of the cover (REP-20261007-019): condition icon in the accent, the temperature
 * large and dark like the day number, the condition and the place below. Not shown when Home
 * Assistant has no weather entity.
 */
export function CoverWeather() {
  const runtime = useOptionalWidgetRuntime();
  const entity = runtime ? coverWeatherEntity(runtime.entities) : undefined;
  if (!runtime || !entity) return null;
  const view = readWeather(entity, undefined, runtime.haConfig);
  const place =
    typeof entity.attributes.friendly_name === 'string' ? entity.attributes.friendly_name : '';
  // The source is there but not answering (no Internet, service down): say so plainly
  // instead of «—» and «Non disponibile» (REP-20261007-025).
  if (view.unavailable) {
    return (
      <Surface className="aca-cover-card" contentClassName="aca-cover-card__content">
        <div
          className="aca-cover-weather aca-cover-weather--offline"
          role="group"
          aria-label="Meteo non raggiungibile: nuovo tentativo a breve"
        >
          <span className="aca-cover-weather__icon">
            <HomeIcon name="cloud" size="lg" />
          </span>
          <span className="aca-cover-weather__condition" aria-hidden="true">
            Meteo non raggiungibile
          </span>
          <span className="aca-cover-weather__place" aria-hidden="true">
            Nuovo tentativo a breve
          </span>
        </div>
      </Surface>
    );
  }
  const temperature =
    view.temperature === null ? '—' : `${Math.round(view.temperature)}${view.unit}`;
  return (
    <Surface className="aca-cover-card" contentClassName="aca-cover-card__content">
      <div
        className="aca-cover-weather"
        role="group"
        aria-label={`Meteo${place ? ` ${place}` : ''}: ${view.condition.label}, ${temperature}`}
      >
        {/* The icon draws in currentColor (inline): the accent comes from this wrapper. */}
        <span className="aca-cover-weather__icon">
          <HomeIcon name={view.condition.icon} size="lg" />
        </span>
        <span className="aca-cover-weather__temp" aria-hidden="true">
          {temperature}
        </span>
        <span className="aca-cover-weather__condition" aria-hidden="true">
          {view.condition.label}
        </span>
        {place && (
          <span className="aca-cover-weather__place" aria-hidden="true">
            {place}
          </span>
        )}
      </div>
    </Surface>
  );
}
