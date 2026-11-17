import { Button } from './Button';
import { MaterialLayers, materialClass, type MaterialSize } from './Material';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedProps<T extends string> {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the group. */
  label: string;
  size?: MaterialSize;
  disabled?: boolean;
  className?: string;
}

/** Recessed track whose selected item is raised; items expose aria-pressed. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  disabled = false,
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      aria-disabled={disabled || undefined}
      className={materialClass(
        { behavior: 'well', shape: 'pill', size },
        'aca-segmented',
        className
      )}
    >
      <MaterialLayers element="div" contentClassName="aca-segmented__content">
        {options.map((option) => (
          <Button
            key={option.value}
            variant="control"
            size="inherit"
            aria-pressed={option.value === value}
            className="aca-segmented__item"
            disabled={disabled}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </MaterialLayers>
    </div>
  );
}
