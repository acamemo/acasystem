import { Button, Caption, Icon, Numeric, Surface, Text } from '@/components/primitives';
import type { StatusChip } from '@/utils/launcher/statusChips';

const ICON_TONE_CLASS = {
  active: 'aca-chip__icon--active',
  danger: 'aca-chip__icon--danger',
  neutral: '',
} as const;

function ChipContent({ chip }: { chip: StatusChip }) {
  return (
    <>
      <Icon
        name={chip.icon}
        size="sm"
        className={['aca-chip__icon', ICON_TONE_CLASS[chip.tone]].filter(Boolean).join(' ')}
      />
      <Text tone={chip.tone === 'danger' ? 'danger' : 'ink'} className="aca-chip__label">
        {chip.label}
      </Text>
      {chip.detail && (
        <Caption tone={chip.tone === 'danger' ? 'danger' : 'muted'} className="aca-chip__detail">
          {chip.detail}
        </Caption>
      )}
      {chip.count !== undefined && <Numeric className="aca-chip__count">{chip.count}</Numeric>}
    </>
  );
}

/** One chip of the status bar: a pressable pill when it opens details, a static one otherwise. */
export function StatusChipView({ chip, onPress }: { chip: StatusChip; onPress?: () => void }) {
  if (onPress) {
    return (
      <Button
        variant="control"
        size="sm"
        onClick={onPress}
        className="aca-chip"
        contentClassName="aca-chip__content"
      >
        <ChipContent chip={chip} />
      </Button>
    );
  }
  return (
    <Surface
      shape="pill"
      size="sm"
      className="aca-chip aca-chip--static"
      contentClassName="aca-chip__content"
    >
      <ChipContent chip={chip} />
    </Surface>
  );
}
