import { useEffect, useState, type CSSProperties } from 'react';
import { Body, MaterialLayers, materialClass } from '@/components/primitives';
import { TWO_FRAMES_MS, canAnimate } from '@/utils/launcher/motion';
import './pageIndicator.css';

export interface PageIndicatorProps {
  /** Labels of the pager entries, in order (sentence case). */
  labels: readonly string[];
  /** Index of the page shown. */
  index: number;
  onChange: (index: number) => void;
  /** Out of its moments (ADR-0016): the indicator waits above the screen, inert (REP-20261007-028). */
  hidden?: boolean;
  /**
   * Shown only as a cue, for a moment after a page change out of edit mode (ADR-0016, C2): it
   * takes no touch and says nothing, the page indicator of the keyboard and of assistive
   * technology is the commands «Pagina precedente» and «Pagina successiva».
   */
  passive?: boolean;
  /**
   * Hidden to give its place to the «Annulla» pill of the pages view (REP-20261023-006, D-M24): it
   * goes in a shorter time than for the end of edit mode, before the pill comes.
   */
  yielding?: boolean;
  /**
   * The pages view is up: the indicator comes three gaps after the start of the scene
   * (pageIndicator.css). A class of its own, so the stylesheet needs no selector on the shell.
   */
  overview?: boolean;
}

/** `--aca-dur-swap-out` (tokens.css): the page name changes by a cross-fade of this length (D-M14). */
export const LABEL_SWAP_MS = 120;

type IndicatorStyle = CSSProperties & Record<'--aca-steps' | '--aca-index', string>;

/** «Pagina 2 di 4: Luci» — the value read by assistive technologies. */
export function pageValueText(index: number, count: number, label: string | undefined) {
  const base = `Pagina ${index + 1} di ${count}`;
  return label ? `${base}: ${label}` : base;
}

/**
 * Page indicator adapted from UI-009: a chrome orange ball that rolls in a recessed groove of
 * the kit, one 44 px stop per page, each marked by a notch that stays visible under the ball.
 * A transparent native range on top gives keyboard, touch, drag and assistive technology
 * support; the current page name sits next to it, out of the flow, so the groove never moves.
 * With a single page there is nothing to choose: only the name shows. When the name changes the old
 * one fades out over the new one, which fades in, for 120 ms (REP-20261023-006, D-M14, F-12): the
 * name never pops, and the indicator, centred, keeps still.
 */
export function PageIndicator({
  labels,
  index,
  onChange,
  hidden = false,
  passive = false,
  yielding = false,
  overview = false,
}: PageIndicatorProps) {
  const count = Math.max(1, labels.length);
  const current = Math.min(Math.max(0, index), count - 1);
  const label = labels[current];
  const style: IndicatorStyle = { '--aca-steps': String(count), '--aca-index': String(current) };
  const single = count < 2;
  const silent = hidden || passive;

  // The name that has just been replaced stays for the cross-fade; it is a derived state of the
  // render, so no frame shows the new name alone. Where nothing animates the name changes at once.
  const [shownLabel, setShownLabel] = useState(label);
  const [swaps, setSwaps] = useState(0);
  const [leaving, setLeaving] = useState<string | null>(null);
  if (shownLabel !== label) {
    setShownLabel(label);
    setSwaps(swaps + 1);
    setLeaving(label && shownLabel && canAnimate() ? shownLabel : null);
  }
  useEffect(() => {
    if (leaving === null) return undefined;
    const timer = setTimeout(() => setLeaving(null), LABEL_SWAP_MS + TWO_FRAMES_MS);
    return () => clearTimeout(timer);
  }, [leaving, swaps]);

  return (
    <div
      className={[
        'aca-indicator',
        single && 'aca-indicator--single',
        hidden && 'aca-indicator--hidden',
        hidden && yielding && 'aca-indicator--yield',
        passive && !hidden && 'aca-indicator--passive',
        overview && 'aca-indicator--overview',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden={silent || undefined}
      inert={silent || undefined}
    >
      {!single && (
        <div
          className={materialClass(
            { behavior: 'well', shape: 'pill', size: 'md' },
            'aca-indicator__track'
          )}
          style={style}
        >
          <MaterialLayers contentClassName="aca-indicator__content">
            {labels.map((item, position) => (
              <span key={`${position}-${item}`} className="aca-indicator__dot" aria-hidden="true" />
            ))}
            <span className="aca-indicator__ball" aria-hidden="true" />
          </MaterialLayers>
          <input
            type="range"
            className="aca-indicator__input"
            min={1}
            max={count}
            step={1}
            value={current + 1}
            aria-label="Pagina"
            aria-valuetext={pageValueText(current, count, label)}
            onChange={(event) => onChange(Number(event.currentTarget.value) - 1)}
          />
        </div>
      )}
      {label && (
        <Body
          as="span"
          size="sm"
          tone="ink"
          // A new element for each name, so that its fade-in starts from the first frame.
          key={canAnimate() ? swaps : undefined}
          className={['aca-indicator__label', leaving !== null && 'aca-indicator__label--entering']
            .filter(Boolean)
            .join(' ')}
          aria-hidden={!single || undefined}
        >
          {label}
        </Body>
      )}
      {label && leaving !== null && (
        <Body
          as="span"
          size="sm"
          tone="ink"
          className="aca-indicator__label aca-indicator__label--leaving"
          aria-hidden="true"
        >
          {leaving}
        </Body>
      )}
    </div>
  );
}
