import type { CSSProperties } from 'react';
import { Body, MaterialLayers, materialClass } from '@/components/primitives';
import './pageIndicator.css';

export interface PageIndicatorProps {
  /** Labels of the pager entries, in order (sentence case). */
  labels: readonly string[];
  /** Index of the page shown. */
  index: number;
  onChange: (index: number) => void;
}

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
 * With a single page there is nothing to choose: only the name shows.
 */
export function PageIndicator({ labels, index, onChange }: PageIndicatorProps) {
  const count = Math.max(1, labels.length);
  const current = Math.min(Math.max(0, index), count - 1);
  const label = labels[current];
  const style: IndicatorStyle = { '--aca-steps': String(count), '--aca-index': String(current) };
  const single = count < 2;

  return (
    <div className={single ? 'aca-indicator aca-indicator--single' : 'aca-indicator'}>
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
          className="aca-indicator__label"
          aria-hidden={!single || undefined}
        >
          {label}
        </Body>
      )}
    </div>
  );
}
