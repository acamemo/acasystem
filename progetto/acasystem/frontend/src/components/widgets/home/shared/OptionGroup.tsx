import { useId } from 'react';
import { Button, Heading } from '@/components/primitives';
import { HomeIcon, type HomeIconName } from './HomeIcon';
import { CommandError } from './WidgetShell';

export interface OptionGroupProps {
  label: string;
  options: readonly string[];
  /** Option shown as selected: the requested one while pending, the confirmed one otherwise. */
  value: string | undefined;
  /** Option requested and not yet confirmed: aria-busy and a short pulse. */
  pendingValue?: string;
  labelFor: (option: string) => string;
  iconFor?: (option: string) => HomeIconName;
  onSelect: (option: string) => void;
  disabled?: boolean;
  error?: string | null;
}

/** Choice among HA modes inside a detail sheet: raised pills, selection in aria-pressed. */
export function OptionGroup({
  label,
  options,
  value,
  pendingValue,
  labelFor,
  iconFor,
  onSelect,
  disabled = false,
  error,
}: OptionGroupProps) {
  const headingId = `opzioni-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <section className="home-section" aria-labelledby={headingId}>
      <Heading level={3} size="sm" id={headingId}>
        {label}
      </Heading>
      <div role="group" aria-labelledby={headingId} className="home-options">
        {options.map((option) => (
          <Button
            key={option}
            variant="control"
            size="sm"
            aria-pressed={option === value}
            loading={option === pendingValue}
            disabled={disabled}
            onClick={() => {
              if (option !== value) onSelect(option);
            }}
          >
            {iconFor && <HomeIcon name={iconFor(option)} size="sm" />}
            {labelFor(option)}
          </Button>
        ))}
      </div>
      {error && <CommandError>{error}</CommandError>}
    </section>
  );
}
