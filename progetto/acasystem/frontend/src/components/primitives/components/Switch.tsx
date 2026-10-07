import { Button, type ButtonProps } from './Button';

export type SwitchProps = Omit<ButtonProps, 'variant' | 'children' | 'onChange'> & {
  checked: boolean;
};

export function Switch({ checked, className = '', ...props }: SwitchProps) {
  return (
    <Button
      variant="control"
      role="switch"
      aria-checked={checked}
      className={`aca-switch ${className}`}
      {...props}
    >
      <span className="aca-switch__track" aria-hidden="true">
        <span className="aca-switch__thumb">
          <span className="aca-switch__led" />
        </span>
      </span>
    </Button>
  );
}
