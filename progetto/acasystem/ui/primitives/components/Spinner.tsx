import { classes } from '../classes';

export interface SpinnerProps {
  /** Omit when the containing presentation already announces its loading state. */
  label?: string;
  className?: string;
}

/** Indeterminate circular progress, decorative unless it owns the loading announcement. */
export function Spinner({ label, className }: SpinnerProps) {
  return (
    <span
      className={classes('aca-spinner', className)}
      role={label ? 'status' : undefined}
      aria-hidden={label ? undefined : true}
    >
      <span className="aca-spinner__ring" aria-hidden="true" />
      {label && <span className="aca-visually-hidden sr-only">{label}</span>}
    </span>
  );
}
