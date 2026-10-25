import { PageIndicator } from '@/components/system/page-indicator/PageIndicator';
import { usePageFlash } from '@/hooks/launcher/usePageFlash';

interface FlashingPageIndicatorProps {
  labels: string[];
  index: number;
  onChange: (index: number) => void;
  /** Key of the page in the centre: a change of it makes the indicator show for a moment. */
  pageKey: string | undefined;
  editMode: boolean;
  overview: boolean;
  /**
   * The «Annulla» pill hangs from the top of the page overview (edit.css): while it shows, the
   * indicator waits above the screen instead of sharing its place.
   */
  yieldToUndo?: boolean;
}

/**
 * The page indicator at the top (ADR-0016, C2), the counterpart of the bars that rise at the
 * bottom: it comes down from the top with a fade whenever edit mode is on, in the page overview
 * too (a press and hold on an empty place, or «Pagine»), and goes back up the same way when it
 * ends. It is a working control then, and a passive cue for about two seconds after a page
 * change in use. The flash state lives here, so that its timer renders only this small
 * component and not the whole launcher screen.
 */
export function FlashingPageIndicator({
  labels,
  index,
  onChange,
  pageKey,
  editMode,
  overview,
  yieldToUndo = false,
}: FlashingPageIndicatorProps) {
  const flash = usePageFlash(pageKey, editMode || overview);
  const active = editMode || overview;
  const yielding = overview && yieldToUndo;
  return (
    <PageIndicator
      labels={labels}
      index={index}
      onChange={onChange}
      hidden={!(active || flash) || yielding}
      passive={!active}
      yielding={yielding}
      overview={overview}
    />
  );
}
