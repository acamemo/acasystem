import { CoverCalendar, CoverClock } from '@/components/system/cover/CoverCards';
import { CoverWeather } from '@/components/widgets/home/cover/CoverWeather';
import { useNow } from '@/hooks/launcher/useNow';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import './cover.css';

/**
 * Page 0 of the pager: one row with two cards, the analog clock with the digital time on the
 * left and the calendar on the right (REP-20261007-010), ticking each second. The tear-off
 * calendar of the Metallo kit (TearCalendar) is kept but no longer shown here.
 */
export function CoverPage() {
  const visible = usePageVisible();
  const now = useNow(1000, visible);
  return (
    <div className="aca-cover">
      <h1 className="sr-only">Copertina</h1>
      <div className="aca-cover-row">
        <CoverClock now={now} />
        <CoverCalendar now={now} />
        <CoverWeather />
      </div>
    </div>
  );
}
