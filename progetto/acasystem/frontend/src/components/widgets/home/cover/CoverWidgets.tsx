import type { WidgetProps, WidgetDetailsProps } from '@/@types/launcher';
import type { CardSettings } from '@/@types/dashboard';
import type { EntityMap } from '@/@types/ha';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { WeatherWidget } from '../weather/WeatherWidget';
import { WeatherDetails } from '../weather/WeatherDetails';
import { CoverCalendar, CoverClock } from '@/components/system/cover/CoverCards';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { useNow } from '@/hooks/launcher/useNow';
import { coverWeatherEntity } from './CoverWeather';
import './coverWidgets.css';

/**
 * The cards of the cover as widgets (REP-20261007-030): the same clock, calendar and weather
 * cards, sized on their cell (a size container) instead of on the cover page, so they move and
 * resize like any widget and can live on any page.
 */
function CoverCell({ children }: { children: React.ReactNode }) {
  return <div className="aca-cover-widget">{children}</div>;
}

export function ClockWidget(_props: WidgetProps) {
  const now = useNow(1000, usePageVisible());
  return (
    <CoverCell>
      <CoverClock now={now} />
    </CoverCell>
  );
}

export function DateWidget(_props: WidgetProps) {
  const now = useNow(60000, usePageVisible());
  return (
    <CoverCell>
      <CoverCalendar now={now} />
    </CoverCell>
  );
}

/** Automatic source is derived locally; saved associations and the profile are never rewritten. */
export function homeWeatherSettings(settings: CardSettings, entities: EntityMap): CardSettings {
  if (settings.weatherId != null && settings.weatherId !== '') return settings;
  const weatherId = coverWeatherEntity(entities)?.entity_id;
  return weatherId ? { ...settings, weatherId } : settings;
}

export function HomeWeatherWidget(props: WidgetProps) {
  const { entities } = useWidgetRuntime();
  return <WeatherWidget {...props} settings={homeWeatherSettings(props.settings, entities)} />;
}

export function HomeWeatherDetails(props: WidgetDetailsProps) {
  const { entities } = useWidgetRuntime();
  return <WeatherDetails {...props} settings={homeWeatherSettings(props.settings, entities)} />;
}
