import type { WidgetProps } from '@/@types/launcher';
import { CoverCalendar, CoverClock } from '@/components/system/cover/CoverCards';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { useNow } from '@/hooks/launcher/useNow';
import { CoverWeather } from './CoverWeather';
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

export function HomeWeatherWidget(_props: WidgetProps) {
  return (
    <CoverCell>
      <CoverWeather />
    </CoverCell>
  );
}
