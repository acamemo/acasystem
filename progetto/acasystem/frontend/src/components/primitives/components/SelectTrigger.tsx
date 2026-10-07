import { Button, type ButtonProps } from './Button';
import { Icon } from './Icon';

export type SelectTriggerProps = Omit<ButtonProps, 'variant' | 'children' | 'contentClassName'> & {
  label: string;
  expanded?: boolean;
};

/** Look of a dropdown trigger; the caller owns the list and its behaviour. */
export function SelectTrigger({
  label,
  expanded = false,
  size = 'md',
  ...props
}: SelectTriggerProps) {
  return (
    <Button
      variant="control"
      size={size}
      aria-haspopup="listbox"
      aria-expanded={expanded}
      contentClassName="aca-select__content"
      {...props}
    >
      <span className="aca-m__label">{label}</span>
      <Icon name="chevronDown" className="aca-icon" />
    </Button>
  );
}
