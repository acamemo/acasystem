import type { CSSProperties } from 'react';

interface SkeletonProps {
  variant?: 'list' | 'chart' | 'panel' | 'compact';
  rows?: number;
  className?: string;
  label?: string;
  style?: CSSProperties;
}

/** Decorative shapes reserve content space; a single status announces the fetch. */
export function Skeleton({
  variant = 'list',
  rows = 3,
  className = '',
  label = 'Caricamento dei contenuti…',
  style,
}: SkeletonProps) {
  return (
    <div
      className={`aca-skeleton aca-skeleton--${variant} ${className}`}
      aria-busy="true"
      style={{ ...(variant === 'chart' ? { height: 250 } : {}), ...style }}
    >
      <span role="status" className="sr-only">
        {label}
      </span>
      <div aria-hidden="true" className="aca-skeleton__shapes">
        {variant === 'chart' ? (
          <div className="aca-skeleton__chart" />
        ) : (
          Array.from({ length: rows }, (_, index) => (
            <div className="aca-skeleton__row" key={index}>
              <span className="aca-skeleton__icon" />
              <div className="aca-skeleton__lines">
                <span className="aca-skeleton__line" />
                <span className="aca-skeleton__line aca-skeleton__line--short" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
