import { Button, type ButtonProps } from './Button';

export type ChoiceProps = Omit<ButtonProps, 'variant'> & { selected: boolean };

export function Choice({ selected, className = '', ...props }: ChoiceProps) {
  return (
    <Button
      variant="control"
      aria-pressed={selected}
      className={`aca-choice ${className}`}
      {...props}
    />
  );
}
