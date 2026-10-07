import { TearCalendar } from '@/components/system/tear-calendar/TearCalendar';
import { useNow } from '@/hooks/launcher/useNow';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import './cover.css';

/** Page 0 of the pager: the tear-off calendar with the clock (UI-008), ticking each second. */
export function CoverPage() {
  const visible = usePageVisible();
  const now = useNow(1000, visible);
  return (
    <div className="aca-cover">
      <h1 className="sr-only">Copertina</h1>
      <TearCalendar now={now} />
    </div>
  );
}
