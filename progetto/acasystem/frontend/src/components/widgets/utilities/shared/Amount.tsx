import { Caption, Numeric } from '@/components/primitives';

export type AmountSize = 'lg' | 'md' | 'sm';

const sizeClass: Record<AmountSize, string> = {
  lg: 'utility-value',
  md: 'utility-value utility-value--md',
  sm: 'utility-value utility-value--sm',
};

/**
 * A reading with its unit that never wraps apart («8.989,30 €», «74 %», «215 km»):
 * tabular figures from Numeric, the unit in the muted ink at caption size.
 */
export function Amount({
  value,
  unit,
  size = 'lg',
  tight = false,
  className,
}: {
  value: string;
  unit?: string | null;
  size?: AmountSize;
  /** No space before the unit (°C). */
  tight?: boolean;
  className?: string;
}) {
  return (
    <Numeric className={className}>
      <span className={sizeClass[size]}>{value}</span>
      {unit ? (
        <Caption>
          {tight ? '' : ' '}
          {unit}
        </Caption>
      ) : null}
    </Numeric>
  );
}
