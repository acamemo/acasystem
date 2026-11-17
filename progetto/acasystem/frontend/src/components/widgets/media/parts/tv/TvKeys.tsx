import { Button } from '@/components/primitives';
import { useHoldRepeat } from '../../hooks/useHoldRepeat';
import { MediaIcon, type MediaIconName } from '../../icons';
import type { TvKey } from '../../model/tvRemote';
import type { TvDetailsState } from './useTvDetailsState';

export interface LabelledKey {
  key: TvKey;
  label: string;
  icon?: MediaIconName;
}

/**
 * A round remote key (D-pad, rewind, fast forward): the icon, or the label when it has none.
 * With `repeat` (the arrows) holding it repeats the key, and it shows no busy pulse.
 */
export function RoundKey({
  tv,
  keyName,
  label,
  icon,
  className,
  size = 'lg',
  repeat = false,
}: {
  tv: TvDetailsState;
  keyName: TvKey;
  label: string;
  icon?: MediaIconName;
  className?: string;
  size?: 'md' | 'lg';
  repeat?: boolean;
}) {
  const hold = useHoldRepeat(() => tv.sendKey(keyName), { disabled: !repeat });
  return (
    <Button
      variant="control"
      shape="circle"
      size={size}
      className={className}
      aria-label={label}
      loading={repeat ? undefined : tv.actions.busy === `key:${keyName}`}
      {...(repeat ? hold : { onClick: () => tv.sendKey(keyName) })}
    >
      {icon ? <MediaIcon name={icon} size="md" /> : label}
    </Button>
  );
}

/** A labelled remote key of the grids. */
export function TextKey({ tv, item }: { tv: TvDetailsState; item: LabelledKey }) {
  return (
    <Button
      variant="control"
      size="md"
      loading={tv.actions.busy === `key:${item.key}`}
      onClick={() => tv.sendKey(item.key)}
    >
      {item.icon && <MediaIcon name={item.icon} size="sm" />}
      {item.label}
    </Button>
  );
}
